import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAlert } from '../context/AlertContext'
import { IconBack, IconSave, IconCheck, IconReject } from '../components/RibbonButton'
import { Breadcrumb, Toolbar, ToolbarButton, RecordHeader, StatusPill } from '../components/DetailChrome'
import TimesheetGrid from '../components/TimesheetGrid'
import { newGridRow, buildEntriesFromRows, rowsFromEntries } from '../utils/timesheetGrid'
import type { GridRow } from '../utils/timesheetGrid'

interface WorkItem { id: string; title: string; projectName: string }
interface User { id: string; teamIds?: string[] }
interface Team { id: string; managerName?: string }

interface TimesheetEntry { id: string; workItemId: string; workItemTitle: string; date: string; hours: number; description?: string }
interface Timesheet {
  id: string; userId: string; userName: string; weekStartDate: string; status: string; isActive: boolean
  approverId?: string; approverName?: string; notes?: string; comments?: string; totalHours: number; createdAt: string
  entries: TimesheetEntry[]
}

const statusTone: Record<string, 'gray' | 'amber' | 'green' | 'red'> = { Draft: 'gray', Submitted: 'amber', Approved: 'green', Rejected: 'red' }

function apiErrorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback
}

export default function TimesheetDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isManager = user?.roles?.some((r) => r === 'Manager' || r === 'Admin') ?? false
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { showAlert } = useAlert()

  const [timesheet, setTimesheet] = useState<Timesheet | null>(null)
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [approvalManager, setApprovalManager] = useState<string | null>(null)
  const [weekStartDate, setWeekStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<GridRow[]>([newGridRow()])
  const [isDirty, setIsDirty] = useState(false)
  const [reviewComments, setReviewComments] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)

  const loadTimesheet = () => api.get(`/timesheets/${id}`).then((r) => {
    const t: Timesheet = r.data
    setTimesheet(t)
    setWeekStartDate(t.weekStartDate.slice(0, 10))
    setNotes(t.notes ?? '')
    setRows(rowsFromEntries(t.weekStartDate.slice(0, 10), t.entries))
    setIsDirty(false)
  })

  useEffect(() => { loadTimesheet() }, [id])
  useEffect(() => {
    api.get('/workitems', { params: { isActive: true, pageSize: 200 } }).then((r) => setWorkItems(r.data.items))
  }, [])

  useEffect(() => {
    if (!timesheet) return
    Promise.all([api.get('/users', { params: { pageSize: 1000 } }), api.get('/teams')]).then(([usersRes, teamsRes]) => {
      const owner = (usersRes.data.items as User[]).find((u) => u.id === timesheet.userId)
      const managers = (teamsRes.data as Team[])
        .filter((t) => owner?.teamIds?.includes(t.id))
        .map((t) => t.managerName)
        .filter((name): name is string => !!name)
      setApprovalManager(managers.length > 0 ? Array.from(new Set(managers)).join(', ') : null)
    })
  }, [timesheet?.userId])

  useEffect(() => { setDirty(isDirty) }, [isDirty, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])

  const isOwner = timesheet?.userId === user?.userId
  const isDraft = timesheet?.status === 'Draft'
  const canEdit = isDraft && isOwner
  const canReview = timesheet?.status === 'Submitted' && isManager

  const workItemOptions = useMemo(() => {
    const map = new Map(workItems.map((w) => [w.id, w]))
    timesheet?.entries.forEach((e) => {
      if (!map.has(e.workItemId)) map.set(e.workItemId, { id: e.workItemId, title: e.workItemTitle, projectName: '' })
    })
    return Array.from(map.values())
  }, [workItems, timesheet])

  const markDirty = () => setIsDirty(true)
  const setHour = (rowKey: string, dayIdx: number, value: string) => {
    setRows((rs) => rs.map((r) => r.key === rowKey ? { ...r, hours: r.hours.map((h, i) => i === dayIdx ? value : h) } : r))
    markDirty()
  }
  const setRowWorkItem = (rowKey: string, workItemId: string) => {
    setRows((rs) => rs.map((r) => r.key === rowKey ? { ...r, workItemId } : r))
    markDirty()
  }
  const removeRow = (rowKey: string) => { setRows((rs) => rs.length > 1 ? rs.filter((r) => r.key !== rowKey) : rs); markDirty() }
  const addRow = () => { setRows((rs) => [...rs, newGridRow()]); markDirty() }

  const save = async () => {
    if (!timesheet) return
    const entries = buildEntriesFromRows(rows, weekStartDate)
    try {
      await api.put(`/timesheets/${id}`, { weekStartDate: `${weekStartDate}T00:00:00Z`, notes, isActive: timesheet.isActive, entries })
      setIsDirty(false)
      await loadTimesheet()
    } catch (err) {
      showAlert('Unable to Save Timesheet', apiErrorMessage(err, 'Failed to save timesheet.'))
    }
  }

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  const submitTimesheet = async () => {
    if (!timesheet) return
    const entries = buildEntriesFromRows(rows, weekStartDate)
    try {
      await api.put(`/timesheets/${id}`, { weekStartDate: `${weekStartDate}T00:00:00Z`, notes, isActive: timesheet.isActive, entries })
      await api.post(`/timesheets/${id}/submit`)
      setIsDirty(false)
      await loadTimesheet()
    } catch (err) {
      showAlert('Unable to Submit Timesheet', apiErrorMessage(err, 'Failed to submit timesheet.'))
    }
  }

  const review = async (status: 'Approved' | 'Rejected') => {
    setReviewError(null)
    if (status === 'Rejected' && !reviewComments.trim()) {
      setReviewError('Comments are required when rejecting a timesheet.')
      return
    }
    try {
      await api.post(`/timesheets/${id}/review`, { status: status === 'Approved' ? 2 : 3, comments: reviewComments || null })
      setReviewComments('')
      await loadTimesheet()
    } catch (err) {
      setReviewError(apiErrorMessage(err, 'Failed to submit review.'))
    }
  }

  if (!timesheet) return null

  const saveDisabled = !isDirty || !weekStartDate

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Timesheets', to: '/resource/timesheets' }, { label: `${timesheet.userName}'s Timesheet` }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate('/resource/timesheets')} title="Back to timesheets" />
          {canReview && (
            <>
              <ToolbarButton icon={<IconCheck />} label="Approve" onClick={() => review('Approved')} />
              <ToolbarButton icon={<IconReject />} label="Reject" onClick={() => review('Rejected')} title="Requires comments" />
            </>
          )}
          {canEdit && (
            <>
              <ToolbarButton icon={<IconSave />} label="Save" onClick={save} disabled={saveDisabled} />
              <ToolbarButton icon={<IconSave />} label="Submit" onClick={submitTimesheet} variant="primary" />
            </>
          )}
        </Toolbar>
      </div>

      <div className="px-6 pb-3">
        <RecordHeader
          icon={<span className="text-sm font-semibold">{timesheet.userName.slice(0, 2).toUpperCase()}</span>}
          iconBg="bg-sky-600"
          title={`${timesheet.userName}'s Timesheet`}
          subtitle={`Week of ${new Date(timesheet.weekStartDate).toLocaleDateString()} · ${timesheet.totalHours}h total`}
          badge={<StatusPill label={timesheet.status} tone={statusTone[timesheet.status] ?? 'gray'} />}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 bg-white rounded-xl border border-gray-200 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Start Date *</label>
              {canEdit ? (
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={weekStartDate}
                  onChange={(e) => { setWeekStartDate(e.target.value); markDirty() }}
                />
              ) : (
                <div className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                  {new Date(timesheet.weekStartDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              {canEdit ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); markDirty() }}
                />
              ) : (
                <div className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                  {notes || '—'}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Manager</label>
              <div className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" title="This is who reviews and approves/rejects the timesheet">
                {approvalManager ?? 'No manager assigned'}
              </div>
            </div>
          </div>

          <TimesheetGrid
            weekStartDate={weekStartDate}
            rows={rows}
            workItems={workItemOptions}
            readOnly={!canEdit}
            onSetWorkItem={setRowWorkItem}
            onSetHour={setHour}
            onRemoveRow={removeRow}
            onAddRow={addRow}
          />

          {(timesheet.status === 'Approved' || timesheet.status === 'Rejected') && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Review</div>
              <p className="text-sm text-gray-700">
                {timesheet.status} by {timesheet.approverName ?? 'a manager'}
              </p>
              {timesheet.comments && <p className="text-sm text-gray-500 mt-1">{timesheet.comments}</p>}
            </div>
          )}

          {canReview && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Review Comments</div>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Optional for approval, required if rejecting..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
              />
              {reviewError && <p className="text-sm text-red-600 mt-1">{reviewError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

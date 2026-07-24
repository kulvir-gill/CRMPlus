import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAlert } from '../context/AlertContext'
import { IconBack, IconSave } from '../components/RibbonButton'
import { Breadcrumb, Toolbar, ToolbarButton } from '../components/DetailChrome'
import TimesheetGrid from '../components/TimesheetGrid'
import { currentWeekStart, newGridRow, buildEntriesFromRows, rowTotal, rowsFromEntries, weekDays, toISODate } from '../utils/timesheetGrid'
import type { GridRow } from '../utils/timesheetGrid'

interface WorkItem { id: string; title: string; projectName: string }
interface ScheduledWorkItem { id: string; dueDate?: string; estimatedHours: number }
interface User { id: string; teamIds?: string[] }
interface Team { id: string; managerName?: string }

export default function TimesheetNew() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { showAlert } = useAlert()

  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [approvalManager, setApprovalManager] = useState<string | null>(null)
  const [weekStartDate, setWeekStartDate] = useState(currentWeekStart())
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<GridRow[]>([newGridRow()])
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    api.get('/workitems', { params: { isActive: true, pageSize: 200 } }).then((r) => setWorkItems(r.data.items))
  }, [])

  useEffect(() => {
    if (!user?.userId || !weekStartDate) return
    const days = weekDays(weekStartDate)
    if (days.length === 0) return
    const dueFrom = toISODate(days[0])
    const dueToExclusive = new Date(days[6])
    dueToExclusive.setDate(dueToExclusive.getDate() + 1)
    api.get('/workitems', {
      params: { assignedUserId: user.userId, dueFrom, dueTo: toISODate(dueToExclusive), isActive: true, pageSize: 200 },
    }).then((r) => {
      const scheduled = (r.data.items as ScheduledWorkItem[])
        .filter((w) => w.dueDate)
        .map((w) => ({ workItemId: w.id, date: w.dueDate as string, hours: w.estimatedHours }))
      if (scheduled.length > 0) {
        setRows(rowsFromEntries(weekStartDate, scheduled))
        markDirty()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate, user?.userId])

  useEffect(() => {
    Promise.all([api.get('/users', { params: { pageSize: 1000 } }), api.get('/teams')]).then(([usersRes, teamsRes]) => {
      const me = (usersRes.data.items as User[]).find((u) => u.id === user?.userId)
      const managers = (teamsRes.data as Team[])
        .filter((t) => me?.teamIds?.includes(t.id))
        .map((t) => t.managerName)
        .filter((name): name is string => !!name)
      setApprovalManager(managers.length > 0 ? Array.from(new Set(managers)).join(', ') : null)
    })
  }, [user?.userId])

  useEffect(() => { setDirty(isDirty) }, [isDirty, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])

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
  const grandTotal = rows.reduce((sum, r) => sum + rowTotal(r), 0)

  const saveTimesheet = async (thenSubmit: boolean) => {
    const entries = buildEntriesFromRows(rows, weekStartDate)
    try {
      const res = await api.post('/timesheets', { weekStartDate: `${weekStartDate}T00:00:00Z`, notes, isActive: true, entries })
      if (thenSubmit) await api.post(`/timesheets/${res.data.id}/submit`)
      setIsDirty(false)
      navigate('/resource/timesheets')
    } catch (err) {
      showAlert('Unable to Save Timesheet', axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save timesheet.')
    }
  }

  useEffect(() => {
    registerSave(() => saveTimesheet(false))
    return () => registerSave(null)
  })

  const saveDisabled = !weekStartDate || grandTotal === 0

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Timesheets', to: '/resource/timesheets' }, { label: 'New Timesheet' }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate('/resource/timesheets')} title="Back to timesheets" />
          <ToolbarButton
            icon={<IconSave />}
            label="Save as Draft"
            onClick={() => saveTimesheet(false)}
            disabled={saveDisabled}
          />
          <ToolbarButton
            icon={<IconSave />}
            label="Save & Submit"
            onClick={() => saveTimesheet(true)}
            disabled={saveDisabled}
            variant="primary"
          />
        </Toolbar>
      </div>

      <div className="px-6 pb-3">
        <h2 className="text-sm font-semibold text-gray-900">New Timesheet</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 bg-white rounded-xl border border-gray-200 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week Start Date *</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={weekStartDate}
                onChange={(e) => { setWeekStartDate(e.target.value); markDirty() }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); markDirty() }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Manager</label>
              <div className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" title="This is who will review and approve/reject the timesheet once submitted">
                {approvalManager ?? 'No manager assigned'}
              </div>
            </div>
          </div>

          <TimesheetGrid
            weekStartDate={weekStartDate}
            rows={rows}
            workItems={workItems}
            onSetWorkItem={setRowWorkItem}
            onSetHour={setHour}
            onRemoveRow={removeRow}
            onAddRow={addRow}
          />
        </div>
      </div>
    </div>
  )
}

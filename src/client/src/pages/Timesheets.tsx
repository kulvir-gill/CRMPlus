import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, getAccessLevel } from '../context/AuthContext'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { IconChevron } from '../components/RibbonButton'

interface Timesheet { id: string; userName: string; weekStartDate: string; status: string; isActive: boolean; totalHours: number; notes?: string; comments?: string }

const statusColor: Record<string, string> = { Draft: 'bg-gray-100 text-gray-700', Submitted: 'bg-yellow-100 text-yellow-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700' }

type TimesheetView = 'all' | 'pending' | 'approved' | 'teamPending'

const timesheetViewLabels: Record<TimesheetView, string> = {
  all: 'My All Timesheets',
  pending: 'My Pending Timesheets',
  approved: 'My Approved Timesheets',
  teamPending: 'Team Pending Review',
}

const timesheetViewParams: Record<TimesheetView, Record<string, unknown>> = {
  all: { myTimesheets: true, pendingApproval: false },
  pending: { myTimesheets: true, pendingApproval: true },
  approved: { myTimesheets: true, status: 'Approved' },
  teamPending: { myTimesheets: false, pendingApproval: true },
}

const columns: EntityColumn<Timesheet>[] = [
  { field: 'user', label: 'Employee', sortable: false, render: (t) => <span className="text-gray-900">{t.userName}</span> },
  { field: 'weekstartdate', label: 'Week', render: (t) => <span className="text-gray-600">{new Date(t.weekStartDate).toLocaleDateString()}</span> },
  { field: 'totalhours', label: 'Total Hours', render: (t) => <span className="text-gray-600">{t.totalHours}h</span> },
  { field: 'status', label: 'Status', render: (t) => <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${statusColor[t.status] ?? ''}`}>{t.status}</span> },
  { field: 'notes', label: 'Notes / Comments', sortable: false, render: (t) => <span className="text-gray-500">{t.notes || t.comments || '—'}</span> },
]

const exportColumns = [
  { key: 'userName' as const, label: 'Employee' },
  { key: 'weekStartDate' as const, label: 'Week' },
  { key: 'totalHours' as const, label: 'Total Hours' },
  { key: 'status' as const, label: 'Status' },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Timesheets() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = user?.roles?.some((r) => r === 'Manager' || r === 'Admin') ?? false
  const canCreate = getAccessLevel(user, 'resource') !== 'ReadOnly'
  const [timesheetView, setTimesheetView] = useState<TimesheetView>('all')
  const state = useEntityListView<Timesheet>({
    endpoint: '/timesheets', defaultSortField: 'weekstartdate', defaultSortDir: 'desc',
    extraParams: timesheetViewParams[timesheetView],
  })
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const viewMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!viewMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setViewMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [viewMenuOpen])

  const availableViews: TimesheetView[] = isManager ? ['all', 'pending', 'approved', 'teamPending'] : ['all', 'pending', 'approved']

  const viewSelector = (
    <div className="relative shrink-0" ref={viewMenuRef}>
      <button
        onClick={() => setViewMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-gray-700"
      >
        {timesheetViewLabels[timesheetView]}
        <IconChevron open={viewMenuOpen} />
      </button>
      {viewMenuOpen && (
        <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-56 py-1">
          {availableViews.map((v) => (
            <button
              key={v}
              onClick={() => { setTimesheetView(v); setViewMenuOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${timesheetView === v ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
            >
              {timesheetViewLabels[v]}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <EntityListView
      entityLabel="Timesheet"
      entityLabelPlural="Timesheets"
      state={state}
      columns={columns}
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/resource/timesheets/new') : undefined}
      onRowClick={(t) => navigate(`/resource/timesheets/${t.id}`)}
      viewSelectorOverride={viewSelector}
    />
  )
}

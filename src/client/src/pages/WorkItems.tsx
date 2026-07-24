import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../api/client'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import WorkItemFormModal, { emptyWorkItemForm, combineDueDateTime, splitDueDateTime } from '../components/WorkItemFormModal'
import type { WorkItemFormValues } from '../components/WorkItemFormModal'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface WorkItem {
  id: string; title: string; status: string; priority: string; isActive: boolean
  projectId: string; projectName: string; assignedUserId?: string; assignedUserName?: string
  assignedTeamId?: string; assignedTeamName?: string
  dueDate?: string; estimatedHours: number; actualHours: number
}
interface Project { id: string; name: string }
interface User { id: string; firstName: string; lastName: string }
interface Team { id: string; name: string }

const priorityColor: Record<string, string> = { Critical: 'bg-red-100 text-red-700', High: 'bg-orange-100 text-orange-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' }
const statusColor: Record<string, string> = { Backlog: 'bg-gray-100 text-gray-700', InProgress: 'bg-blue-100 text-blue-700', InReview: 'bg-purple-100 text-purple-700', Done: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700' }

const columns: EntityColumn<WorkItem>[] = [
  { field: 'title', label: 'Title', render: (w) => <span className="text-gray-900">{w.title}</span> },
  { field: 'project', label: 'Project', render: (w) => <span className="text-gray-600">{w.projectName}</span> },
  { field: 'assignee', label: 'Assignee', render: (w) => <span className="text-gray-600">{w.assignedUserName ?? w.assignedTeamName ?? '—'}</span> },
  { field: 'status', label: 'Status', render: (w) => <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${statusColor[w.status] ?? ''}`}>{w.status}</span> },
  { field: 'priority', label: 'Priority', render: (w) => <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${priorityColor[w.priority] ?? ''}`}>{w.priority}</span> },
  { field: 'duedate', label: 'Due', render: (w) => <span className="text-gray-600">{w.dueDate ? new Date(w.dueDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span> },
  { field: 'actualhours', label: 'Hours', render: (w) => <span className="text-gray-600">{w.actualHours}/{w.estimatedHours}h</span> },
]

const exportColumns = [
  { key: 'title' as const, label: 'Title' },
  { key: 'projectName' as const, label: 'Project' },
  { key: 'assignedUserName' as const, label: 'Assignee', getValue: (w: WorkItem) => w.assignedUserName ?? w.assignedTeamName },
  { key: 'status' as const, label: 'Status' },
  { key: 'priority' as const, label: 'Priority' },
  { key: 'dueDate' as const, label: 'Due' },
  { key: 'isActive' as const, label: 'Active' },
]

export default function WorkItems() {
  const { user: me } = useAuth()
  const resourceAccess = getAccessLevel(me, 'resource')
  const [myOnly, setMyOnly] = useState(false)
  const state = useEntityListView<WorkItem>({ endpoint: '/workitems', defaultSortField: 'title', extraParams: { myItems: myOnly } })
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WorkItem | null>(null)
  const [form, setForm] = useState<WorkItemFormValues>(emptyWorkItemForm)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/projects', { params: { pageSize: 1000 } }).then((r) => setProjects(r.data.items))
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  const openCreate = () => { setEditing(null); setForm(emptyWorkItemForm); setSaveError(null); setShowModal(true) }
  const openEdit = (w: WorkItem) => {
    setEditing(w)
    setSaveError(null)
    setForm({
      title: w.title, description: '', projectId: w.projectId, assignedUserId: w.assignedUserId ?? '', assignedTeamId: w.assignedTeamId ?? '',
      status: w.status, priority: w.priority, isActive: w.isActive,
      ...splitDueDateTime(w.dueDate), estimatedHours: w.estimatedHours.toString(),
    })
    setShowModal(true)
  }

  const save = async () => {
    const payload = { ...form, projectId: form.projectId, assignedUserId: form.assignedUserId || null, assignedTeamId: form.assignedTeamId || null, estimatedHours: parseFloat(form.estimatedHours), dueDate: combineDueDateTime(form.dueDate, form.dueTime) }
    try {
      if (editing) await api.put(`/workitems/${editing.id}`, payload)
      else await api.post('/workitems', payload)
      setShowModal(false)
      state.load()
    } catch (err) {
      setSaveError(axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save work item.')
    }
  }

  const set = (k: keyof WorkItemFormValues, v: string | boolean) => { setForm((f) => ({ ...f, [k]: v })); setSaveError(null) }

  return (
    <>
      <EntityListView
        entityLabel="Work Item"
        entityLabelPlural="Work Items"
        state={state}
        columns={columns}
        exportColumns={exportColumns}
        onNew={resourceAccess !== 'ReadOnly' ? openCreate : undefined}
        onRowClick={openEdit}
        extraToolbar={
          <label className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0">
            <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
            My items only
          </label>
        }
      />

      {showModal && (
        <WorkItemFormModal
          title={editing ? 'Edit Work Item' : 'New Work Item'}
          form={form}
          onChange={set}
          projects={projects}
          users={users}
          teams={teams}
          onSave={save}
          onClose={() => setShowModal(false)}
          error={saveError}
        />
      )}
    </>
  )
}

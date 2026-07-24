import { useEffect, useState } from 'react'
import api from '../api/client'
import Modal from '../components/Modal'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import OwnerPicker from '../components/OwnerPicker'

interface Project { id: string; name: string; description?: string; status: string; isActive: boolean; startDate?: string; endDate?: string; workItemCount: number; ownerId?: string; ownerName?: string; ownerTeamId?: string; ownerTeamName?: string }
interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }

const empty = { name: '', description: '', status: 'Planning', isActive: true, startDate: '', endDate: '', ownerId: null as string | null, ownerTeamId: null as string | null }
const statuses = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled']
const statusColor: Record<string, string> = {
  Active: 'bg-green-100 text-green-700', Planning: 'bg-blue-100 text-blue-700',
  OnHold: 'bg-yellow-100 text-yellow-700', Completed: 'bg-gray-100 text-gray-700', Cancelled: 'bg-red-100 text-red-700',
}

const columns: EntityColumn<Project>[] = [
  { field: 'name', label: 'Name', render: (p) => <span className="text-gray-900">{p.name}</span> },
  { field: 'status', label: 'Status', render: (p) => <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${statusColor[p.status] ?? ''}`}>{p.status}</span> },
  { field: 'startdate', label: 'Start Date', render: (p) => <span className="text-gray-600">{p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}</span> },
  { field: 'enddate', label: 'End Date', render: (p) => <span className="text-gray-600">{p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}</span> },
  { field: 'workitemcount', label: 'Work Items', render: (p) => <span className="text-gray-600">{p.workItemCount}</span> },
  { field: 'owner', label: 'Owner', render: (p) => <span className="text-gray-600">{p.ownerName ?? p.ownerTeamName ?? '—'}</span> },
]

const exportColumns = [
  { key: 'name' as const, label: 'Name' },
  { key: 'status' as const, label: 'Status' },
  { key: 'startDate' as const, label: 'Start Date' },
  { key: 'endDate' as const, label: 'End Date' },
  { key: 'workItemCount' as const, label: 'Work Items' },
  { key: 'ownerName' as const, label: 'Owner' },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Projects() {
  const { user: me } = useAuth()
  const { showAlert } = useAlert()
  const resourceAccess = getAccessLevel(me, 'resource')
  const state = useEntityListView<Project>({ endpoint: '/projects', defaultSortField: 'name' })
  const [users, setUsers] = useState<UserOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState(empty)

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  const openCreate = () => { setEditing(null); setForm({ ...empty, ownerId: me?.userId ?? null }); setShowModal(true) }
  const openEdit = (p: Project) => {
    if (resourceAccess === 'UserLevel' && p.ownerId !== me?.userId) {
      showAlert('Unable to Edit Project', 'You can only edit Resource records you own.')
      return
    }
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', status: p.status, isActive: p.isActive, startDate: p.startDate?.slice(0, 10) ?? '', endDate: p.endDate?.slice(0, 10) ?? '', ownerId: p.ownerId ?? null, ownerTeamId: p.ownerTeamId ?? null })
    setShowModal(true)
  }

  const save = async () => {
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null }
    if (editing) await api.put(`/projects/${editing.id}`, payload)
    else await api.post('/projects', payload)
    setShowModal(false)
    state.load()
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))
  const setOwner = (ownerId: string | null, ownerTeamId: string | null) => setForm((f) => ({ ...f, ownerId, ownerTeamId }))

  return (
    <>
      <EntityListView
        entityLabel="Project"
        entityLabelPlural="Projects"
        state={state}
        columns={columns}
        exportColumns={exportColumns}
        onNew={resourceAccess !== 'ReadOnly' ? openCreate : undefined}
        onRowClick={resourceAccess === 'ReadOnly' ? undefined : openEdit}
      />

      {showModal && (
        <Modal title={editing ? 'Edit Project' : 'New Project'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['startDate', 'Start Date'], ['endDate', 'End Date']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form[k as keyof typeof form] as string} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
            {resourceAccess === 'Full' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  className="w-full text-left border rounded-lg px-3 py-2 text-sm text-gray-900 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  title="Select Project Owner"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface WorkItem { id: number; title: string; status: string; priority: string; projectName: string; assignedUserName?: string; dueDate?: string; estimatedHours: number; actualHours: number }
interface Project { id: number; name: string }
interface User { id: number; firstName: string; lastName: string }

const empty = { title: '', description: '', projectId: '', assignedUserId: '', status: 'Backlog', priority: 'Medium', dueDate: '', estimatedHours: '0' }
const statuses = ['Backlog', 'InProgress', 'InReview', 'Done', 'Cancelled']
const priorities = ['Low', 'Medium', 'High', 'Critical']
const priorityColor: Record<string, string> = { Critical: 'bg-red-100 text-red-700', High: 'bg-orange-100 text-orange-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' }
const statusColor: Record<string, string> = { Backlog: 'bg-gray-100 text-gray-700', InProgress: 'bg-blue-100 text-blue-700', InReview: 'bg-purple-100 text-purple-700', Done: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700' }

export default function WorkItems() {
  const [items, setItems] = useState<WorkItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [myOnly, setMyOnly] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WorkItem | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/workitems', { params: { myItems: myOnly } }).then((r) => setItems(r.data))
  useEffect(() => { load(); api.get('/projects').then((r) => setProjects(r.data)); api.get('/users').then((r) => setUsers(r.data)) }, [myOnly])

  const openEdit = (w: WorkItem) => {
    setEditing(w)
    setForm({ title: w.title, description: '', projectId: '', assignedUserId: '', status: w.status, priority: w.priority, dueDate: w.dueDate?.slice(0, 10) ?? '', estimatedHours: w.estimatedHours.toString() })
    setShowModal(true)
  }

  const save = async () => {
    const payload = { ...form, projectId: parseInt(form.projectId), assignedUserId: form.assignedUserId ? parseInt(form.assignedUserId) : null, estimatedHours: parseFloat(form.estimatedHours), dueDate: form.dueDate || null }
    if (editing) await api.put(`/workitems/${editing.id}`, payload)
    else await api.post('/workitems', payload)
    setShowModal(false); load()
  }

  const remove = async (id: number) => { if (!confirm('Delete?')) return; await api.delete(`/workitems/${id}`); load() }
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader title="Work Items" subtitle={`${items.length} items`}
        action={<button onClick={() => { setEditing(null); setForm(empty); setShowModal(true) }} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Work Item</button>} />
      <div className="p-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
          <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
          Show only my items
        </label>
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>{['Title', 'Project', 'Assignee', 'Status', 'Priority', 'Due', 'Hours', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {items.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{w.title}</td>
                  <td className="px-4 py-3 text-gray-600">{w.projectName}</td>
                  <td className="px-4 py-3 text-gray-600">{w.assignedUserName ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[w.status] ?? ''}`}>{w.status}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[w.priority] ?? ''}`}>{w.priority}</span></td>
                  <td className="px-4 py-3 text-gray-600">{w.dueDate ? new Date(w.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{w.actualHours}/{w.estimatedHours}h</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(w)} className="text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(w.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No work items</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Work Item' : 'New Work Item'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
                  <option value="">— Select —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assignedUserId} onChange={(e) => set('assignedUserId', e.target.value)}>
                  <option value="">— None —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {priorities.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input type="number" min="0" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.estimatedHours} onChange={(e) => set('estimatedHours', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

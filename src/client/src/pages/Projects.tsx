import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Project { id: number; name: string; description?: string; status: string; startDate?: string; endDate?: string; workItemCount: number }

const empty = { name: '', description: '', status: 'Planning', startDate: '', endDate: '' }
const statuses = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled']
const statusColor: Record<string, string> = {
  Active: 'bg-green-100 text-green-700', Planning: 'bg-blue-100 text-blue-700',
  OnHold: 'bg-yellow-100 text-yellow-700', Completed: 'bg-gray-100 text-gray-700', Cancelled: 'bg-red-100 text-red-700',
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/projects').then((r) => setProjects(r.data))
  useEffect(() => { load() }, [])

  const openEdit = (p: Project) => {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', status: p.status, startDate: p.startDate?.slice(0, 10) ?? '', endDate: p.endDate?.slice(0, 10) ?? '' })
    setShowModal(true)
  }

  const save = async () => {
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null }
    if (editing) await api.put(`/projects/${editing.id}`, payload)
    else await api.post('/projects', payload)
    setShowModal(false); load()
  }

  const remove = async (id: number) => { if (!confirm('Delete?')) return; await api.delete(`/projects/${id}`); load() }
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader title="Projects" subtitle={`${projects.length} projects`}
        action={<button onClick={() => { setEditing(null); setForm(empty); setShowModal(true) }} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Project</button>} />
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-gray-900">{p.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColor[p.status] ?? ''}`}>{p.status}</span>
            </div>
            {p.description && <p className="text-sm text-gray-500 mb-3">{p.description}</p>}
            <p className="text-xs text-gray-400">{p.workItemCount} work items</p>
            <div className="flex gap-3 mt-4 text-sm">
              <button onClick={() => openEdit(p)} className="text-indigo-600 hover:underline">Edit</button>
              <button onClick={() => remove(p.id)} className="text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {projects.length === 0 && <p className="text-gray-500">No projects yet</p>}
      </div>

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
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form[k as keyof typeof form]} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
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

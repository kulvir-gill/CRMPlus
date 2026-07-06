import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Team { id: number; name: string; managerName?: string; memberCount: number }
interface User { id: number; firstName: string; lastName: string }

const empty = { name: '', managerId: '' }

export default function Teams() {
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'Admin'
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/teams').then((r) => setTeams(r.data))
  useEffect(() => { load(); api.get('/users').then((r) => setUsers(r.data)) }, [])

  const openEdit = (t: Team) => { setEditing(t); setForm({ name: t.name, managerId: '' }); setShowModal(true) }

  const save = async () => {
    const payload = { name: form.name, managerId: form.managerId ? parseInt(form.managerId) : null }
    if (editing) await api.put(`/teams/${editing.id}`, payload)
    else await api.post('/teams', payload)
    setShowModal(false); load()
  }

  const remove = async (id: number) => { if (!confirm('Delete?')) return; await api.delete(`/teams/${id}`); load() }

  return (
    <div>
      <PageHeader title="Teams" subtitle={`${teams.length} teams`}
        action={isAdmin ? <button onClick={() => { setEditing(null); setForm(empty); setShowModal(true) }} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Team</button> : undefined} />
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border p-5">
            <h4 className="font-semibold text-gray-900 mb-1">{t.name}</h4>
            <p className="text-sm text-gray-500">Manager: {t.managerName ?? '—'}</p>
            <p className="text-sm text-gray-500">{t.memberCount} members</p>
            {isAdmin && (
              <div className="flex gap-3 mt-4 text-sm">
                <button onClick={() => openEdit(t)} className="text-indigo-600 hover:underline">Edit</button>
                <button onClick={() => remove(t.id)} className="text-red-500 hover:underline">Delete</button>
              </div>
            )}
          </div>
        ))}
        {teams.length === 0 && <p className="text-gray-500">No teams yet</p>}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Team' : 'New Team'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.managerId} onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}>
                <option value="">— None —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
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

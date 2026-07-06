import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface User { id: number; firstName: string; lastName: string; email: string; role: string; teamName?: string; isActive: boolean }
interface Team { id: number; name: string }

export default function Users() {
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'Admin'
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', role: 'Employee', teamId: '', isActive: true })

  const load = () => api.get('/users').then((r) => setUsers(r.data))
  useEffect(() => { load(); api.get('/teams').then((r) => setTeams(r.data)) }, [])

  const openEdit = (u: User) => {
    setEditing(u)
    setForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, teamId: '', isActive: u.isActive })
  }

  const save = async () => {
    await api.put(`/users/${editing!.id}`, { ...form, teamId: form.teamId ? parseInt(form.teamId) : null })
    setEditing(null); load()
  }

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} users`} />
      <div className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>{['Name', 'Email', 'Role', 'Team', 'Status', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{u.role}</span></td>
                  <td className="px-4 py-3 text-gray-600">{u.teamName ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && <button onClick={() => openEdit(u)} className="text-indigo-600 hover:underline">Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title="Edit User" onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form[k as keyof typeof form] as string} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {['Employee', 'Manager', 'Admin'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.teamId} onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}>
                <option value="">— None —</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { modules as allModules } from '../config/modules'

interface SecurityRole { id: string; name: string; description?: string; modules: string[]; accessLevel: string; createdAt: string }

const assignableModules = allModules.filter((m) => m.key !== 'setting')
const accessLevels = ['Full', 'ReadOnly', 'UserLevel']

const empty = { name: '', description: '', modules: [] as string[], accessLevel: 'Full' }

function apiErrorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback
}

export default function SecurityRoles() {
  const { user: me } = useAuth()
  const isAdmin = me?.roles?.includes('Admin') ?? false
  const { showAlert } = useAlert()
  const [roles, setRoles] = useState<SecurityRole[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SecurityRole | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/securityroles').then((r) => setRoles(r.data))
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (r: SecurityRole) => { setEditing(r); setForm({ name: r.name, description: r.description ?? '', modules: r.modules ?? [], accessLevel: r.accessLevel ?? 'Full' }); setShowModal(true) }

  const toggleModule = (key: string) => {
    setForm((f) => ({ ...f, modules: f.modules.includes(key) ? f.modules.filter((m) => m !== key) : [...f.modules, key] }))
  }

  const save = async () => {
    try {
      const payload = { name: form.name, description: form.description || null, modules: form.modules, accessLevel: form.accessLevel }
      if (editing) await api.put(`/securityroles/${editing.id}`, payload)
      else await api.post('/securityroles', payload)
      setShowModal(false)
      load()
    } catch (err) {
      showAlert('Unable to Save Security Role', apiErrorMessage(err, 'Failed to save security role.'))
    }
  }

  const remove = async (r: SecurityRole) => {
    if (!confirm(`Delete security role "${r.name}"? This will remove it from all users and teams.`)) return
    try {
      await api.delete(`/securityroles/${r.id}`)
      load()
    } catch (err) {
      showAlert('Unable to Delete Security Role', apiErrorMessage(err, 'Failed to delete security role.'))
    }
  }

  return (
    <div>
      <PageHeader
        title="Security Roles"
        subtitle={`${roles.length} security roles`}
        action={isAdmin ? <button onClick={openNew} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Security Role</button> : undefined}
      />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {roles.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-900">{r.name}</div>
                {r.description && <div className="text-sm text-gray-500">{r.description}</div>}
                <div className="flex gap-1 mt-1 items-center">
                  {r.name === 'Admin' ? (
                    <span className="text-sm px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">All modules</span>
                  ) : (r.modules ?? []).length === 0 ? (
                    <span className="text-sm text-gray-400">No modules assigned</span>
                  ) : (
                    <>
                      {r.modules.map((m) => (
                        <span key={m} className="text-sm px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {allModules.find((am) => am.key === m)?.label ?? m}
                        </span>
                      ))}
                      {r.accessLevel && r.accessLevel !== 'Full' && (
                        <span className="text-sm px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{r.accessLevel}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-3 text-sm">
                  <button onClick={() => openEdit(r)} className="text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => remove(r)} className="text-red-500 hover:underline">Delete</button>
                </div>
              )}
            </div>
          ))}
          {roles.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No security roles yet</div>}
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Security Role' : 'New Security Role'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modules</label>
              <div className="flex flex-wrap gap-3">
                {assignableModules.map((m) => (
                  <label key={m.key} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={form.modules.includes(m.key)} onChange={() => toggleModule(m.key)} />
                    {m.label}
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-400 mt-1">Settings access is granted only via the Admin role.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.accessLevel} onChange={(e) => setForm((f) => ({ ...f, accessLevel: e.target.value }))}>
                {accessLevels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
              <p className="text-sm text-gray-400 mt-1">
                Full: create/edit/delete any record. ReadOnly: view only. UserLevel: view/edit only records owned by the user or a teammate.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={save} disabled={!form.name.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

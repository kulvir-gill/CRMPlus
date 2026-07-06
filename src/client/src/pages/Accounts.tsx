import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Account {
  id: number; name: string; phone?: string; email?: string; website?: string
  industry?: string; auditEnabled: boolean; contactCount: number; activityCount: number
}

const empty = { name: '', phone: '', email: '', website: '', address: '', industry: '', auditEnabled: false }

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/accounts', { params: { search } }).then((r) => setAccounts(r.data))
  useEffect(() => { load() }, [search])

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (a: Account) => {
    setEditing(a)
    setForm({ name: a.name, phone: a.phone ?? '', email: a.email ?? '', website: a.website ?? '', address: '', industry: a.industry ?? '', auditEnabled: a.auditEnabled })
    setShowModal(true)
  }

  const save = async () => {
    if (editing) await api.put(`/accounts/${editing.id}`, form)
    else await api.post('/accounts', form)
    setShowModal(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this account?')) return
    await api.delete(`/accounts/${id}`)
    load()
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} records`}
        action={<button onClick={openCreate} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Account</button>}
      />
      <div className="p-6">
        <input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                {['Name', 'Email', 'Phone', 'Industry', 'Contacts', 'Activities', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.industry ?? '—'}</td>
                  <td className="px-4 py-3">{a.contactCount}</td>
                  <td className="px-4 py-3">{a.activityCount}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(a)} className="text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(a.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Account' : 'New Account'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {[['name', 'Name *'], ['email', 'Email'], ['phone', 'Phone'], ['website', 'Website'], ['address', 'Address'], ['industry', 'Industry']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form[k as keyof typeof form] as string}
                  onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auditEnabled} onChange={(e) => set('auditEnabled', e.target.checked)} />
              Enable audit history
            </label>
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

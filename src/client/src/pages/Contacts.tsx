import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Contact { id: number; firstName: string; lastName: string; email?: string; phone?: string; title?: string; accountId?: number; accountName?: string }
interface Account { id: number; name: string }

const empty = { firstName: '', lastName: '', email: '', phone: '', title: '', accountId: '', auditEnabled: false }

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/contacts', { params: { search } }).then((r) => setContacts(r.data))
  useEffect(() => { load(); api.get('/accounts').then((r) => setAccounts(r.data)) }, [search])

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (c: Contact) => {
    setEditing(c)
    setForm({ firstName: c.firstName, lastName: c.lastName, email: c.email ?? '', phone: c.phone ?? '', title: c.title ?? '', accountId: c.accountId?.toString() ?? '', auditEnabled: false })
    setShowModal(true)
  }

  const save = async () => {
    const payload = { ...form, accountId: form.accountId ? parseInt(form.accountId) : null }
    if (editing) await api.put(`/contacts/${editing.id}`, payload)
    else await api.post('/contacts', payload)
    setShowModal(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this contact?')) return
    await api.delete(`/contacts/${id}`)
    load()
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} records`}
        action={<button onClick={openCreate} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Contact</button>}
      />
      <div className="p-6">
        <input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>{['Name', 'Title', 'Email', 'Phone', 'Account', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.accountName ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(c)} className="text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(c.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No contacts found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Contact' : 'New Contact'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['firstName', 'First Name *'], ['lastName', 'Last Name *']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={form[k as keyof typeof form] as string} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
            {[['email', 'Email'], ['phone', 'Phone'], ['title', 'Title']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={form[k as keyof typeof form] as string} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.accountId} onChange={(e) => set('accountId', e.target.value)}>
                <option value="">— None —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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

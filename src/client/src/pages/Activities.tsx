import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Activity { id: number; type: string; subject: string; body?: string; accountName?: string; contactName?: string; userName: string; createdAt: string }
interface Account { id: number; name: string }
interface Contact { id: number; firstName: string; lastName: string }

const empty = { type: 'Note', subject: '', body: '', accountId: '', contactId: '' }

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/activities').then((r) => setActivities(r.data))
  useEffect(() => {
    load()
    api.get('/accounts').then((r) => setAccounts(r.data))
    api.get('/contacts').then((r) => setContacts(r.data))
  }, [])

  const save = async () => {
    await api.post('/activities', {
      type: form.type === 'Note' ? 0 : form.type === 'Email' ? 1 : form.type === 'Call' ? 2 : 3,
      subject: form.subject, body: form.body,
      accountId: form.accountId ? parseInt(form.accountId) : null,
      contactId: form.contactId ? parseInt(form.contactId) : null,
    })
    setShowModal(false)
    setForm(empty)
    load()
  }

  const typeIcon: Record<string, string> = { Note: '📝', Email: '✉️', Call: '📞', Meeting: '👥' }

  return (
    <div>
      <PageHeader
        title="Activities"
        action={<button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ Log Activity</button>}
      />
      <div className="p-6 space-y-3">
        {activities.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcon[a.type] ?? '📌'}</span>
                <div>
                  <p className="font-medium text-gray-900">{a.subject}</p>
                  {a.body && <p className="text-sm text-gray-600 mt-1">{a.body}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {a.accountName && <span className="mr-2">🏢 {a.accountName}</span>}
                    {a.contactName && <span className="mr-2">👤 {a.contactName}</span>}
                    by {a.userName}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {activities.length === 0 && <p className="text-center text-gray-500 py-10">No activities yet</p>}
      </div>

      {showModal && (
        <Modal title="Log Activity" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {['Note', 'Email', 'Call', 'Meeting'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
                  <option value="">— None —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contactId} onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}>
                  <option value="">— None —</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
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

import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Activity { id: string; type: string; subject: string; body?: string; direction?: string; accountName?: string; contactName?: string; userName: string; createdAt: string }
interface Account { id: string; name: string }
interface Contact { id: string; firstName: string; lastName: string }

const empty = { type: 'Note', subject: '', body: '', direction: 'Sent', accountId: '', contactId: '' }

export default function Activities() {
  const { user: me } = useAuth()
  const canCreate = getAccessLevel(me, 'crm') !== 'ReadOnly'
  const [activities, setActivities] = useState<Activity[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(empty)

  const load = () => api.get('/activities').then((r) => setActivities(r.data))
  useEffect(() => {
    load()
    api.get('/accounts', { params: { pageSize: 1000 } }).then((r) => setAccounts(r.data.items))
    api.get('/contacts').then((r) => setContacts(r.data))
  }, [])

  const save = async () => {
    await api.post('/activities', {
      type: form.type === 'Note' ? 0 : 1,
      subject: form.subject, body: form.body,
      direction: form.type === 'Email' ? (form.direction === 'Sent' ? 0 : 1) : null,
      accountId: form.accountId || null,
      contactId: form.contactId || null,
    })
    setShowModal(false)
    setForm(empty)
    load()
  }

  const typeIcon: Record<string, string> = { Note: '📝', Email: '✉️' }

  return (
    <div>
      <PageHeader
        title="Activities"
        action={canCreate ? <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ Log Activity</button> : undefined}
      />
      <div className="p-6 space-y-3">
        {activities.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-sm">{typeIcon[a.type] ?? '📌'}</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {a.subject}
                    {a.direction && (
                      <span className={`ml-2 text-sm px-2 py-0.5 rounded-full font-medium align-middle ${a.direction === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {a.direction}
                      </span>
                    )}
                  </p>
                  {a.body && <p className="text-sm text-gray-600 mt-1">{a.body}</p>}
                  <p className="text-sm text-gray-400 mt-2">
                    {a.accountName && <span className="mr-2">🏢 {a.accountName}</span>}
                    {a.contactName && <span className="mr-2">👤 {a.contactName}</span>}
                    by {a.userName}
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</span>
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
                {['Note', 'Email'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            {form.type === 'Email' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}>
                  <option>Sent</option>
                  <option>Received</option>
                </select>
              </div>
            )}
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

import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Invoice { id: number; invoiceNumber: string; accountName: string; status: string; total: number; dueDate?: string; createdAt: string }
interface Account { id: number; name: string }

const statusColor: Record<string, string> = { Draft: 'bg-gray-100 text-gray-700', Sent: 'bg-blue-100 text-blue-700', Paid: 'bg-green-100 text-green-700', Overdue: 'bg-red-100 text-red-700', Cancelled: 'bg-orange-100 text-orange-700' }

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ accountId: '', status: 'Draft', dueDate: '', notes: '', taxRate: '0', lines: [{ description: '', quantity: '1', unitPrice: '0' }] })

  const load = () => api.get('/invoices').then((r) => setInvoices(r.data))
  useEffect(() => { load(); api.get('/accounts').then((r) => setAccounts(r.data)) }, [])

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { description: '', quantity: '1', unitPrice: '0' }] }))
  const setLine = (i: number, k: string, v: string) => setForm((f) => {
    const lines = [...f.lines]; lines[i] = { ...lines[i], [k]: v }; return { ...f, lines }
  })

  const save = async () => {
    await api.post('/invoices', {
      accountId: parseInt(form.accountId), status: form.status,
      dueDate: form.dueDate || null, notes: form.notes, taxRate: parseFloat(form.taxRate),
      lineItems: form.lines.map((l) => ({ description: l.description, quantity: parseFloat(l.quantity), unitPrice: parseFloat(l.unitPrice) }))
    })
    setShowModal(false); load()
  }

  const remove = async (id: number) => { if (!confirm('Delete?')) return; await api.delete(`/invoices/${id}`); load() }

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`}
        action={<button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Invoice</button>} />
      <div className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>{['Invoice #', 'Account', 'Status', 'Total', 'Due Date', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.accountName}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[inv.status] ?? ''}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 font-medium">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => remove(inv.id)} className="text-red-500 hover:underline">Delete</button></td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No invoices</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="New Invoice" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}>
                <option value="">— Select —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
              {form.lines.map((l, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <input placeholder="Description" className="col-span-1 border rounded px-2 py-1 text-sm" value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
                  <input type="number" placeholder="Qty" className="border rounded px-2 py-1 text-sm" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                  <input type="number" placeholder="Unit Price" className="border rounded px-2 py-1 text-sm" value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} />
                </div>
              ))}
              <button onClick={addLine} className="text-sm text-indigo-600 hover:underline">+ Add line</button>
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

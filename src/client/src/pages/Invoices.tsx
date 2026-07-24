import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import SortableTh from '../components/SortableTh'
import { useLocalSort } from '../hooks/useLocalSort'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Invoice { id: string; invoiceNumber: string; accountName: string; status: string; total: number; dueDate?: string; createdAt: string; ownerId?: string; ownerName?: string; ownerTeamId?: string; ownerTeamName?: string }

const statusColor: Record<string, string> = { Draft: 'bg-gray-100 text-gray-700', Sent: 'bg-blue-100 text-blue-700', Paid: 'bg-green-100 text-green-700', Overdue: 'bg-red-100 text-red-700', Cancelled: 'bg-orange-100 text-orange-700' }

export default function Invoices() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const salesAccess = getAccessLevel(me, 'sales')
  const canDelete = (inv: Invoice) => salesAccess === 'Full' || (salesAccess === 'UserLevel' && inv.ownerId === me?.userId)
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const load = () => api.get('/invoices').then((r) => setInvoices(r.data))
  useEffect(() => { load() }, [])

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete?')) return
    await api.delete(`/invoices/${id}`)
    load()
  }

  const { sorted: sortedInvoices, sortField: invoiceSortField, sortDir: invoiceSortDir, toggleSort: toggleInvoiceSort } = useLocalSort(invoices, {
    invoiceNumber: (inv) => inv.invoiceNumber,
    account: (inv) => inv.accountName,
    status: (inv) => inv.status,
    total: (inv) => inv.total,
    dueDate: (inv) => inv.dueDate ?? '',
    createdAt: (inv) => inv.createdAt,
    owner: (inv) => inv.ownerName ?? inv.ownerTeamName ?? '',
  })

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`}
        action={salesAccess !== 'ReadOnly' ? <button onClick={() => navigate('/sales/invoices/new')} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ New Invoice</button> : undefined} />
      <div className="p-6">
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
              <tr>
                <SortableTh field="invoiceNumber" label="Invoice #" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <SortableTh field="account" label="Account" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <SortableTh field="status" label="Status" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <SortableTh field="total" label="Total" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <SortableTh field="dueDate" label="Due Date" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <SortableTh field="createdAt" label="Created" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <SortableTh field="owner" label="Owner" sortField={invoiceSortField} sortDir={invoiceSortDir} onSort={toggleInvoiceSort} className="py-3" />
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedInvoices.map((inv) => (
                <tr key={inv.id} onClick={() => navigate(`/sales/invoices/${inv.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.accountName}</td>
                  <td className="px-4 py-3"><span className={`text-sm px-2 py-0.5 rounded-full font-medium ${statusColor[inv.status] ?? ''}`}>{inv.status}</span></td>
                  <td className="px-4 py-3 font-medium">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.ownerName ?? inv.ownerTeamName ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{canDelete(inv) && <button onClick={(e) => remove(e, inv.id)} className="text-red-500 hover:underline">Delete</button>}</td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No invoices</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

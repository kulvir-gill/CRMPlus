import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import Modal from '../components/Modal'
import OwnerPicker from '../components/OwnerPicker'
import LookupField from '../components/LookupField'
import AuditHistoryTable from '../components/AuditHistoryTable'
import SortableTh from '../components/SortableTh'
import { IconNew } from '../components/RibbonButton'
import {
  ToolbarButton, RecordHeader, StatusPill,
  SectionCard, InfoRow, InfoField, LinkCell, TotalsPanel,
  IconDoc, IconCart,
} from '../components/DetailChrome'
import { useLocalSort } from '../hooks/useLocalSort'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface LineItem { key: string; productId: string | null; productLabel: string | null; productNumber: string | null; description: string; quantity: string; unitPrice: string }

interface Invoice {
  id: string; invoiceNumber: string
  accountId: string; accountName: string
  quoteId?: string | null
  orderId?: string | null; orderNumber?: string | null
  status: string; dueDate?: string | null; notes?: string
  taxRate: number; subtotal: number; tax: number; total: number; createdAt: string
  lineItems: { id: string; productId?: string | null; productNumber?: string | null; productName?: string | null; description: string; quantity: number; unitPrice: number; total: number }[]
  ownerId?: string | null; ownerName?: string
  ownerTeamId?: string | null; ownerTeamName?: string
}

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }

const statuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']
const statusTone: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = {
  Draft: 'gray', Sent: 'blue', Paid: 'green', Overdue: 'red', Cancelled: 'amber',
}

const emptyLineForm = { productId: null as string | null, productLabel: null as string | null, productNumber: null as string | null, description: '', quantity: '1', unitPrice: '0' }

const empty = {
  accountId: '', status: 'Draft', dueDate: '', notes: '', taxRate: '0',
  ownerId: null as string | null, ownerTeamId: null as string | null,
  lines: [] as LineItem[],
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function IconInvoiceMark() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2.5h10v15l-2-1.3-1.5 1.3-1.5-1.3-1.5 1.3-1.5-1.3-2 1.3v-15z" />
      <path d="M7.3 6.5h5.4M7.3 9.5h5.4M7.3 12.5h3" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h9l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <path d="M7 4v4h5V4" />
      <path d="M6.5 12h7v4h-7z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { user: me } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [accountLabel, setAccountLabel] = useState<string | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showLineModal, setShowLineModal] = useState(false)
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null)
  const [lineForm, setLineForm] = useState(emptyLineForm)
  const [lineFormError, setLineFormError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'audit'>('summary')
  const [noteOpen, setNoteOpen] = useState(false)

  const loadInvoice = () => api.get(`/invoices/${id}`).then((r) => {
    const i: Invoice = r.data
    setInvoice(i)
    setAccountLabel(i.accountName ?? null)
    setForm({
      accountId: i.accountId, status: i.status, dueDate: i.dueDate ? i.dueDate.slice(0, 10) : '',
      notes: i.notes ?? '', taxRate: i.taxRate.toString(),
      ownerId: i.ownerId ?? null, ownerTeamId: i.ownerTeamId ?? null,
      lines: i.lineItems.map((li, idx) => ({
        key: `l${idx}`, productId: li.productId ?? null, productLabel: li.productName ?? null, productNumber: li.productNumber ?? null,
        description: li.description, quantity: li.quantity.toString(), unitPrice: li.unitPrice.toString(),
      })),
    })
    setIsDirty(false)
  })

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  useEffect(() => {
    if (isNew) {
      const prefillAccountId = searchParams.get('accountId') ?? ''
      const prefillAccountName = searchParams.get('accountName')
      setInvoice({
        id: '', invoiceNumber: '', accountId: prefillAccountId, accountName: prefillAccountName ?? '',
        status: 'Draft', notes: '', taxRate: 0, subtotal: 0, tax: 0, total: 0, createdAt: new Date().toISOString(),
        lineItems: [], ownerId: me?.userId ?? null, ownerTeamId: null,
      })
      setAccountLabel(prefillAccountName)
      setForm({ ...empty, accountId: prefillAccountId, ownerId: me?.userId ?? null })
      setIsDirty(false)
      return
    }
    loadInvoice()
  }, [id])

  const set = (k: string, v: string | null) => {
    setForm((f) => ({ ...f, [k]: v }))
    setIsDirty(true)
    setSaveError(null)
  }

  const setOwner = (newOwnerId: string | null, newOwnerTeamId: string | null) => {
    setForm((f) => ({ ...f, ownerId: newOwnerId, ownerTeamId: newOwnerTeamId }))
    setIsDirty(true)
    setSaveError(null)
  }

  const openCreateLine = () => {
    setEditingLineKey(null)
    setLineForm(emptyLineForm)
    setLineFormError(null)
    setShowLineModal(true)
  }
  const openEditLine = (l: LineItem) => {
    setEditingLineKey(l.key)
    setLineForm({ productId: l.productId, productLabel: l.productLabel, productNumber: l.productNumber, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })
    setLineFormError(null)
    setShowLineModal(true)
  }
  const setLineFormField = (k: string, v: string | null) => setLineForm((f) => ({ ...f, [k]: v }))
  const setLineFormProduct = (productId: string | null, item: Record<string, unknown> | null) => {
    setLineForm((f) => ({
      ...f, productId, productLabel: (item?.name as string) ?? null, productNumber: (item?.productNumber as string) ?? null,
      description: item ? (item.name as string) : f.description,
      unitPrice: item ? String(item.price) : f.unitPrice,
    }))
  }
  const saveLine = () => {
    if (!lineForm.description.trim()) {
      setLineFormError('Description is required.')
      return
    }
    if (editingLineKey) {
      setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.key === editingLineKey ? { ...l, ...lineForm } : l)) }))
    } else {
      setForm((f) => ({ ...f, lines: [...f.lines, { key: crypto.randomUUID(), ...lineForm }] }))
    }
    setIsDirty(true)
    setSaveError(null)
    setShowLineModal(false)
  }
  const deleteLine = () => {
    if (!editingLineKey) return
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.key !== editingLineKey) }))
    setIsDirty(true)
    setShowLineModal(false)
  }

  const lineTotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)
  const lineFormTotal = (parseFloat(lineForm.quantity) || 0) * (parseFloat(lineForm.unitPrice) || 0)
  const subtotal = form.lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const taxAmount = subtotal * (parseFloat(form.taxRate) || 0) / 100
  const grandTotal = subtotal + taxAmount

  const buildPayload = (status: string) => ({
    accountId: form.accountId, contactId: null, quoteId: invoice?.quoteId ?? null, orderId: invoice?.orderId ?? null,
    status, dueDate: form.dueDate || null, notes: form.notes, taxRate: parseFloat(form.taxRate) || 0,
    ownerId: form.ownerId, ownerTeamId: form.ownerTeamId,
    lineItems: form.lines
      .filter((l) => l.description.trim())
      .map((l) => ({ productId: l.productId, description: l.description, quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0 })),
  })

  const save = async () => {
    try {
      if (isNew) {
        const res = await api.post('/invoices', buildPayload(form.status))
        setSaveError(null)
        setIsDirty(false)
        navigate(`/sales/invoices/${res.data.id}`, { replace: true })
        return
      }
      await api.put(`/invoices/${id}`, buildPayload(form.status))
      setSaveError(null)
      await loadInvoice()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Failed to save invoice.'
      setSaveError(message)
      throw err
    }
  }

  useEffect(() => {
    setDirty(isDirty)
  }, [isDirty, setDirty])

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  useEffect(() => () => setDirty(false), [setDirty])

  const { sorted: sortedLines, sortField: lineSortField, sortDir: lineSortDir, toggleSort: toggleLineSort } = useLocalSort(form.lines, {
    productNumber: (l) => l.productNumber ?? '',
    product: (l) => l.productLabel ?? '',
    description: (l) => l.description,
    quantity: (l) => parseFloat(l.quantity) || 0,
    unitPrice: (l) => parseFloat(l.unitPrice) || 0,
    total: (l) => lineTotal(l),
  })

  if (!invoice) return null

  const salesAccess = getAccessLevel(me, 'sales')
  const isOwner = isNew || invoice.ownerId === me?.userId
  const noAccess = salesAccess === 'ReadOnly' || (salesAccess === 'UserLevel' && !isOwner)
  const readOnly = noAccess
  const displayName = isNew ? 'New Invoice' : invoice.invoiceNumber
  const saveDisabled = readOnly || !form.accountId || (!isNew && !isDirty)
  const showNoteEditor = noteOpen || !!form.notes.trim()

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <RecordHeader
          icon={<IconInvoiceMark />}
          iconBg="bg-gradient-to-br from-gray-900 to-[#26344d]"
          title={displayName}
          subtitle={`Invoice · Account ${isNew ? 'Unsaved' : invoice.accountName}`}
          badge={<StatusPill label={form.status} tone={statusTone[form.status] ?? 'gray'} />}
          flush
          onBack={() => guardedNavigate(-1)}
          toolbar={
            <>
              {salesAccess !== 'ReadOnly' && <ToolbarButton size="sm" icon={<IconNew />} label="New" onClick={() => guardedNavigate('/sales/invoices/new')} />}
              <ToolbarButton
                size="sm"
                icon={<IconSave />}
                label={isDirty ? 'Save*' : 'Save'}
                onClick={save}
                disabled={saveDisabled}
                variant="primary"
                title={noAccess ? 'You do not have edit access to this record' : !isNew && !isDirty ? 'No changes to save' : !form.accountId ? 'Account is required' : 'Save'}
              />
            </>
          }
          metrics={[
            ...(isNew ? [] : [{ label: 'Created', content: <div className="text-sm font-medium text-gray-900">{formatDate(invoice.createdAt)}</div> }]),
            {
              label: 'Owner', content: (
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  ownerName={invoice.ownerName}
                  ownerTeamName={invoice.ownerTeamName}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  readOnly={readOnly || salesAccess === 'UserLevel'}
                  className="text-sm font-medium text-gray-900 bg-transparent text-right rounded hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  title="Select Invoice Owner"
                />
              ),
            },
            ...(!isNew && invoice.orderId && invoice.orderNumber ? [{ label: 'Order', content: <LinkCell to={`/sales/orders/${invoice.orderId}`}>{invoice.orderNumber}</LinkCell> }] : []),
          ]}
        />
      </div>

      <div className="flex gap-6 px-6 border-b border-gray-200 bg-transparent text-sm">
        {(isNew ? ([['summary', 'Summary']] as const) : ([['summary', 'Summary'], ['audit', 'Audit history']] as const)).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-1.5 border-b-2 ${tab === key ? 'border-blue-600 text-gray-900 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'audit' ? (
          <AuditHistoryTable entity="Invoice" entityId={id!} />
        ) : (
        <div className="grid grid-cols-12 gap-3 items-start">
          <div className="col-span-10 space-y-3">
            <SectionCard icon={<IconDoc />} title="Invoice information">
              <div>
                <InfoRow>
                  <InfoField size="md" label="Account" required>
                    <LookupField
                      value={form.accountId || null}
                      valueLabel={accountLabel}
                      endpoint="/accounts"
                      recordPath="/crm/accounts"
                      readOnly={readOnly}
                      onChange={(accountId, item) => {
                        setForm((f) => ({
                          ...f, accountId: accountId ?? '',
                          taxRate: item?.taxRate != null ? String(item.taxRate) : f.taxRate,
                        }))
                        setAccountLabel((item?.name as string) ?? null)
                        setIsDirty(true)
                        setSaveError(null)
                      }}
                      placeholder="Search accounts..."
                      className="w-full border border-gray-200 rounded-lg pl-2.5 pr-9 py-1.5 text-sm bg-control focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                    />
                  </InfoField>
                </InfoRow>
                <InfoRow>
                  <InfoField size="md" label="Invoice #">{isNew ? '—' : invoice.invoiceNumber}</InfoField>
                  <InfoField size="md" label="Order">
                    {!isNew && invoice.orderId && invoice.orderNumber ? (
                      <LinkCell to={`/sales/orders/${invoice.orderId}`}>{invoice.orderNumber}</LinkCell>
                    ) : '—'}
                  </InfoField>
                </InfoRow>
                <InfoRow>
                  <InfoField size="md" label="Status">
                    {readOnly ? form.status : (
                      <select
                        value={form.status}
                        onChange={(e) => set('status', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-blue-600 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </InfoField>
                  <InfoField size="md" label="Due date">
                    {readOnly ? (form.dueDate ? formatDate(form.dueDate) : '—') : (
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => set('dueDate', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-blue-600 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    )}
                  </InfoField>
                </InfoRow>
                <InfoRow>
                  <InfoField size="md" label="Tax rate">
                    {readOnly ? `${form.taxRate || '0'}%` : (
                      <div className="relative">
                        <input
                          value={form.taxRate}
                          onChange={(e) => set('taxRate', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-sm text-blue-600 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                      </div>
                    )}
                  </InfoField>
                </InfoRow>
                {saveError && <div className="px-5 py-2 text-sm text-red-600">{saveError}</div>}
              </div>
              {!readOnly && !showNoteEditor && (
                <button
                  onClick={() => setNoteOpen(true)}
                  className="w-full flex items-center gap-2 px-5 py-2.5 border-t border-gray-100 text-sm font-semibold text-blue-600 hover:bg-control"
                >
                  <IconPlus />
                  Add note
                </button>
              )}
              {(showNoteEditor || (readOnly && form.notes)) && (
                <div className="px-5 py-3 border-t border-gray-100">
                  {readOnly ? (
                    <p className="text-sm text-gray-700">{form.notes}</p>
                  ) : (
                    <textarea
                      value={form.notes}
                      onChange={(e) => set('notes', e.target.value)}
                      rows={3}
                      autoFocus={noteOpen}
                      placeholder="Add internal notes for this invoice..."
                      className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-control focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                    />
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard
              icon={<IconCart />}
              title="Invoice items"
              action={!readOnly && !isNew && (
                <button onClick={openCreateLine} title="New invoice item" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50">+</button>
              )}
            >
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500">
                      <SortableTh field="productNumber" label="Product #" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-28" />
                      <SortableTh field="product" label="Product" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-48" />
                      <SortableTh field="description" label="Description" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-48" />
                      <SortableTh field="quantity" label="Qty" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-20" />
                      <SortableTh field="unitPrice" label="Unit price" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-32" />
                      <SortableTh field="total" label="Total" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-32" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedLines.map((l) => (
                      <tr
                        key={l.key}
                        onClick={() => !readOnly && !isNew && openEditLine(l)}
                        className={readOnly || isNew ? '' : 'cursor-pointer hover:bg-gray-50'}
                      >
                        <td className="px-4 py-2.5 font-mono">
                          {l.productNumber && l.productId ? (
                            <span onClick={(e) => e.stopPropagation()}><LinkCell to={`/inventory/products/${l.productId}`}>{l.productNumber}</LinkCell></span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{l.productLabel ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{l.description || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{l.quantity}</td>
                        <td className="px-4 py-2.5 text-gray-600">${l.unitPrice}</td>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">${lineTotal(l).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {form.lines.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {isNew ? 'Save the invoice to add line items' : 'No line items yet'}
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 text-sm text-gray-500">
                  <span>{form.lines.length} line item{form.lines.length === 1 ? '' : 's'}</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="col-span-2">
            <TotalsPanel
              rows={[
                { label: 'Subtotal', value: `$${subtotal.toFixed(2)}` },
                { label: `Tax (${form.taxRate || '0'}%)`, value: `$${taxAmount.toFixed(2)}`, muted: taxAmount === 0 },
              ]}
              total={`$${grandTotal.toFixed(2)}`}
            />
          </div>
        </div>
        )}
      </div>

      {showLineModal && (
        <Modal title={editingLineKey ? 'Edit Invoice Item' : 'New Invoice Item'} onClose={() => setShowLineModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <LookupField
                value={lineForm.productId}
                valueLabel={lineForm.productLabel}
                endpoint="/products"
                recordPath="/inventory/products"
                onChange={setLineFormProduct}
                secondary={(item) => `$${Number(item.price).toFixed(2)}`}
                placeholder="Search products..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={lineForm.description}
                onChange={(e) => setLineFormField('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={lineForm.quantity}
                  onChange={(e) => setLineFormField('quantity', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    className="w-full border rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={lineForm.unitPrice}
                    onChange={(e) => setLineFormField('unitPrice', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Total: <span className="text-gray-900 font-medium">${lineFormTotal.toFixed(2)}</span></div>
            {lineFormError && <p className="text-sm text-red-600">{lineFormError}</p>}
            <div className="flex justify-between items-center pt-2">
              {editingLineKey ? (
                <button onClick={deleteLine} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setShowLineModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button onClick={saveLine} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

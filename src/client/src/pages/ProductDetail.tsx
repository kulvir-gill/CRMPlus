import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import Modal from '../components/Modal'
import OwnerPicker from '../components/OwnerPicker'
import LookupField from '../components/LookupField'
import AuditHistoryTable from '../components/AuditHistoryTable'
import SortableTh from '../components/SortableTh'
import { Breadcrumb, Toolbar, ToolbarButton, RecordHeader, StatusPill } from '../components/DetailChrome'
import { useLocalSort } from '../hooks/useLocalSort'
import { usePagination } from '../hooks/usePagination'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Product {
  id: string; productNumber: string; name: string; description?: string; price: number; unit: string
  vendorId?: string | null; vendorName?: string
  auditEnabled: boolean; isActive: boolean; createdAt: string
  ownerId?: string | null; ownerName?: string
  ownerTeamId?: string | null; ownerTeamName?: string
}

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }

interface Purchase {
  id: string; productId: string; vendorId?: string | null; vendorName?: string
  currency: string; unitOfMeasure: string; quantity: number; price: number; status: string; createdAt: string
}

const empty = {
  name: '', description: '', price: '', unit: 'each', vendorId: null as string | null, auditEnabled: false,
  ownerId: null as string | null, ownerTeamId: null as string | null,
}

const emptyPurchase = {
  vendorId: null as string | null, vendorLabel: null as string | null,
  currency: 'USD', unitOfMeasure: 'each', quantity: '1', price: '', status: 'Draft',
}

const unitOptions = ['each', 'hour', 'day', 'week', 'month', 'year', 'box', 'case', 'pack', 'seat', 'kg', 'lb']
const currencyOptions = ['USD', 'CAD', 'EUR', 'GBP', 'AUD']
const purchaseStatusOptions = ['Draft', 'Submitted', 'Ordered', 'Received', 'Cancelled']

const purchaseStatusStyles: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Submitted: 'bg-blue-100 text-blue-700',
  Ordered: 'bg-indigo-100 text-indigo-700',
  Received: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
}

const avatarPalette = ['bg-indigo-700', 'bg-teal-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function avatarColor(seed: string) {
  const code = seed.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return avatarPalette[code % avatarPalette.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })
}


function IconNew() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  )
}

function IconBack() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 5.5L7 10l5.5 4.5" />
    </svg>
  )
}

function IconSave({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${active ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h9l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <path d="M7 4v4h5V4" />
      <path d="M6.5 12h7v4h-7z" />
    </svg>
  )
}

function IconPower() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v5" />
      <path d="M6 6a6 6 0 106 0" />
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 8A5.5 5.5 0 105.6 12" />
      <path d="M15.8 4.5v3.6h-3.6" />
    </svg>
  )
}

function FieldRow({ label, required, value, onChange, readOnly }: {
  label: string; required?: boolean; value: string; onChange?: (v: string) => void; readOnly?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5">
      <div className="w-24 shrink-0 text-sm text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {readOnly ? (
        <div className="flex-1 min-w-0 text-sm text-gray-500 px-1.5 py-1">{value || '—'}</div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent rounded px-1.5 -mx-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
        />
      )}
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { user: me } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase)
  const [purchaseSaveError, setPurchaseSaveError] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'audit' | 'purchases'>('summary')

  const loadProduct = () => api.get(`/products/${id}`).then((r) => {
    const p: Product = r.data
    setProduct(p)
    setForm({
      name: p.name, description: p.description ?? '', price: p.price.toString(), unit: p.unit,
      vendorId: p.vendorId ?? null,
      auditEnabled: p.auditEnabled ?? false, ownerId: p.ownerId ?? null, ownerTeamId: p.ownerTeamId ?? null,
    })
    setIsDirty(false)
  })

  const loadPurchases = () => api.get('/purchases', { params: { productId: id } }).then((r) => setPurchases(r.data))

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  useEffect(() => {
    if (isNew) {
      setProduct({
        id: '', productNumber: '', name: '', description: '', price: 0, unit: 'each', vendorId: null,
        auditEnabled: false, isActive: true, createdAt: new Date().toISOString(),
        ownerId: me?.userId ?? null, ownerTeamId: null,
      })
      setForm({ ...empty, ownerId: me?.userId ?? null })
      setIsDirty(false)
      return
    }
    loadProduct()
    loadPurchases()
  }, [id])

  const set = (k: string, v: string | boolean | null) => {
    setForm((f) => ({ ...f, [k]: v }))
    setIsDirty(true)
    setSaveError(null)
  }

  const setOwner = (newOwnerId: string | null, newOwnerTeamId: string | null) => {
    setForm((f) => ({ ...f, ownerId: newOwnerId, ownerTeamId: newOwnerTeamId }))
    setIsDirty(true)
    setSaveError(null)
  }

  const save = async () => {
    const payload = { ...form, price: parseFloat(form.price) || 0 }
    try {
      if (isNew) {
        const res = await api.post('/products', { ...payload, isActive: true })
        setSaveError(null)
        setIsDirty(false)
        navigate(`/inventory/products/${res.data.id}`, { replace: true })
        return
      }
      await api.put(`/products/${id}`, { ...payload, isActive: product?.isActive ?? true })
      setSaveError(null)
      await loadProduct()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Failed to save product.'
      setSaveError(message)
      throw err
    }
  }
  const refresh = () => loadProduct()

  const toggleActive = async () => {
    if (!product) return
    const payload = { ...form, price: parseFloat(form.price) || 0 }
    await api.put(`/products/${id}`, { ...payload, isActive: !product.isActive })
    await loadProduct()
  }

  const openCreatePurchase = () => {
    setEditingPurchase(null)
    setPurchaseForm(emptyPurchase)
    setPurchaseSaveError(null)
    setShowPurchaseModal(true)
  }
  const openEditPurchase = (p: Purchase) => {
    setEditingPurchase(p)
    setPurchaseForm({
      vendorId: p.vendorId ?? null, vendorLabel: p.vendorName ?? null,
      currency: p.currency, unitOfMeasure: p.unitOfMeasure, quantity: p.quantity.toString(), price: p.price.toString(), status: p.status,
    })
    setPurchaseSaveError(null)
    setShowPurchaseModal(true)
  }
  const setPurchaseField = (k: string, v: string | null) => setPurchaseForm((f) => ({ ...f, [k]: v }))
  const savePurchase = async () => {
    const payload = { ...purchaseForm, productId: id, quantity: parseFloat(purchaseForm.quantity) || 0, price: parseFloat(purchaseForm.price) || 0 }
    try {
      if (editingPurchase) await api.put(`/purchases/${editingPurchase.id}`, payload)
      else await api.post('/purchases', payload)
      setPurchaseSaveError(null)
      setShowPurchaseModal(false)
      loadPurchases()
    } catch (err) {
      setPurchaseSaveError(axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save purchase.')
    }
  }
  const deletePurchase = async (p: Purchase) => {
    if (!confirm('Delete this purchase record?')) return
    await api.delete(`/purchases/${p.id}`)
    loadPurchases()
  }

  useEffect(() => {
    setDirty(isDirty)
  }, [isDirty, setDirty])

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  useEffect(() => () => setDirty(false), [setDirty])

  const { sorted: sortedPurchases, sortField: purchaseSortField, sortDir: purchaseSortDir, toggleSort: togglePurchaseSort } = useLocalSort(purchases, {
    vendor: (p) => p.vendorName ?? '',
    currency: (p) => p.currency,
    unitOfMeasure: (p) => p.unitOfMeasure,
    quantity: (p) => p.quantity,
    price: (p) => p.price,
    status: (p) => p.status,
  })
  const { page: purchasePage, setPage: setPurchasePage, totalPages: purchaseTotalPages, pageItems: pagedPurchases } = usePagination(sortedPurchases, 20)

  if (!product) return null

  const inventoryAccess = getAccessLevel(me, 'inventory')
  const isOwner = isNew || product.ownerId === me?.userId
  const noAccess = inventoryAccess === 'ReadOnly' || (inventoryAccess === 'UserLevel' && !isOwner)
  const readOnly = (!isNew && !product.isActive) || noAccess
  const displayName = isNew ? (form.name || 'New Product') : product.name
  const saveDisabled = readOnly || !form.name.trim() || (!isNew && !isDirty)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Products', to: '/inventory/products' }, { label: displayName }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate(-1)} title="Back to products" />
          {inventoryAccess !== 'ReadOnly' && <ToolbarButton icon={<IconNew />} label="New" onClick={() => guardedNavigate('/inventory/products/new')} />}
          {!isNew && <ToolbarButton icon={<IconRefresh />} label="Refresh" onClick={refresh} />}
          {!isNew && !noAccess && <ToolbarButton icon={<IconPower />} label={product.isActive ? 'Deactivate' : 'Activate'} onClick={toggleActive} />}
          <ToolbarButton
            icon={<IconSave />}
            label={isDirty ? 'Save*' : 'Save'}
            onClick={save}
            disabled={saveDisabled}
            variant="primary"
            title={noAccess ? 'You do not have edit access to this record' : readOnly ? 'Record is deactivated' : !isNew && !isDirty ? 'No changes to save' : 'Save'}
          />
        </Toolbar>
      </div>

      <div className="px-6 pb-3">
        <RecordHeader
          icon={<span className="text-sm font-semibold">{initials(displayName)}</span>}
          iconBg={avatarColor(displayName)}
          title={displayName}
          subtitle={`Product · ${isNew ? 'Unsaved' : `$${product.price.toFixed(2)} / ${product.unit}`}`}
          badge={readOnly ? <StatusPill label="Inactive" tone="gray" /> : undefined}
          metrics={[
            ...(isNew ? [] : [{ label: 'Created', content: <div className="text-sm font-medium text-gray-900">{formatDate(product.createdAt)}</div> }]),
            {
              label: 'Owner', content: (
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  ownerName={product.ownerName}
                  ownerTeamName={product.ownerTeamName}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  readOnly={readOnly || inventoryAccess === 'UserLevel'}
                  className="text-sm font-medium text-gray-900 bg-transparent text-right rounded hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  title="Select Product Owner"
                />
              ),
            },
          ]}
        />
      </div>

      <div className="flex gap-6 px-6 border-b border-gray-200 bg-transparent text-sm">
        {(isNew ? ([['summary', 'Summary']] as const) : ([['summary', 'Summary'], ['purchases', 'Purchases'], ['audit', 'Audit History']] as const)).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-2 border-b-2 ${tab === key ? 'border-blue-600 text-gray-900 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'summary' ? (
          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-6 bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-2.5 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase tracking-wide">Product Information</div>
              <div className="divide-y divide-gray-200">
                <FieldRow label="Product #" value={product.productNumber} readOnly />
                <FieldRow label="Name" required value={form.name} onChange={(v) => set('name', v)} readOnly={readOnly} />
                <FieldRow label="Description" value={form.description} onChange={(v) => set('description', v)} readOnly={readOnly} />
                {saveError && <div className="px-4 pb-2 -mt-1 text-sm text-red-600">{saveError}</div>}
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <FieldRow label="Price" required value={form.price} onChange={(v) => set('price', v)} readOnly={readOnly} />
                  <div className="flex items-center gap-3 px-4 py-1.5">
                    <div className="w-24 shrink-0 text-sm text-gray-500">Unit</div>
                    {readOnly ? (
                      <div className="flex-1 min-w-0 text-sm text-gray-500 px-1.5 py-1">{form.unit || '—'}</div>
                    ) : (
                      <select
                        value={form.unit}
                        onChange={(e) => set('unit', e.target.value)}
                        className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent rounded px-1.5 -mx-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                      >
                        {!unitOptions.includes(form.unit) && form.unit && (
                          <option value={form.unit}>{form.unit}</option>
                        )}
                        {unitOptions.map((u) => (
                          <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : tab === 'purchases' ? (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Purchases</span>
              {!readOnly && (
                <button onClick={openCreatePurchase} title="New Purchase" className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">+</button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  <SortableTh field="vendor" label="Vendor" sortField={purchaseSortField} sortDir={purchaseSortDir} onSort={togglePurchaseSort} />
                  <SortableTh field="currency" label="Currency" sortField={purchaseSortField} sortDir={purchaseSortDir} onSort={togglePurchaseSort} />
                  <SortableTh field="unitOfMeasure" label="Unit of Measure" sortField={purchaseSortField} sortDir={purchaseSortDir} onSort={togglePurchaseSort} />
                  <SortableTh field="quantity" label="Quantity" sortField={purchaseSortField} sortDir={purchaseSortDir} onSort={togglePurchaseSort} />
                  <SortableTh field="price" label="Price" sortField={purchaseSortField} sortDir={purchaseSortDir} onSort={togglePurchaseSort} />
                  <SortableTh field="status" label="Status" sortField={purchaseSortField} sortDir={purchaseSortDir} onSort={togglePurchaseSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedPurchases.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEditPurchase(p)}>
                    <td className="px-4 py-1.5 text-gray-900">{p.vendorName ?? '—'}</td>
                    <td className="px-4 py-1.5 text-gray-600">{p.currency}</td>
                    <td className="px-4 py-1.5 text-gray-600">{p.unitOfMeasure}</td>
                    <td className="px-4 py-1.5 text-gray-600">{p.quantity}</td>
                    <td className="px-4 py-1.5 text-gray-600">{p.price.toFixed(2)}</td>
                    <td className="px-4 py-1.5">
                      <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${purchaseStatusStyles[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {purchases.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No purchases yet</div>}
            {purchases.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
                <span>Page {purchasePage} of {purchaseTotalPages} · {purchases.length} total purchases</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPurchasePage((p) => Math.max(1, p - 1))}
                    disabled={purchasePage <= 1}
                    title="Previous page"
                    className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setPurchasePage((p) => Math.min(purchaseTotalPages, p + 1))}
                    disabled={purchasePage >= purchaseTotalPages}
                    title="Next page"
                    className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <AuditHistoryTable entity="Product" entityId={id!} />
        )}
      </div>

      {showPurchaseModal && (
        <Modal title={editingPurchase ? 'Edit Purchase' : 'New Purchase'} onClose={() => setShowPurchaseModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <LookupField
                value={purchaseForm.vendorId}
                valueLabel={purchaseForm.vendorLabel}
                endpoint="/vendors"
                recordPath="/inventory/vendors"
                onChange={(vendorId, item) => setPurchaseForm((f) => ({ ...f, vendorId, vendorLabel: (item?.name as string) ?? null }))}
                placeholder="Search vendors..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={purchaseForm.currency}
                  onChange={(e) => setPurchaseField('currency', e.target.value)}
                >
                  {currencyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={purchaseForm.unitOfMeasure}
                  onChange={(e) => setPurchaseField('unitOfMeasure', e.target.value)}
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseField('quantity', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={purchaseForm.price}
                  onChange={(e) => setPurchaseField('price', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={purchaseForm.status}
                onChange={(e) => setPurchaseField('status', e.target.value)}
              >
                {purchaseStatusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {purchaseSaveError && <p className="text-sm text-red-600">{purchaseSaveError}</p>}
            <div className="flex justify-between items-center pt-2">
              {editingPurchase ? (
                <button onClick={() => { setShowPurchaseModal(false); deletePurchase(editingPurchase) }} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button onClick={savePurchase} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

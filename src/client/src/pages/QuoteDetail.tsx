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
  ToolbarButton, RecordHeader, StatusPill, ProgressStepper,
  SectionCard, InfoRow, InfoField, VersionPill, DiscountPill, LinkCell, TotalsPanel,
  IconDoc, IconCart,
} from '../components/DetailChrome'
import { useLocalSort } from '../hooks/useLocalSort'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface LineItem { key: string; productId: string | null; productLabel: string | null; productNumber: string | null; description: string; quantity: string; unitPrice: string; discount: string }

interface AddressDto {
  addressLine1?: string; addressLine2?: string; addressLine3?: string
  county?: string; province?: string; country?: string; postalCode?: string
}

interface Quote {
  id: string; quoteNumber: string; accountId: string; accountName: string
  accountPhone?: string | null; accountEmail?: string | null; accountAddress?: AddressDto | null
  status: string; version: number; isActive: boolean; validUntil?: string | null; notes?: string
  taxRate: number; discount: number; subtotal: number; tax: number; total: number; createdAt: string
  documentGeneratedAt?: string | null
  sentToCustomerAt?: string | null
  approvedAt?: string | null
  quoteTemplateId?: string | null; quoteTemplateName?: string | null
  orderId?: string | null; orderNumber?: string | null
  lineItems: { id: string; productId?: string | null; productNumber?: string | null; productName?: string | null; description: string; quantity: number; unitPrice: number; discount: number; total: number }[]
  ownerId?: string | null; ownerName?: string
  ownerTeamId?: string | null; ownerTeamName?: string
}

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }
interface QuoteTemplateSummary { id: string; name: string; createdAt: string }
interface QuoteTemplateDetail {
  id: string; name: string; notes?: string | null; taxRate: number; discount: number
  lineItems: { productId?: string | null; productNumber?: string | null; productName?: string | null; description: string; quantity: number; unitPrice: number; discount: number }[]
}

const statusTones: Record<string, 'gray' | 'amber' | 'green' | 'red'> = {
  Draft: 'gray', Active: 'amber', Won: 'green', Cancelled: 'red',
}

const emptyLineForm = { productId: null as string | null, productLabel: null as string | null, productNumber: null as string | null, description: '', quantity: '1', unitPrice: '0', discount: '0' }

const empty = {
  accountId: '', validUntil: '', notes: '', taxRate: '0', discount: '0',
  ownerId: null as string | null, ownerTeamId: null as string | null,
  lines: [] as LineItem[],
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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

function IconDollar() {
  return (
    <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v14M13.5 6.5c0-1.4-1.6-2.5-3.5-2.5s-3.5 1-3.5 2.5S8 8.5 10 9s3.5 1.1 3.5 2.5-1.6 2.5-3.5 2.5-3.5-1.1-3.5-2.5" />
    </svg>
  )
}

function IconActivate() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor" stroke="none">
      <path d="M10.8 2.5L4.5 11.3h4l-1 6.2 6.9-9.4h-4.2l1-5.6z" />
    </svg>
  )
}

function IconRevise() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10a6 6 0 0110-4.5M16 10a6 6 0 01-10 4.5" />
      <path d="M14 3v3h-3M6 17v-3h3" />
    </svg>
  )
}

function IconCancel() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M6.5 13.5l7-7" />
    </svg>
  )
}

function IconSubmit() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l4 4L16 6" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3L2.5 9.2 9 11l1.8 6.5L17 3z" />
      <path d="M9 11l4.5-4.5" />
    </svg>
  )
}

function IconApprove() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 10l2.5 2.5L10.5 8" />
      <path d="M9 10l2.5 2.5L16 8" />
    </svg>
  )
}

function IconTemplate() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="14" height="14" rx="1.5" />
      <path d="M3 8h14M8 8v9" />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5h6l3 3v11a.5.5 0 01-.5.5h-8.5a.5.5 0 01-.5-.5v-13.5a.5.5 0 01.5-.5z" />
      <path d="M11.5 2.5v3h3" />
      <path d="M7 11h6M7 13.5h6M7 8.5h2" />
    </svg>
  )
}

export default function QuoteDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { user: me } = useAuth()
  const [quote, setQuote] = useState<Quote | null>(null)
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<QuoteTemplateSummary[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null)

  const loadQuote = () => api.get(`/quotes/${id}`).then((r) => {
    const q: Quote = r.data
    setQuote(q)
    setAccountLabel(q.accountName ?? null)
    setForm({
      accountId: q.accountId, validUntil: q.validUntil ? q.validUntil.slice(0, 10) : '',
      notes: q.notes ?? '', taxRate: q.taxRate.toString(), discount: q.discount.toString(),
      ownerId: q.ownerId ?? null, ownerTeamId: q.ownerTeamId ?? null,
      lines: q.lineItems.map((li, i) => ({
        key: `l${i}`, productId: li.productId ?? null, productLabel: li.productName ?? null, productNumber: li.productNumber ?? null,
        description: li.description, quantity: li.quantity.toString(), unitPrice: li.unitPrice.toString(),
        discount: li.discount.toString(),
      })),
    })
    setIsDirty(false)
  })

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  useEffect(() => {
    if (!isNew || !form.accountId) {
      setTemplates([])
      return
    }
    api.get('/quotetemplates', { params: { accountId: form.accountId } }).then((r) => setTemplates(r.data))
  }, [isNew, form.accountId])

  useEffect(() => {
    if (isNew) {
      const prefillAccountId = searchParams.get('accountId') ?? ''
      const prefillAccountName = searchParams.get('accountName')
      setQuote({
        id: '', quoteNumber: '', accountId: prefillAccountId, accountName: prefillAccountName ?? '', status: 'Draft', version: 1, isActive: true,
        validUntil: null, notes: '', taxRate: 0, discount: 0, subtotal: 0, tax: 0, total: 0, createdAt: new Date().toISOString(),
        lineItems: [], ownerId: me?.userId ?? null, ownerTeamId: null,
      })
      setAccountLabel(prefillAccountName)
      setForm({ ...empty, accountId: prefillAccountId, ownerId: me?.userId ?? null })
      setIsDirty(false)
      return
    }
    loadQuote()
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
    setLineForm({ productId: l.productId, productLabel: l.productLabel, productNumber: l.productNumber, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })
    setLineFormError(null)
    setShowLineModal(true)
  }
  const setLineFormField = (k: string, v: string | null) => setLineForm((f) => ({ ...f, [k]: v }))
  const wholeNumber = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
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

  const lineTotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100)
  const lineFormTotal = (parseFloat(lineForm.quantity) || 0) * (parseFloat(lineForm.unitPrice) || 0) * (1 - (parseFloat(lineForm.discount) || 0) / 100)
  const itemsDiscount = form.lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0) * (parseFloat(l.discount) || 0) / 100, 0)
  const subtotal = form.lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const discountAmount = parseFloat(form.discount) || 0
  const totalDiscount = itemsDiscount + discountAmount
  const discountedSubtotal = subtotal - discountAmount
  const taxAmount = discountedSubtotal * (parseFloat(form.taxRate) || 0) / 100
  const grandTotal = discountedSubtotal + taxAmount

  const buildPayload = (isActive: boolean) => ({
    accountId: form.accountId, contactId: null, isActive,
    notes: form.notes, taxRate: parseFloat(form.taxRate) || 0,
    discount: parseFloat(form.discount) || 0,
    ownerId: form.ownerId, ownerTeamId: form.ownerTeamId,
    quoteTemplateId: isNew ? selectedTemplateId : undefined,
    lineItems: form.lines
      .filter((l) => l.description.trim())
      .map((l) => ({ productId: l.productId, description: l.description, quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0, discount: parseFloat(l.discount) || 0 })),
  })

  const save = async () => {
    try {
      if (isNew) {
        const res = await api.post('/quotes', buildPayload(true))
        setSaveError(null)
        setIsDirty(false)
        navigate(`/sales/quotes/${res.data.id}`, { replace: true })
        return
      }
      await api.put(`/quotes/${id}`, buildPayload(quote?.isActive ?? true))
      setSaveError(null)
      await loadQuote()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Failed to save quote.'
      setSaveError(message)
      throw err
    }
  }
  const runAction = async (action: string) => {
    try {
      await api.put(`/quotes/${id}/${action}`)
      setSaveError(null)
      await loadQuote()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Action failed.'
      setSaveError(message)
    }
  }
  const activateQuote = () => runAction('activate')
  const reviseQuote = () => runAction('revise')
  const markSent = () => runAction('mark-sent')
  const markApproved = () => runAction('mark-approved')
  const submitOrder = () => runAction('submit')
  const cancelQuote = () => setShowCancelConfirm(true)
  const confirmCancelQuote = () => {
    setShowCancelConfirm(false)
    runAction('cancel')
  }

  const applyTemplate = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId(null)
      return
    }
    const t: QuoteTemplateDetail = (await api.get(`/quotetemplates/${templateId}`)).data
    setSelectedTemplateId(t.id)
    setForm((f) => ({
      ...f,
      notes: t.notes ?? f.notes,
      taxRate: t.taxRate.toString(),
      discount: t.discount.toString(),
      lines: t.lineItems.map((li, i) => ({
        key: `t${i}${crypto.randomUUID()}`, productId: li.productId ?? null, productLabel: li.productName ?? null,
        productNumber: li.productNumber ?? null, description: li.description,
        quantity: li.quantity.toString(), unitPrice: li.unitPrice.toString(), discount: li.discount.toString(),
      })),
    }))
    setIsDirty(true)
    setSaveError(null)
  }

  const openSaveAsTemplate = () => {
    setTemplateName(quote ? `${quote.quoteNumber} Template` : '')
    setTemplateSaveError(null)
    setShowSaveTemplateModal(true)
  }
  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      setTemplateSaveError('Template name is required.')
      return
    }
    try {
      await api.post('/quotetemplates', {
        name: templateName.trim(), accountId: form.accountId, notes: form.notes,
        taxRate: parseFloat(form.taxRate) || 0, discount: parseFloat(form.discount) || 0,
        lineItems: form.lines
          .filter((l) => l.description.trim())
          .map((l) => ({ productId: l.productId, description: l.description, quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0, discount: parseFloat(l.discount) || 0 })),
      })
      setShowSaveTemplateModal(false)
    } catch (err) {
      setTemplateSaveError(axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save template.')
    }
  }

  const generateDocument = async () => {
    if (!quote) return
    setDocumentError(null)
    try {
      const res = await api.get(`/quotes/${id}/document`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      setDocumentUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      setShowDocumentModal(true)
      if (!quote.documentGeneratedAt) await loadQuote()
    } catch {
      setDocumentError('Failed to generate document.')
      setShowDocumentModal(true)
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
    discount: (l) => parseFloat(l.discount) || 0,
    total: (l) => lineTotal(l),
  })

  if (!quote) return null

  const salesAccess = getAccessLevel(me, 'sales')
  const isOwner = isNew || quote.ownerId === me?.userId
  const noAccess = salesAccess === 'ReadOnly' || (salesAccess === 'UserLevel' && !isOwner)
  const readOnly = (!isNew && quote.status !== 'Draft') || noAccess
  const displayName = isNew ? 'New Quote' : `${quote.quoteNumber}-${quote.version}`
  const saveDisabled = readOnly || !form.accountId || (!isNew && !isDirty)
  const showTemplateField = (isNew && !!form.accountId && templates.length > 0) || (!isNew && !!quote.quoteTemplateId)

  const canAct = !isNew && !noAccess
  const canActivate = canAct && quote.status === 'Draft' && !isDirty && quote.lineItems.length > 0
  const progressStages = [
    { key: 'draft', label: 'New' },
    { key: 'activate', label: 'Activate' },
    { key: 'document', label: 'Document Generate' },
    { key: 'sent', label: 'Sent to Customer' },
    { key: 'approved', label: 'Confirmed' },
    { key: 'submit', label: 'Submit Order' },
  ]
  const progressReached = [
    !isNew,
    quote.status !== 'Draft',
    !!quote.documentGeneratedAt,
    !!quote.sentToCustomerAt,
    !!quote.approvedAt,
    quote.status === 'Won',
  ]
  const progressActions: (null | { enabled: boolean; onClick: () => void })[] = [
    null,
    { enabled: canActivate, onClick: activateQuote },
    { enabled: canAct && quote.status === 'Active' && !quote.documentGeneratedAt, onClick: generateDocument },
    { enabled: canAct && quote.status === 'Active' && !!quote.documentGeneratedAt && !quote.sentToCustomerAt, onClick: markSent },
    { enabled: canAct && quote.status === 'Active' && !!quote.sentToCustomerAt && !quote.approvedAt, onClick: markApproved },
    { enabled: canAct && quote.status === 'Active' && !!quote.approvedAt, onClick: submitOrder },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <RecordHeader
          icon={<IconDollar />}
          iconBg="bg-emerald-600"
          title={displayName}
          subtitle={`Quote · Account ${isNew ? 'Unsaved' : quote.accountName}`}
          badge={<StatusPill label={quote.status} tone={statusTones[quote.status] ?? 'gray'} />}
          flush
          onBack={() => guardedNavigate(-1)}
          toolbar={
            <>
              {salesAccess !== 'ReadOnly' && <ToolbarButton size="sm" icon={<IconNew />} label="New" onClick={() => guardedNavigate('/sales/quotes/new')} />}
              {canActivate && <ToolbarButton size="sm" variant="primary" icon={<IconActivate />} label="Activate" onClick={activateQuote} />}
              {!isNew && !noAccess && quote.status === 'Active' && <ToolbarButton size="sm" icon={<IconRevise />} label="Revise" onClick={reviseQuote} />}
              {!isNew && !noAccess && (quote.status === 'Draft' || quote.status === 'Active') && <ToolbarButton size="sm" icon={<IconCancel />} label="Cancel" onClick={cancelQuote} />}
              {!isNew && quote.status === 'Active' && (
                <ToolbarButton size="sm" variant="primary" icon={<IconDocument />} label={quote.documentGeneratedAt ? 'View Document' : 'Generate Document'} onClick={generateDocument} />
              )}
              {!isNew && !noAccess && quote.status === 'Active' && !!quote.documentGeneratedAt && !quote.sentToCustomerAt && (
                <ToolbarButton size="sm" icon={<IconSend />} label="Send to Customer" onClick={markSent} />
              )}
              {!isNew && !noAccess && quote.status === 'Active' && !!quote.sentToCustomerAt && !quote.approvedAt && (
                <ToolbarButton size="sm" icon={<IconApprove />} label="Confirm" onClick={markApproved} />
              )}
              {!isNew && !noAccess && quote.status === 'Active' && !!quote.approvedAt && <ToolbarButton size="sm" icon={<IconSubmit />} label="Submit Order" onClick={submitOrder} />}
              {!isNew && !noAccess && <ToolbarButton size="sm" icon={<IconTemplate />} label="Save as Template" onClick={openSaveAsTemplate} />}
              <ToolbarButton
                size="sm"
                icon={<IconSave />}
                label={isDirty ? 'Save*' : 'Save'}
                onClick={save}
                disabled={saveDisabled}
                variant="primary"
                title={noAccess ? 'You do not have edit access to this record' : readOnly ? `Quote is ${quote.status.toLowerCase()}` : !isNew && !isDirty ? 'No changes to save' : !form.accountId ? 'Account is required' : 'Save'}
              />
            </>
          }
          metrics={[
            ...(isNew ? [] : [{ label: 'Created', content: <div className="text-sm font-medium text-gray-900">{formatDate(quote.createdAt)}</div> }]),
            {
              label: 'Owner', content: (
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  ownerName={quote.ownerName}
                  ownerTeamName={quote.ownerTeamName}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  readOnly={readOnly || salesAccess === 'UserLevel'}
                  className="text-sm font-medium text-gray-900 bg-transparent text-right rounded hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  title="Select Quote Owner"
                />
              ),
            },
          ]}
        />

        {!isNew && <ProgressStepper stages={progressStages} reached={progressReached} actions={progressActions} />}
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
          <AuditHistoryTable entity="Quote" entityId={id!} />
        ) : (
        <div className="grid grid-cols-12 gap-3 items-start">
          <div className="col-span-10 space-y-3">
            <SectionCard icon={<IconDoc />} title="Quote information">
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
                        setSelectedTemplateId(null)
                        setIsDirty(true)
                        setSaveError(null)
                      }}
                      placeholder="Search accounts..."
                      className="w-full border border-gray-200 rounded-lg pl-2.5 pr-9 py-1.5 text-sm bg-control focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                    />
                  </InfoField>
                  <InfoField size="md" label="Valid until">
                    {isNew ? '—' : formatDate(form.validUntil || quote.createdAt)}
                  </InfoField>
                </InfoRow>
                {showTemplateField && (
                  <InfoRow>
                    <InfoField size="md" label="Template">
                      {isNew && form.accountId && templates.length > 0 ? (
                        <select
                          value={selectedTemplateId ?? ''}
                          onChange={(e) => applyTemplate(e.target.value)}
                          className="w-full text-sm font-normal text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          <option value="">Start from scratch</option>
                          {templates.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      ) : quote.quoteTemplateName ?? '—'}
                    </InfoField>
                    {!isNew && (
                      <InfoField size="md" label="Version">
                        <VersionPill label={`v${quote.version}`} />
                      </InfoField>
                    )}
                  </InfoRow>
                )}
                {!isNew && quote.orderId && quote.orderNumber && (
                  <InfoRow>
                    <InfoField size="md" label="Order">
                      <LinkCell to={`/sales/orders/${quote.orderId}`}>{quote.orderNumber}</LinkCell>
                    </InfoField>
                  </InfoRow>
                )}
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
                  <InfoField size="md" label="Add'l disc.">
                    {readOnly ? `$${form.discount || '0'}` : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                        <input
                          value={form.discount}
                          onChange={(e) => set('discount', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg pl-6 pr-3 py-1.5 text-sm text-blue-600 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    )}
                  </InfoField>
                </InfoRow>
                {saveError && <div className="px-5 py-2 text-sm text-red-600">{saveError}</div>}
              </div>
            </SectionCard>

            <SectionCard
              icon={<IconCart />}
              title="Line items"
              action={!readOnly && !isNew && (
                <button onClick={openCreateLine} title="New line item" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50">+</button>
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
                      <SortableTh field="discount" label="Disc %" sortField={lineSortField} sortDir={lineSortDir} onSort={toggleLineSort} className="w-24" />
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
                        <td className="px-4 py-2.5"><DiscountPill value={parseFloat(l.discount) || 0} /></td>
                        <td className="px-4 py-2.5 text-gray-900 font-medium">${lineTotal(l).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {form.lines.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {isNew ? 'Save the quote to add line items' : 'No line items yet'}
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
                { label: 'Items discount', value: `-$${itemsDiscount.toFixed(2)}`, negative: itemsDiscount > 0, muted: itemsDiscount === 0 },
                { label: 'Additional discount', value: `-$${discountAmount.toFixed(2)}`, negative: discountAmount > 0, muted: discountAmount === 0 },
                { label: 'Total discount', value: `-$${totalDiscount.toFixed(2)}`, negative: totalDiscount > 0, muted: totalDiscount === 0 },
                { label: `Tax (${form.taxRate || '0'}%)`, value: `$${taxAmount.toFixed(2)}`, muted: taxAmount === 0 },
              ]}
              total={`$${grandTotal.toFixed(2)}`}
            />
          </div>
        </div>
        )}
      </div>

      {showLineModal && (
        <Modal title={editingLineKey ? 'Edit Line Item' : 'New Line Item'} onClose={() => setShowLineModal(false)}>
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
            <div className="grid grid-cols-3 gap-3">
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
                    readOnly
                    className="w-full border rounded-lg pl-6 pr-3 py-2 text-sm bg-control text-gray-500 focus:outline-none"
                    value={lineForm.unitPrice}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={lineForm.discount}
                  onChange={(e) => setLineFormField('discount', wholeNumber(e.target.value))}
                />
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
                <button onClick={saveLine} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showSaveTemplateModal && (
        <Modal title="Save as Template" onClose={() => setShowSaveTemplateModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Save this quote's line items and settings as a reusable template for {quote.accountName}.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            {templateSaveError && <p className="text-sm text-red-600">{templateSaveError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowSaveTemplateModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={saveAsTemplate} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Template</button>
            </div>
          </div>
        </Modal>
      )}

      {showCancelConfirm && (
        <Modal title="Cancel Quote" onClose={() => setShowCancelConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Cancel this quote? Once cancelled, it cannot be revised.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 text-sm border rounded-lg">Keep Quote</button>
              <button onClick={confirmCancelQuote} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Cancel Quote</button>
            </div>
          </div>
        </Modal>
      )}

      {showDocumentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowDocumentModal(false)
            setDocumentUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Quote Document</h3>
              <button
                onClick={() => {
                  setShowDocumentModal(false)
                  setDocumentUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
                }}
                className="text-gray-400 hover:text-gray-600 text-sm leading-none"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {documentError ? (
                <p className="p-6 text-sm text-red-600">{documentError}</p>
              ) : documentUrl ? (
                <iframe src={`${documentUrl}#toolbar=0&navpanes=0&view=FitH`} title="Quote Document" className="w-full h-full border-0" />
              ) : (
                <p className="p-6 text-sm text-gray-500">Loading…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

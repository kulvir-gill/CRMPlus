import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import Modal from '../components/Modal'
import OwnerPicker from '../components/OwnerPicker'
import AuditHistoryTable from '../components/AuditHistoryTable'
import SortableTh from '../components/SortableTh'
import { ToolbarButton, RecordHeader, StatusPill, InfoRow, InfoField } from '../components/DetailChrome'
import { useLocalSort } from '../hooks/useLocalSort'
import { usePagination } from '../hooks/usePagination'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface AddressDto {
  addressLine1?: string; addressLine2?: string; addressLine3?: string
  county?: string; province?: string; country?: string; postalCode?: string
}

interface AccountAddressDto extends AddressDto {
  id: string; addressType: string[]
}

interface Account {
  id: string; accountNumber: string; name: string; phone?: string; email?: string
  industry?: string; taxRate: number; auditEnabled: boolean; isActive: boolean
  contactCount: number; activityCount: number; createdAt: string
  primaryContactId?: string | null; primaryContactName?: string
  ownerId?: string | null; ownerName?: string
  ownerTeamId?: string | null; ownerTeamName?: string
  primaryAddress?: AddressDto | null
  addresses: AccountAddressDto[]
}

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }

interface Contact {
  id: string; firstName: string; lastName: string; email?: string; phone?: string; title?: string
  accountId?: string | null; accountName?: string; auditEnabled?: boolean
  ownerId?: string | null; ownerTeamId?: string | null
}

interface Activity {
  id: string; type: string; subject: string; body?: string; direction?: string; userName: string; createdAt: string
}

interface Quote {
  id: string; quoteNumber: string; version: number; status: string; total: number
  validUntil?: string | null; createdAt: string; ownerName?: string; ownerTeamName?: string
}

const quoteStatusStyles: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700', Active: 'bg-amber-100 text-amber-700',
  Won: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700',
}

interface Order {
  id: string; orderNumber: string; quoteNumber?: string | null; isActive: boolean; total: number
  createdAt: string; ownerName?: string; ownerTeamName?: string
}

const emptyAddress = { addressLine1: '', addressLine2: '', addressLine3: '', county: '', province: '', country: '', postalCode: '' }
const empty = { name: '', phone: '', email: '', industry: '', taxRate: '0', auditEnabled: false, primaryContactId: null as string | null, ownerId: null as string | null, ownerTeamId: null as string | null, primaryAddress: emptyAddress, addresses: [] as AddressItem[] }
const emptyContact = { firstName: '', lastName: '', email: '', phone: '', title: '' }

const addressTypes = ['Mailing', 'Billing', 'Shipping', 'Other']

interface AddressItem {
  key: string; addressType: string[]
  addressLine1: string; addressLine2: string; addressLine3: string
  county: string; province: string; country: string; postalCode: string
}

function newAddressItem(key: string): AddressItem {
  return { key, addressType: [], addressLine1: '', addressLine2: '', addressLine3: '', county: '', province: '', country: '', postalCode: '' }
}

const avatarPalette = [
  'bg-gradient-to-br from-blue-600 to-blue-400',
  'bg-gradient-to-br from-emerald-600 to-emerald-500',
  'bg-gradient-to-br from-slate-700 to-slate-500',
  'bg-gradient-to-br from-amber-600 to-amber-400',
  'bg-gradient-to-br from-indigo-600 to-indigo-400',
  'bg-gradient-to-br from-rose-600 to-rose-400',
]

function formatCompactCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function avatarColor(seed: string) {
  const code = seed.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return avatarPalette[code % avatarPalette.length]
}

function addressSummary(a: AddressItem) {
  return [a.addressLine1, a.province || a.county, a.country].filter(Boolean).join(', ') || '—'
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

function IconPhone() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
      <path d="M5.2 3.5h2.3l1 3-1.6 1.3a8 8 0 004.3 4.3l1.3-1.6 3 1v2.3a1.5 1.5 0 01-1.6 1.5A12.5 12.5 0 013.7 5.1a1.5 1.5 0 011.5-1.6z" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 11.5l3-3" />
      <path d="M9 6.5l1-1a2.8 2.8 0 014 4l-1 1" />
      <path d="M11 13.5l-1 1a2.8 2.8 0 01-4-4l1-1" />
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  )
}

function IconChevron({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 7.5l4.5 5 4.5-5" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="12" rx="1.5" />
      <path d="M2.5 5l7.5 5 7.5-5" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 5l5 5-5 5" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg viewBox="0 0 20 20" className="w-3 h-3 text-amber-500" fill="currentColor">
      <path d="M10 1.7l2.5 5.4 5.8.8-4.2 4.1 1 5.8L10 15l-5.1 2.8 1-5.8-4.2-4.1 5.8-.8z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5v-1.7a3.3 3.3 0 00-3.3-3.3H4.8a3.3 3.3 0 00-3.3 3.3v1.7" />
      <circle cx="7.7" cy="6.2" r="3.3" />
      <path d="M19.2 17.5v-1.7a3.3 3.3 0 00-2.5-3.2" />
      <path d="M12.7 3.1a3.3 3.3 0 010 6.2" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 8.3c0 5.8-7.5 10-7.5 10s-7.5-4.2-7.5-10a7.5 7.5 0 0115 0z" />
      <circle cx="10" cy="8.3" r="2.5" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8.3" />
      <path d="M10 5v5l3.3 1.7" />
    </svg>
  )
}

function IconTrend() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 2.5v15h15" />
      <path d="m15.8 7.5-4.2 4.2-3.3-3.3-2.5 2.5" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.7 1.7H8.3a1.7 1.7 0 00-1.6 1.6H5a1.7 1.7 0 00-1.7 1.7v11.7A1.7 1.7 0 005 18.3h10a1.7 1.7 0 001.7-1.6V5A1.7 1.7 0 0015 3.3h-1.7a1.7 1.7 0 00-1.6-1.6z" />
    </svg>
  )
}

function IconLogNote() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 16.7h7.5M13.75 3a1.77 1.77 0 012.5 2.5L5.8 16 2.5 17l1-3.3z" />
    </svg>
  )
}

function IconPlusSmall() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  )
}

function IconQuoteMini() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v16M13.5 5.5H8a3 3 0 000 6h4a3 3 0 010 6H6" />
    </svg>
  )
}

function IconOrderMini() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 3h1.7l.3 1.7M6 11h8.3l3.3-6.7H4.5" />
      <circle cx="7.5" cy="16.7" r="1.2" />
      <circle cx="14" cy="16.7" r="1.2" />
    </svg>
  )
}


export default function AccountDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { user: me } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<'All' | 'Draft' | 'Active' | 'Won' | 'Cancelled'>('All')
  const [orders, setOrders] = useState<Order[]>([])
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All')
  const [users, setUsers] = useState<UserOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [note, setNote] = useState('')
  const [composerType, setComposerType] = useState<'Note' | 'Email'>('Note')
  const [activityFilter, setActivityFilter] = useState<'All' | 'Notes' | 'Emails' | 'System'>('All')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailDirection, setEmailDirection] = useState<'Sent' | 'Received'>('Sent')
  const [tab, setTab] = useState<'summary' | 'quotes' | 'orders' | 'audit'>('summary')
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactForm, setContactForm] = useState(emptyContact)
  const [contactSaveError, setContactSaveError] = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkCandidates, setLinkCandidates] = useState<Contact[]>([])
  const [pcQuery, setPcQuery] = useState('')
  const [pcOpen, setPcOpen] = useState(false)
  const [pcEditing, setPcEditing] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [addressDraft, setAddressDraft] = useState<AddressItem>(newAddressItem('draft'))
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const noteInputRef = useRef<HTMLTextAreaElement>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!typeDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) setTypeDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [typeDropdownOpen])

  const loadAccount = () => api.get(`/accounts/${id}`).then((r) => {
    const a: Account = r.data
    setAccount(a)
    setForm({
      name: a.name, phone: a.phone ?? '', email: a.email ?? '',
      industry: a.industry ?? '', taxRate: a.taxRate.toString(),
      auditEnabled: a.auditEnabled, primaryContactId: a.primaryContactId ?? null, ownerId: a.ownerId ?? null, ownerTeamId: a.ownerTeamId ?? null,
      primaryAddress: {
        addressLine1: a.primaryAddress?.addressLine1 ?? '', addressLine2: a.primaryAddress?.addressLine2 ?? '',
        addressLine3: a.primaryAddress?.addressLine3 ?? '', county: a.primaryAddress?.county ?? '',
        province: a.primaryAddress?.province ?? '', country: a.primaryAddress?.country ?? '',
        postalCode: a.primaryAddress?.postalCode ?? '',
      },
      addresses: (a.addresses ?? []).map((addr) => ({
        key: String(addr.id), addressType: addr.addressType ?? [],
        addressLine1: addr.addressLine1 ?? '', addressLine2: addr.addressLine2 ?? '', addressLine3: addr.addressLine3 ?? '',
        county: addr.county ?? '', province: addr.province ?? '', country: addr.country ?? '', postalCode: addr.postalCode ?? '',
      })),
    })
    setIsDirty(false)
  })

  const loadActivities = () => api.get('/activities', { params: { accountId: id } }).then((r) => setActivities(r.data))
  const loadContacts = () => api.get('/contacts', { params: { accountId: id, pageSize: 1000 } }).then((r) => setContacts(r.data.items))
  const loadQuotes = () => api.get('/quotes', { params: { accountId: id, pageSize: 1000 } }).then((r) => setQuotes(r.data.items))
  const loadOrders = () => api.get('/orders', { params: { accountId: id, pageSize: 1000 } }).then((r) => setOrders(r.data.items))

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  useEffect(() => {
    if (isNew) {
      setAccount({
        id: '', accountNumber: '', name: '', phone: '', email: '', industry: '', taxRate: 0,
        auditEnabled: false, isActive: true, contactCount: 0, activityCount: 0, createdAt: new Date().toISOString(),
        primaryContactId: null, ownerId: me?.userId ?? null, ownerTeamId: null, primaryAddress: null, addresses: [],
      })
      setForm({ ...empty, ownerId: me?.userId ?? null })
      setContacts([])
      setActivities([])
      setQuotes([])
      setOrders([])
      setIsDirty(false)
      return
    }
    loadAccount()
    loadContacts()
    loadActivities()
    loadQuotes()
    loadOrders()
  }, [id])

  const openCreateContact = () => { setContactForm(emptyContact); setContactSaveError(null); setShowContactModal(true) }
  const saveContact = async () => {
    try {
      await api.post('/contacts', { ...contactForm, accountId: id })
      setContactSaveError(null)
      setShowContactModal(false)
      loadContacts()
    } catch (err) {
      setContactSaveError(axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save contact.')
    }
  }
  const setContactField = (k: string, v: string) => setContactForm((f) => ({ ...f, [k]: v }))

  const openLinkModal = () => {
    setLinkSearch('')
    setShowLinkModal(true)
    api.get('/contacts', { params: { pageSize: 1000 } }).then((r) => setLinkCandidates(r.data.items))
  }
  const linkContact = async (c: Contact) => {
    await api.put(`/contacts/${c.id}`, {
      firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, title: c.title,
      accountId: id, auditEnabled: c.auditEnabled ?? false, ownerId: c.ownerId, ownerTeamId: c.ownerTeamId,
    })
    setShowLinkModal(false)
    loadContacts()
  }
  const removeAssociation = async (c: Contact) => {
    if (!confirm(`Remove ${c.firstName} ${c.lastName} from this account?`)) return
    await api.put(`/contacts/${c.id}`, {
      firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, title: c.title,
      accountId: null, auditEnabled: c.auditEnabled ?? false, ownerId: c.ownerId, ownerTeamId: c.ownerTeamId,
    })
    if (form.primaryContactId === c.id) set('primaryContactId', null)
    loadContacts()
  }

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

  const setAddr = (k: string, v: string) => {
    setForm((f) => ({ ...f, primaryAddress: { ...f.primaryAddress, [k]: v } }))
    setIsDirty(true)
  }

  const removeAddress = (key: string) => {
    setForm((f) => ({ ...f, addresses: f.addresses.filter((a) => a.key !== key) }))
    setIsDirty(true)
  }

  const openAddressModal = () => { setAddressDraft(newAddressItem('draft')); setTypeDropdownOpen(false); setShowAddressModal(true) }
  const setDraftField = (field: string, value: string | string[]) => setAddressDraft((d) => ({ ...d, [field]: value }))
  const toggleDraftType = (t: string) => {
    setAddressDraft((d) => ({
      ...d,
      addressType: d.addressType.includes(t) ? d.addressType.filter((x) => x !== t) : [...d.addressType, t],
    }))
  }
  const saveAddressDraft = () => {
    setForm((f) => ({ ...f, addresses: [...f.addresses, { ...addressDraft, key: crypto.randomUUID() }] }))
    setIsDirty(true)
    setShowAddressModal(false)
  }

  const save = async () => {
    const hasAddress = Object.values(form.primaryAddress).some((v) => v.trim() !== '')
    const addresses = form.addresses.map(({ key, ...rest }) => rest)
    try {
      if (isNew) {
        const res = await api.post('/accounts', { ...form, taxRate: parseFloat(form.taxRate) || 0, primaryAddress: hasAddress ? form.primaryAddress : null, addresses, isActive: true })
        setSaveError(null)
        setIsDirty(false)
        navigate(`/crm/accounts/${res.data.id}`, { replace: true })
        return
      }
      await api.put(`/accounts/${id}`, { ...form, taxRate: parseFloat(form.taxRate) || 0, primaryAddress: hasAddress ? form.primaryAddress : null, addresses, isActive: account?.isActive ?? true })
      setSaveError(null)
      await loadAccount()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Failed to save account.'
      setSaveError(message)
      throw err
    }
  }

  const toggleActive = async () => {
    if (!account) return
    const hasAddress = Object.values(form.primaryAddress).some((v) => v.trim() !== '')
    const addresses = form.addresses.map(({ key, ...rest }) => rest)
    await api.put(`/accounts/${id}`, { ...form, taxRate: parseFloat(form.taxRate) || 0, primaryAddress: hasAddress ? form.primaryAddress : null, addresses, isActive: !account.isActive })
    await loadAccount()
  }

  useEffect(() => {
    setDirty(isDirty)
  }, [isDirty, setDirty])

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  useEffect(() => () => setDirty(false), [setDirty])

  const postActivity = async () => {
    if (composerType === 'Note') {
      if (!note.trim()) return
      await api.post('/activities', { type: 0, subject: 'Note', body: note, direction: null, accountId: id, contactId: null })
    } else {
      if (!emailSubject.trim()) return
      await api.post('/activities', {
        type: 1, subject: emailSubject, body: note,
        direction: emailDirection === 'Sent' ? 0 : 1,
        accountId: id, contactId: null,
      })
      setEmailSubject('')
    }
    setNote('')
    loadActivities()
  }

  useEffect(() => {
    if (pcOpen) return
    const c = contacts.find((x) => x.id === form.primaryContactId)
    setPcQuery(c ? `${c.firstName} ${c.lastName}` : '')
  }, [contacts, form.primaryContactId, pcOpen])

  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'All') return true
    if (activityFilter === 'Notes') return act.type === 'Note'
    if (activityFilter === 'Emails') return act.type === 'Email'
    return act.type !== 'Note' && act.type !== 'Email'
  })

  const recentRecords = [
    ...quotes.map((q) => ({ kind: 'quote' as const, id: q.id, label: `${q.quoteNumber}-${q.version}`, sub: `${q.status} · $${q.total.toFixed(2)}`, createdAt: q.createdAt })),
    ...orders.map((o) => ({ kind: 'order' as const, id: o.id, label: o.orderNumber, sub: `${o.isActive ? 'Active' : 'Inactive'} · $${o.total.toFixed(2)}`, createdAt: o.createdAt })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  const filteredQuotes = quotes.filter((q) => quoteStatusFilter === 'All' || q.status === quoteStatusFilter)
  const { sorted: sortedQuotes, sortField: quoteSortField, sortDir: quoteSortDir, toggleSort: toggleQuoteSort } = useLocalSort(filteredQuotes, {
    quoteNumber: (q) => q.quoteNumber,
    status: (q) => q.status,
    total: (q) => q.total,
    validUntil: (q) => q.validUntil ?? '',
    createdAt: (q) => q.createdAt,
    owner: (q) => q.ownerName ?? q.ownerTeamName ?? '',
  })
  const { page: quotePage, setPage: setQuotePage, totalPages: quoteTotalPages, pageItems: pagedQuotes } = usePagination(sortedQuotes, 20)

  const filteredOrders = orders.filter((o) => orderStatusFilter === 'All' || (orderStatusFilter === 'Active' ? o.isActive : !o.isActive))
  const { sorted: sortedOrders, sortField: orderSortField, sortDir: orderSortDir, toggleSort: toggleOrderSort } = useLocalSort(filteredOrders, {
    orderNumber: (o) => o.orderNumber,
    status: (o) => (o.isActive ? 1 : 0),
    total: (o) => o.total,
    createdAt: (o) => o.createdAt,
    owner: (o) => o.ownerName ?? o.ownerTeamName ?? '',
  })
  const { page: orderPage, setPage: setOrderPage, totalPages: orderTotalPages, pageItems: pagedOrders } = usePagination(sortedOrders, 20)

  if (!account) return null

  const crmAccess = getAccessLevel(me, 'crm')
  const isOwner = isNew || account.ownerId === me?.userId
  const noAccess = crmAccess === 'ReadOnly' || (crmAccess === 'UserLevel' && !isOwner)
  const readOnly = (!isNew && !account.isActive) || noAccess
  const primaryContact = contacts.find((c) => c.id === form.primaryContactId)
  const usedAddressTypes = new Set(form.addresses.flatMap((a) => a.addressType))
  const displayName = isNew ? (form.name || 'New Account') : account.name
  const saveDisabled = readOnly || !form.name.trim() || (!isNew && !isDirty)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <RecordHeader
          icon={<span className="text-sm font-semibold">{initials(displayName)}</span>}
          iconBg={avatarColor(displayName)}
          title={displayName}
          subtitle={`Account · ${isNew ? 'Unsaved' : `#${account.accountNumber}`}`}
          badge={<StatusPill label={account.isActive ? 'Active' : 'Inactive'} tone={account.isActive ? 'green' : 'gray'} />}
          flush
          onBack={() => guardedNavigate(-1)}
          toolbar={
            <>
              {crmAccess !== 'ReadOnly' && <ToolbarButton size="sm" icon={<IconNew />} label="New" onClick={() => guardedNavigate('/crm/accounts/new')} />}
              {!isNew && !noAccess && <ToolbarButton size="sm" icon={<IconPower />} label={account.isActive ? 'Deactivate' : 'Activate'} onClick={toggleActive} />}
              <ToolbarButton
                size="sm"
                icon={<IconSave />}
                label={isDirty ? 'Save*' : 'Save'}
                onClick={save}
                disabled={saveDisabled}
                variant="primary"
                title={noAccess ? 'You do not have edit access to this record' : readOnly ? 'Record is deactivated' : !isNew && !isDirty ? 'No changes to save' : 'Save'}
              />
            </>
          }
          metrics={[
            ...(isNew ? [] : [{ label: 'Created', content: <div className="text-sm font-medium text-gray-900">{formatDate(account.createdAt)}</div> }]),
            {
              label: 'Owner', content: (
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  ownerName={account.ownerName}
                  ownerTeamName={account.ownerTeamName}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  readOnly={readOnly || crmAccess === 'UserLevel'}
                  className="text-sm font-medium text-gray-900 bg-transparent text-right rounded hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  title="Select Account Owner"
                />
              ),
            },
            { label: 'Tax Rate', content: <div className="text-sm font-medium text-gray-900">{account.taxRate}%</div> },
          ]}
        />
      </div>

      <div className="flex gap-6 px-6 border-b border-gray-200 bg-transparent text-sm">
        {(isNew ? ([['summary', 'Summary']] as const) : ([['summary', 'Summary'], ['quotes', 'Quotes'], ['orders', 'Orders'], ['audit', 'Audit history']] as const)).map(([key, label]) => (
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
        {tab === 'summary' ? (
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-3 space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 shadow-card">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                  <IconUsers />
                  <span className="text-sm font-semibold text-gray-500">Account information</span>
                </div>
                <div>
                  <InfoRow>
                    <InfoField size="md" label="Name" required>
                      {readOnly ? form.name : (
                        <input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full bg-transparent focus:outline-none" />
                      )}
                    </InfoField>
                  </InfoRow>
                  <InfoRow><InfoField size="md" label="Account #">{account.accountNumber}</InfoField></InfoRow>
                  <InfoRow>
                    <InfoField size="md" full label="Phone">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        {readOnly ? <span className="font-mono truncate min-w-0">{form.phone || '—'}</span> : (
                          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="w-full min-w-0 bg-transparent focus:outline-none font-mono" />
                        )}
                        {form.phone && <a href={`tel:${form.phone}`} title="Call" className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600"><IconPhone /></a>}
                      </div>
                    </InfoField>
                  </InfoRow>
                  <InfoRow>
                    <InfoField size="md" full label="Email">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        {readOnly ? <span className="truncate min-w-0">{form.email || '—'}</span> : (
                          <input value={form.email} onChange={(e) => set('email', e.target.value)} className="w-full min-w-0 bg-transparent focus:outline-none" />
                        )}
                        {form.email && <a href={`mailto:${form.email}`} title="Send email" className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600"><IconMail /></a>}
                      </div>
                    </InfoField>
                  </InfoRow>
                  <InfoRow>
                    <InfoField size="md" label="Industry">
                      {readOnly ? (form.industry || <span className="text-gray-400 italic font-normal">Not set</span>) : (
                        <input value={form.industry} onChange={(e) => set('industry', e.target.value)} className="w-full bg-transparent focus:outline-none" />
                      )}
                    </InfoField>
                  </InfoRow>
                  <InfoRow>
                    <InfoField size="md" label="Tax rate">
                      {readOnly ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-mono font-semibold bg-emerald-50 text-emerald-700">{form.taxRate}%</span>
                      ) : (
                        <input value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} className="w-full bg-transparent focus:outline-none" />
                      )}
                    </InfoField>
                  </InfoRow>
                  {saveError && <div className="px-5 py-2 text-sm text-red-600">{saveError}</div>}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-card">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                  <IconMapPin />
                  <span className="text-sm font-semibold text-gray-500">Primary address</span>
                </div>
                {readOnly ? (
                  <div className="px-4 py-3 text-sm text-gray-700 space-y-0.5">
                    {form.primaryAddress.addressLine1 ? (
                      <>
                        <div className="font-semibold text-gray-900">{form.primaryAddress.addressLine1}</div>
                        {form.primaryAddress.addressLine2 && <div className="text-gray-600">{form.primaryAddress.addressLine2}</div>}
                        <div className="text-gray-600">{[form.primaryAddress.province || form.primaryAddress.county, form.primaryAddress.postalCode].filter(Boolean).join('  ')}</div>
                        {form.primaryAddress.country && <div className="text-gray-600">{form.primaryAddress.country}</div>}
                      </>
                    ) : <span className="text-gray-400 italic">No address on file</span>}
                  </div>
                ) : (
                  <div>
                    <InfoRow><InfoField size="md" label="Line 1"><input value={form.primaryAddress.addressLine1} onChange={(e) => setAddr('addressLine1', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField></InfoRow>
                    <InfoRow><InfoField size="md" label="Line 2"><input value={form.primaryAddress.addressLine2} onChange={(e) => setAddr('addressLine2', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField></InfoRow>
                    <InfoRow><InfoField size="md" label="Line 3"><input value={form.primaryAddress.addressLine3} onChange={(e) => setAddr('addressLine3', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField></InfoRow>
                    <InfoRow>
                      <InfoField size="md" label="County"><input value={form.primaryAddress.county} onChange={(e) => setAddr('county', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField>
                      <InfoField size="md" label="Province"><input value={form.primaryAddress.province} onChange={(e) => setAddr('province', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField>
                    </InfoRow>
                    <InfoRow>
                      <InfoField size="md" label="Country"><input value={form.primaryAddress.country} onChange={(e) => setAddr('country', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField>
                      <InfoField size="md" label="Postal code"><input value={form.primaryAddress.postalCode} onChange={(e) => setAddr('postalCode', e.target.value)} className="w-full bg-transparent focus:outline-none" /></InfoField>
                    </InfoRow>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                  <IconTrend />
                  <span className="text-sm font-semibold text-gray-500">At a glance</span>
                </div>
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  <div className="bg-white px-4 py-2.5">
                    <div className="font-mono text-sm font-bold text-gray-900">{quotes.filter((q) => q.status === 'Draft' || q.status === 'Active').length}</div>
                    <div className="text-sm font-semibold text-gray-400">Open quotes</div>
                  </div>
                  <div className="bg-white px-4 py-2.5">
                    <div className="font-mono text-sm font-bold text-gray-900">{orders.length}</div>
                    <div className="text-sm font-semibold text-gray-400">Orders</div>
                  </div>
                  <div className="bg-white px-4 py-2.5">
                    <div className="font-mono text-sm font-bold text-gray-900">{formatCompactCurrency(orders.reduce((sum, o) => sum + o.total, 0))}</div>
                    <div className="text-sm font-semibold text-gray-400">Total value</div>
                  </div>
                  <div className="bg-white px-4 py-2.5">
                    <div className="font-mono text-sm font-bold text-gray-900">{contacts.length}</div>
                    <div className="text-sm font-semibold text-gray-400">Contacts</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-6 bg-white rounded-xl border border-gray-200 shadow-card">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                <IconClock />
                <span className="text-sm font-semibold text-gray-500">Timeline</span>
                <button onClick={() => noteInputRef.current?.focus()} disabled={readOnly || isNew} title="Add" className="ml-auto w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                  <IconPlusSmall />
                </button>
              </div>
              <div className="p-3 border-b border-gray-100 bg-control space-y-2">
                <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setComposerType('Note')}
                    disabled={readOnly || isNew}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${composerType === 'Note' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                  >
                    <IconLogNote />Note
                  </button>
                  <button
                    onClick={() => setComposerType('Email')}
                    disabled={readOnly || isNew}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${composerType === 'Email' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
                  >
                    <IconMail />Email
                  </button>
                </div>
                {composerType === 'Email' && (
                  <div className="flex gap-2">
                    <input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject..."
                      disabled={readOnly || isNew}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <select
                      value={emailDirection}
                      onChange={(e) => setEmailDirection(e.target.value as 'Sent' | 'Received')}
                      disabled={readOnly || isNew}
                      className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="Sent">Sent</option>
                      <option value="Received">Received</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-2 items-start">
                  <textarea
                    ref={noteInputRef}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder={isNew ? 'Save the account to add activity' : composerType === 'Note' ? 'Write a note about this account...' : 'Email body...'}
                    disabled={readOnly || isNew}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <button onClick={postActivity} disabled={readOnly || isNew} className="px-3.5 h-9 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">Post</button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100">
                {(['All', 'Notes', 'Emails', 'System'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActivityFilter(f)}
                    className={`text-sm font-semibold px-2.5 py-1 rounded-full border ${activityFilter === f ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="max-h-[420px] overflow-y-auto px-4">
                {filteredActivities.map((act, i) => (
                  <div key={act.id} className="relative flex gap-3 py-3">
                    {i < filteredActivities.length - 1 && <div className="absolute left-4 top-11 bottom-0 w-px bg-gray-100" />}
                    <div className={`relative z-10 w-8 h-8 rounded-full ${avatarColor(act.userName)} text-white flex items-center justify-center text-sm font-semibold shrink-0`}>
                      {initials(act.userName) || act.type.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <span className={`w-4.5 h-4.5 rounded flex items-center justify-center ${act.type === 'Email' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'}`}>
                            {act.type === 'Email' ? <IconMail /> : <IconLogNote />}
                          </span>
                          {act.type} from {act.userName}
                        </span>
                        {act.direction && (
                          <span className="px-2 py-0.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700">
                            {act.direction}
                          </span>
                        )}
                        <span className="ml-auto text-sm font-mono text-gray-400">{formatDate(act.createdAt)}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-600 mb-1">{act.subject}</div>
                      {act.body && <div className="text-sm text-gray-600 bg-control border border-gray-100 rounded-lg px-2.5 py-2">{act.body}</div>}
                    </div>
                  </div>
                ))}
                {filteredActivities.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No activity yet</div>}
              </div>
            </div>

            <div className="col-span-3 space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4">
                <div className="text-sm font-semibold text-gray-500 mb-3">Primary contact</div>
                {contacts.length === 0 ? (
                  <div className="text-sm text-gray-500">No contacts yet</div>
                ) : primaryContact && !pcEditing ? (
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full ${avatarColor(primaryContact.firstName + primaryContact.lastName)} text-white flex items-center justify-center text-sm font-semibold shrink-0`}>
                      {initials(`${primaryContact.firstName} ${primaryContact.lastName}`)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-blue-600 truncate">{primaryContact.firstName} {primaryContact.lastName}</div>
                      {primaryContact.title && <div className="text-sm text-gray-500">{primaryContact.title}</div>}
                      {primaryContact.email && <div className="text-sm text-gray-700 mt-1">{primaryContact.email}</div>}
                      {primaryContact.phone && <div className="text-sm text-gray-700">{primaryContact.phone}</div>}
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setPcEditing(true); setPcQuery(''); setPcOpen(true) }}
                          title="Change primary contact"
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <IconLogNote />
                        </button>
                        <button
                          onClick={() => set('primaryContactId', null)}
                          title="Remove primary contact"
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <IconX />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      autoFocus={pcEditing}
                      value={pcQuery}
                      onChange={(e) => { setPcQuery(e.target.value); setPcOpen(true) }}
                      onFocus={() => setPcOpen(true)}
                      onBlur={() => { setPcOpen(false); setPcEditing(false) }}
                      placeholder="Search contacts..."
                      disabled={readOnly}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {pcOpen && !readOnly && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <button
                          onMouseDown={() => { set('primaryContactId', null); setPcQuery(''); setPcOpen(false); setPcEditing(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                        >
                          — None —
                        </button>
                        {contacts
                          .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(pcQuery.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c.id}
                              onMouseDown={() => { set('primaryContactId', c.id); setPcQuery(`${c.firstName} ${c.lastName}`); setPcOpen(false); setPcEditing(false) }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
                            >
                              {c.firstName} {c.lastName}
                              {c.title && <span className="text-gray-400"> · {c.title}</span>}
                            </button>
                          ))}
                        {contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(pcQuery.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-card">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                  <IconUsers />
                  <span className="text-sm font-semibold text-gray-500">Contacts</span>
                  {!readOnly && !isNew && (
                    <div className="ml-auto flex items-center gap-1 text-gray-400">
                      <button onClick={openLinkModal} title="Add existing contact" className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 hover:text-gray-600">
                        <IconLink />
                      </button>
                      <button onClick={openCreateContact} title="New contact" className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 hover:text-gray-600">
                        <IconPlusSmall />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-1.5">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => guardedNavigate(`/crm/contacts/${c.id}`)}
                      className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <div className={`w-7 h-7 rounded-full ${avatarColor(c.firstName + c.lastName)} text-white flex items-center justify-center text-sm font-semibold shrink-0`}>
                        {initials(`${c.firstName} ${c.lastName}`)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 truncate">
                          {c.firstName} {c.lastName}
                          {c.id === form.primaryContactId && <IconStar />}
                        </div>
                        {c.title && <div className="text-sm text-gray-400 truncate">{c.title}</div>}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAssociation(c) }}
                          title="Remove from account"
                          className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                        >
                          <IconX />
                        </button>
                      )}
                      <span className="shrink-0 text-gray-300 group-hover:text-blue-600"><IconChevronRight /></span>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      {isNew ? 'Save the account to add contacts' : 'No contacts yet'}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-card">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                  <IconMapPin />
                  <span className="text-sm font-semibold text-gray-500">Other addresses</span>
                  {!readOnly && (
                    <button onClick={openAddressModal} title="Add address" className="ml-auto w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <IconPlusSmall />
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {form.addresses.map((a) => (
                    <div key={a.key} className="group flex items-center gap-3 px-4 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate">{a.addressType.join(', ') || 'Address'}</div>
                        <div className="text-sm text-gray-500 truncate">{addressSummary(a)}</div>
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => removeAddress(a.key)}
                          title="Remove address"
                          className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                        >
                          <IconX />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.addresses.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No additional addresses
                      {!readOnly && <div><button onClick={openAddressModal} className="text-blue-600 font-semibold mt-1">+ Add one</button></div>}
                    </div>
                  )}
                </div>
              </div>

              {!isNew && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-card">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
                    <IconClipboard />
                    <span className="text-sm font-semibold text-gray-500">Recent records</span>
                  </div>
                  <div className="p-1.5">
                    {recentRecords.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => navigate(r.kind === 'quote' ? `/sales/quotes/${r.id}` : `/sales/orders/${r.id}`)}
                        className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 ${r.kind === 'quote' ? 'bg-gradient-to-br from-emerald-600 to-emerald-500' : 'bg-gradient-to-br from-gray-900 to-[#26344d]'}`}>
                          {r.kind === 'quote' ? <IconQuoteMini /> : <IconOrderMini />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-mono font-semibold text-gray-900 truncate">{r.label}</div>
                          <div className="text-sm text-gray-400 truncate">{r.sub}</div>
                        </div>
                        <span className="shrink-0 text-gray-300 group-hover:text-blue-600"><IconChevronRight /></span>
                      </div>
                    ))}
                    {recentRecords.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-500">No quotes or orders yet</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tab === 'quotes' ? (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quotes</span>
              <div className="flex items-center gap-1">
                {(['All', 'Draft', 'Active', 'Won', 'Cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuoteStatusFilter(s)}
                    className={`text-sm px-2.5 py-1 rounded-full font-medium ${quoteStatusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {s} ({s === 'All' ? quotes.length : quotes.filter((q) => q.status === s).length})
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  <SortableTh field="quoteNumber" label="Quote #" sortField={quoteSortField} sortDir={quoteSortDir} onSort={toggleQuoteSort} />
                  <SortableTh field="status" label="Status" sortField={quoteSortField} sortDir={quoteSortDir} onSort={toggleQuoteSort} />
                  <SortableTh field="total" label="Total" sortField={quoteSortField} sortDir={quoteSortDir} onSort={toggleQuoteSort} />
                  <SortableTh field="validUntil" label="Valid Until" sortField={quoteSortField} sortDir={quoteSortDir} onSort={toggleQuoteSort} />
                  <SortableTh field="createdAt" label="Created" sortField={quoteSortField} sortDir={quoteSortDir} onSort={toggleQuoteSort} />
                  <SortableTh field="owner" label="Owner" sortField={quoteSortField} sortDir={quoteSortDir} onSort={toggleQuoteSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedQuotes.map((q) => (
                  <tr key={q.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/sales/quotes/${q.id}`)}>
                    <td className="px-4 py-1.5 text-gray-900 font-mono">{q.quoteNumber}-{q.version}</td>
                    <td className="px-4 py-1.5">
                      <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${quoteStatusStyles[q.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-gray-600">${q.total.toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-gray-600">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-1.5 text-gray-600">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-1.5 text-gray-600">{q.ownerName ?? q.ownerTeamName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredQuotes.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {quotes.length === 0 ? 'No quotes yet' : `No ${quoteStatusFilter.toLowerCase()} quotes`}
              </div>
            )}
            {filteredQuotes.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
                <span>Page {quotePage} of {quoteTotalPages} · {filteredQuotes.length} total quotes</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuotePage((p) => Math.max(1, p - 1))}
                    disabled={quotePage <= 1}
                    title="Previous page"
                    className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setQuotePage((p) => Math.min(quoteTotalPages, p + 1))}
                    disabled={quotePage >= quoteTotalPages}
                    title="Next page"
                    className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : tab === 'orders' ? (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Orders</span>
              <div className="flex items-center gap-1">
                {(['All', 'Active', 'Inactive'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setOrderStatusFilter(s)}
                    className={`text-sm px-2.5 py-1 rounded-full font-medium ${orderStatusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {s} ({s === 'All' ? orders.length : orders.filter((o) => (s === 'Active' ? o.isActive : !o.isActive)).length})
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  <SortableTh field="orderNumber" label="Order #" sortField={orderSortField} sortDir={orderSortDir} onSort={toggleOrderSort} />
                  <SortableTh field="status" label="Status" sortField={orderSortField} sortDir={orderSortDir} onSort={toggleOrderSort} />
                  <SortableTh field="total" label="Total" sortField={orderSortField} sortDir={orderSortDir} onSort={toggleOrderSort} />
                  <SortableTh field="createdAt" label="Created" sortField={orderSortField} sortDir={orderSortDir} onSort={toggleOrderSort} />
                  <SortableTh field="owner" label="Owner" sortField={orderSortField} sortDir={orderSortDir} onSort={toggleOrderSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedOrders.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/sales/orders/${o.id}`)}>
                    <td className="px-4 py-1.5 text-gray-900 font-mono">{o.orderNumber}</td>
                    <td className="px-4 py-1.5">
                      <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {o.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-gray-600">${o.total.toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-gray-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-1.5 text-gray-600">{o.ownerName ?? o.ownerTeamName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {orders.length === 0 ? 'No orders yet' : `No ${orderStatusFilter.toLowerCase()} orders`}
              </div>
            )}
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
                <span>Page {orderPage} of {orderTotalPages} · {filteredOrders.length} total orders</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                    disabled={orderPage <= 1}
                    title="Previous page"
                    className="w-8 h-8 flex items-center justify-center border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setOrderPage((p) => Math.min(orderTotalPages, p + 1))}
                    disabled={orderPage >= orderTotalPages}
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
          <AuditHistoryTable entity="Account" entityId={id!} />
        )}
      </div>

      {showContactModal && (
        <Modal title="New Contact" onClose={() => setShowContactModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['firstName', 'First Name *'], ['lastName', 'Last Name *']].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={contactForm[k as keyof typeof contactForm]} onChange={(e) => setContactField(k, e.target.value)} />
                </div>
              ))}
            </div>
            {[['title', 'Title'], ['email', 'Email'], ['phone', 'Phone']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={contactForm[k as keyof typeof contactForm]} onChange={(e) => setContactField(k, e.target.value)} />
              </div>
            ))}
            {contactSaveError && <p className="text-sm text-red-600">{contactSaveError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowContactModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={saveContact} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {showLinkModal && (
        <Modal title="Add Existing Contact" onClose={() => setShowLinkModal(false)}>
          <div className="space-y-3">
            <input
              autoFocus
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <div className="max-h-80 overflow-y-auto divide-y border rounded-lg">
              {linkCandidates
                .filter((c) => c.accountId !== id)
                .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(linkSearch.toLowerCase()))
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">{c.firstName} {c.lastName}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {c.title ? `${c.title} · ` : ''}{c.accountName ? `Currently at ${c.accountName}` : 'No account'}
                      </div>
                    </div>
                    <button onClick={() => linkContact(c)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0">Add</button>
                  </div>
                ))}
              {linkCandidates.filter((c) => c.accountId !== id).length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-gray-500">No other contacts available</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showAddressModal && (
        <Modal title="New Address" onClose={() => setShowAddressModal(false)}>
          <div className="space-y-4">
            <div className="relative" ref={typeDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <button
                type="button"
                onClick={() => setTypeDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <span className={addressDraft.addressType.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                  {addressDraft.addressType.length === 0 ? 'Select type(s)' : `${addressDraft.addressType.length} Selected`}
                </span>
                <IconChevron open={typeDropdownOpen} />
              </button>
              {typeDropdownOpen && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
                  {addressTypes.map((t) => {
                    const disabled = usedAddressTypes.has(t)
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50 cursor-pointer'}`}
                      >
                        <input type="checkbox" disabled={disabled} checked={addressDraft.addressType.includes(t)} onChange={() => toggleDraftType(t)} />
                        {t}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            {[['addressLine1', 'Address Line 1'], ['addressLine2', 'Address Line 2'], ['addressLine3', 'Address Line 3'],
              ['county', 'County'], ['province', 'Province'], ['country', 'Country'], ['postalCode', 'Postal Code']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  value={addressDraft[k as keyof AddressItem]} onChange={(e) => setDraftField(k, e.target.value)} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddressModal(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button
                onClick={saveAddressDraft}
                disabled={addressDraft.addressType.length === 0}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

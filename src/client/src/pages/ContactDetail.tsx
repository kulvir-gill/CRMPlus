import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import OwnerPicker from '../components/OwnerPicker'
import AuditHistoryTable from '../components/AuditHistoryTable'
import { Breadcrumb, Toolbar, ToolbarButton, RecordHeader, StatusPill } from '../components/DetailChrome'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Contact {
  id: string; firstName: string; lastName: string; email?: string; phone?: string; title?: string
  accountId?: string | null; accountName?: string; auditEnabled: boolean; isActive: boolean; createdAt: string
  ownerId?: string | null; ownerName?: string
  ownerTeamId?: string | null; ownerTeamName?: string
}

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }
interface AccountOption { id: string; name: string }

const empty = {
  firstName: '', lastName: '', email: '', phone: '', title: '',
  accountId: null as string | null, auditEnabled: false,
  ownerId: null as string | null, ownerTeamId: null as string | null,
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

function IconPhone() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
      <path d="M5.2 3.5h2.3l1 3-1.6 1.3a8 8 0 004.3 4.3l1.3-1.6 3 1v2.3a1.5 1.5 0 01-1.6 1.5A12.5 12.5 0 013.7 5.1a1.5 1.5 0 011.5-1.6z" />
    </svg>
  )
}

function FieldRow({ label, required, value, onChange, icon, readOnly }: {
  label: string; required?: boolean; value: string; onChange?: (v: string) => void; icon?: React.ReactNode; readOnly?: boolean
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
      {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
    </div>
  )
}

export default function ContactDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { user: me } = useAuth()
  const [contact, setContact] = useState<Contact | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'audit'>('summary')

  const loadContact = () => api.get(`/contacts/${id}`).then((r) => {
    const c: Contact = r.data
    setContact(c)
    setForm({
      firstName: c.firstName, lastName: c.lastName, email: c.email ?? '', phone: c.phone ?? '', title: c.title ?? '',
      accountId: c.accountId ?? null, auditEnabled: c.auditEnabled ?? false,
      ownerId: c.ownerId ?? null, ownerTeamId: c.ownerTeamId ?? null,
    })
    setIsDirty(false)
  })

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
    api.get('/accounts', { params: { pageSize: 1000 } }).then((r) => setAccounts(r.data.items))
  }, [])

  useEffect(() => {
    if (isNew) {
      setContact({
        id: '', firstName: '', lastName: '', email: '', phone: '', title: '',
        accountId: null, auditEnabled: false, isActive: true, createdAt: new Date().toISOString(),
        ownerId: me?.userId ?? null, ownerTeamId: null,
      })
      setForm({ ...empty, ownerId: me?.userId ?? null })
      setIsDirty(false)
      return
    }
    loadContact()
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
    try {
      if (isNew) {
        const res = await api.post('/contacts', { ...form, isActive: true })
        setSaveError(null)
        setIsDirty(false)
        navigate(`/crm/contacts/${res.data.id}`, { replace: true })
        return
      }
      await api.put(`/contacts/${id}`, { ...form, isActive: contact?.isActive ?? true })
      setSaveError(null)
      await loadContact()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Failed to save contact.'
      setSaveError(message)
      throw err
    }
  }
  const refresh = () => loadContact()

  const toggleActive = async () => {
    if (!contact) return
    await api.put(`/contacts/${id}`, { ...form, isActive: !contact.isActive })
    await loadContact()
  }

  useEffect(() => {
    setDirty(isDirty)
  }, [isDirty, setDirty])

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  useEffect(() => () => setDirty(false), [setDirty])

  if (!contact) return null

  const crmAccess = getAccessLevel(me, 'crm')
  const isOwner = isNew || contact.ownerId === me?.userId
  const noAccess = crmAccess === 'ReadOnly' || (crmAccess === 'UserLevel' && !isOwner)
  const readOnly = (!isNew && !contact.isActive) || noAccess
  const displayName = isNew ? (`${form.firstName} ${form.lastName}`.trim() || 'New Contact') : `${contact.firstName} ${contact.lastName}`
  const saveDisabled = readOnly || !form.firstName.trim() || !form.lastName.trim() || (!isNew && !isDirty)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Contacts', to: '/crm/contacts' }, { label: displayName }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate(-1)} title="Back to contacts" />
          {crmAccess !== 'ReadOnly' && <ToolbarButton icon={<IconNew />} label="New" onClick={() => guardedNavigate('/crm/contacts/new')} />}
          {!isNew && <ToolbarButton icon={<IconRefresh />} label="Refresh" onClick={refresh} />}
          {!isNew && !noAccess && <ToolbarButton icon={<IconPower />} label={contact.isActive ? 'Deactivate' : 'Activate'} onClick={toggleActive} />}
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
          subtitle={`Contact · ${isNew ? 'Unsaved' : (contact.accountName ?? 'No account')}`}
          badge={readOnly ? <StatusPill label="Inactive" tone="gray" /> : undefined}
          metrics={[
            ...(isNew ? [] : [{ label: 'Created', content: <div className="text-sm font-medium text-gray-900">{formatDate(contact.createdAt)}</div> }]),
            {
              label: 'Owner', content: (
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  ownerName={contact.ownerName}
                  ownerTeamName={contact.ownerTeamName}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  readOnly={readOnly || crmAccess === 'UserLevel'}
                  className="text-sm font-medium text-gray-900 bg-transparent text-right rounded hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  title="Select Contact Owner"
                />
              ),
            },
          ]}
        />
      </div>

      <div className="flex gap-6 px-6 border-b border-gray-200 bg-transparent text-sm">
        {(isNew ? ([['summary', 'Summary']] as const) : ([['summary', 'Summary'], ['audit', 'Audit History']] as const)).map(([key, label]) => (
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
              <div className="px-4 py-2.5 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact Information</div>
              <div className="divide-y divide-gray-200">
                <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <FieldRow label="First Name" required value={form.firstName} onChange={(v) => set('firstName', v)} readOnly={readOnly} />
                  <FieldRow label="Last Name" required value={form.lastName} onChange={(v) => set('lastName', v)} readOnly={readOnly} />
                </div>
                <FieldRow label="Email" value={form.email} onChange={(v) => set('email', v)} readOnly={readOnly} />
                <FieldRow label="Phone" value={form.phone} onChange={(v) => set('phone', v)} icon={<IconPhone />} readOnly={readOnly} />
                <FieldRow label="Title" value={form.title} onChange={(v) => set('title', v)} readOnly={readOnly} />
                {saveError && <div className="px-4 pb-2 -mt-1 text-sm text-red-600">{saveError}</div>}
                <div className="flex items-center gap-3 px-4 py-1.5">
                  <div className="w-24 shrink-0 text-sm text-gray-500">Account</div>
                  {readOnly ? (
                    <div className="flex-1 min-w-0 text-sm text-gray-500 px-1.5 py-1">{contact.accountName || '—'}</div>
                  ) : (
                    <select
                      value={form.accountId ?? ''}
                      onChange={(e) => set('accountId', e.target.value || null)}
                      className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent rounded px-1.5 -mx-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                    >
                      <option value="">— None —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AuditHistoryTable entity="Contact" entityId={id!} />
        )}
      </div>
    </div>
  )
}

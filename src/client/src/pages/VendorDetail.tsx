import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import OwnerPicker from '../components/OwnerPicker'
import AuditHistoryTable from '../components/AuditHistoryTable'
import { Breadcrumb, Toolbar, ToolbarButton, RecordHeader, StatusPill } from '../components/DetailChrome'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Vendor {
  id: string; name: string; contactName?: string; email?: string; phone?: string; address?: string
  auditEnabled: boolean; isActive: boolean; createdAt: string
  ownerId?: string | null; ownerName?: string
  ownerTeamId?: string | null; ownerTeamName?: string
}

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }

const empty = {
  name: '', contactName: '', email: '', phone: '', address: '', auditEnabled: false,
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

export default function VendorDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { user: me } = useAuth()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tab, setTab] = useState<'summary' | 'audit'>('summary')

  const loadVendor = () => api.get(`/vendors/${id}`).then((r) => {
    const v: Vendor = r.data
    setVendor(v)
    setForm({
      name: v.name, contactName: v.contactName ?? '', email: v.email ?? '', phone: v.phone ?? '', address: v.address ?? '',
      auditEnabled: v.auditEnabled ?? false, ownerId: v.ownerId ?? null, ownerTeamId: v.ownerTeamId ?? null,
    })
    setIsDirty(false)
  })

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  useEffect(() => {
    if (isNew) {
      setVendor({
        id: '', name: '', contactName: '', email: '', phone: '', address: '',
        auditEnabled: false, isActive: true, createdAt: new Date().toISOString(),
        ownerId: me?.userId ?? null, ownerTeamId: null,
      })
      setForm({ ...empty, ownerId: me?.userId ?? null })
      setIsDirty(false)
      return
    }
    loadVendor()
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
        const res = await api.post('/vendors', { ...form, isActive: true })
        setSaveError(null)
        setIsDirty(false)
        navigate(`/inventory/vendors/${res.data.id}`, { replace: true })
        return
      }
      await api.put(`/vendors/${id}`, { ...form, isActive: vendor?.isActive ?? true })
      setSaveError(null)
      await loadVendor()
    } catch (err) {
      const message = axios.isAxiosError(err) && err.response?.data?.message
        ? String(err.response.data.message)
        : 'Failed to save vendor.'
      setSaveError(message)
      throw err
    }
  }
  const refresh = () => loadVendor()

  const toggleActive = async () => {
    if (!vendor) return
    await api.put(`/vendors/${id}`, { ...form, isActive: !vendor.isActive })
    await loadVendor()
  }

  useEffect(() => {
    setDirty(isDirty)
  }, [isDirty, setDirty])

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  useEffect(() => () => setDirty(false), [setDirty])

  if (!vendor) return null

  const inventoryAccess = getAccessLevel(me, 'inventory')
  const isOwner = isNew || vendor.ownerId === me?.userId
  const noAccess = inventoryAccess === 'ReadOnly' || (inventoryAccess === 'UserLevel' && !isOwner)
  const readOnly = (!isNew && !vendor.isActive) || noAccess
  const displayName = isNew ? (form.name || 'New Vendor') : vendor.name
  const saveDisabled = readOnly || !form.name.trim() || (!isNew && !isDirty)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Vendors', to: '/inventory/vendors' }, { label: displayName }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate(-1)} title="Back to vendors" />
          {inventoryAccess !== 'ReadOnly' && <ToolbarButton icon={<IconNew />} label="New" onClick={() => guardedNavigate('/inventory/vendors/new')} />}
          {!isNew && <ToolbarButton icon={<IconRefresh />} label="Refresh" onClick={refresh} />}
          {!isNew && !noAccess && <ToolbarButton icon={<IconPower />} label={vendor.isActive ? 'Deactivate' : 'Activate'} onClick={toggleActive} />}
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
          subtitle={`Vendor · ${isNew ? 'Unsaved' : (vendor.contactName || 'No primary contact')}`}
          badge={readOnly ? <StatusPill label="Inactive" tone="gray" /> : undefined}
          metrics={[
            ...(isNew ? [] : [{ label: 'Created', content: <div className="text-sm font-medium text-gray-900">{formatDate(vendor.createdAt)}</div> }]),
            {
              label: 'Owner', content: (
                <OwnerPicker
                  ownerId={form.ownerId}
                  ownerTeamId={form.ownerTeamId}
                  ownerName={vendor.ownerName}
                  ownerTeamName={vendor.ownerTeamName}
                  users={users}
                  teams={teams}
                  onChange={setOwner}
                  readOnly={readOnly || inventoryAccess === 'UserLevel'}
                  className="text-sm font-medium text-gray-900 bg-transparent text-right rounded hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                  title="Select Vendor Owner"
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
              <div className="px-4 py-2.5 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase tracking-wide">Vendor Information</div>
              <div className="divide-y divide-gray-200">
                <FieldRow label="Name" required value={form.name} onChange={(v) => set('name', v)} readOnly={readOnly} />
                <FieldRow label="Contact Name" value={form.contactName} onChange={(v) => set('contactName', v)} readOnly={readOnly} />
                <FieldRow label="Email" value={form.email} onChange={(v) => set('email', v)} readOnly={readOnly} />
                <FieldRow label="Phone" value={form.phone} onChange={(v) => set('phone', v)} icon={<IconPhone />} readOnly={readOnly} />
                {saveError && <div className="px-4 pb-2 -mt-1 text-sm text-red-600">{saveError}</div>}
                <FieldRow label="Address" value={form.address} onChange={(v) => set('address', v)} readOnly={readOnly} />
              </div>
            </div>
          </div>
        ) : (
          <AuditHistoryTable entity="Vendor" entityId={id!} />
        )}
      </div>
    </div>
  )
}

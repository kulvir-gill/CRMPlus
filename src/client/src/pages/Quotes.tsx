import { useNavigate } from 'react-router-dom'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Quote { id: string; quoteNumber: string; version: number; accountName: string; status: string; isActive: boolean; total: number; createdAt: string; validUntil?: string; ownerId?: string; ownerName?: string; ownerTeamId?: string; ownerTeamName?: string }

const statusColor: Record<string, string> = {
  Draft: 'bg-amber-50 text-amber-700',
  Active: 'bg-blue-50 text-blue-600',
  Won: 'bg-emerald-50 text-emerald-600',
  Cancelled: 'bg-red-50 text-red-700',
}
const statusDot: Record<string, string> = { Draft: 'bg-amber-700', Active: 'bg-blue-600', Won: 'bg-emerald-600', Cancelled: 'bg-red-700' }

const avatarPalette = [
  'bg-gradient-to-br from-blue-600 to-blue-400',
  'bg-gradient-to-br from-emerald-600 to-emerald-500',
  'bg-gradient-to-br from-slate-700 to-slate-500',
  'bg-gradient-to-br from-amber-600 to-amber-400',
  'bg-gradient-to-br from-indigo-600 to-indigo-400',
  'bg-gradient-to-br from-rose-600 to-rose-400',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '')).toUpperCase()
}

function avatarColor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return avatarPalette[hash % avatarPalette.length]
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const columns: EntityColumn<Quote>[] = [
  { field: 'quotenumber', label: 'Quote #', render: (q) => <span className="font-mono font-semibold text-blue-600 group-hover:underline">{q.quoteNumber}-{q.version}</span> },
  {
    field: 'account', label: 'Account', render: (q) => (
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm font-semibold text-white shrink-0 ${avatarColor(q.accountName)}`}>{initials(q.accountName)}</span>
        <span className="text-gray-900 font-medium">{q.accountName}</span>
      </div>
    ),
  },
  {
    field: 'status', label: 'Stage', render: (q) => (
      <span className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full font-medium ${statusColor[q.status] ?? ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[q.status] ?? 'bg-gray-400'}`} />
        {q.status}
      </span>
    ),
  },
  {
    field: 'total', label: 'Total', align: 'right', render: (q) => (
      <span className={`font-mono font-semibold ${q.total === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
        ${q.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  { field: 'validuntil', label: 'Valid until', render: (q) => <span className="font-mono text-sm text-gray-600">{formatDate(q.validUntil)}</span> },
  { field: 'createdat', label: 'Created', render: (q) => <span className="font-mono text-sm text-gray-600">{formatDate(q.createdAt)}</span> },
  {
    field: 'owner', label: 'Owner', render: (q) => {
      const name = q.ownerName ?? q.ownerTeamName
      return name ? (
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-white flex items-center justify-center text-sm font-semibold shrink-0">{initials(name)}</span>
          <span className="text-gray-600 font-medium">{name}</span>
        </div>
      ) : <span className="text-gray-400">—</span>
    },
  },
]

const exportColumns = [
  { key: 'quoteNumber' as const, label: 'Quote #', getValue: (q: Quote) => `${q.quoteNumber}-${q.version}` },
  { key: 'accountName' as const, label: 'Account' },
  { key: 'status' as const, label: 'Status' },
  { key: 'total' as const, label: 'Total' },
  { key: 'validUntil' as const, label: 'Valid Until' },
  { key: 'ownerName' as const, label: 'Owner', getValue: (q: Quote) => q.ownerName ?? q.ownerTeamName },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Quotes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = getAccessLevel(user, 'sales') !== 'ReadOnly'
  const state = useEntityListView<Quote>({ endpoint: '/quotes', defaultSortField: 'createdat', defaultSortDir: 'desc' })

  return (
    <EntityListView
      entityLabel="Quote"
      entityLabelPlural="Quotes"
      state={state}
      columns={columns}
      showSortButton={false}
      showColumnsButton={false}
      showStatusColumn={false}
      exportInHeader
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/sales/quotes/new') : undefined}
      onRowClick={(q) => navigate(`/sales/quotes/${q.id}`)}
    />
  )
}

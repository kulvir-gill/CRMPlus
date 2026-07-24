import { useNavigate } from 'react-router-dom'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Order { id: string; orderNumber: string; quoteNumber?: string | null; accountName: string; isActive: boolean; total: number; createdAt: string; ownerId?: string; ownerName?: string; ownerTeamId?: string; ownerTeamName?: string }

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

const columns: EntityColumn<Order>[] = [
  { field: 'ordernumber', label: 'Order #', render: (o) => <span className="font-mono font-semibold text-blue-600 group-hover:underline">{o.orderNumber}</span> },
  {
    field: 'account', label: 'Account', render: (o) => (
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm font-semibold text-white shrink-0 ${avatarColor(o.accountName)}`}>{initials(o.accountName)}</span>
        <span className="text-gray-900 font-medium">{o.accountName}</span>
      </div>
    ),
  },
  { field: 'quote', label: 'Quote', render: (o) => <span className="font-mono text-sm text-gray-600">{o.quoteNumber ?? '—'}</span> },
  {
    field: 'total', label: 'Total', align: 'right', render: (o) => (
      <span className={`font-mono font-semibold ${o.total === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
        ${o.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  { field: 'createdat', label: 'Created', render: (o) => <span className="font-mono text-sm text-gray-600">{formatDate(o.createdAt)}</span> },
  {
    field: 'owner', label: 'Owner', render: (o) => {
      const name = o.ownerName ?? o.ownerTeamName
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
  { key: 'orderNumber' as const, label: 'Order #' },
  { key: 'accountName' as const, label: 'Account' },
  { key: 'quoteNumber' as const, label: 'Quote' },
  { key: 'total' as const, label: 'Total' },
  { key: 'ownerName' as const, label: 'Owner', getValue: (o: Order) => o.ownerName ?? o.ownerTeamName },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Orders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = getAccessLevel(user, 'sales') !== 'ReadOnly'
  const state = useEntityListView<Order>({ endpoint: '/orders', defaultSortField: 'createdat', defaultSortDir: 'desc' })

  return (
    <EntityListView
      entityLabel="Order"
      entityLabelPlural="Orders"
      state={state}
      columns={columns}
      showSortButton={false}
      showColumnsButton={false}
      showStatusColumn={false}
      exportInHeader
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/sales/orders/new') : undefined}
      onRowClick={(o) => navigate(`/sales/orders/${o.id}`)}
    />
  )
}

import { useNavigate } from 'react-router-dom'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Account {
  id: string; accountNumber: string; name: string; phone?: string; email?: string
  industry?: string; auditEnabled: boolean; isActive: boolean; ownerId?: string; ownerName?: string
}

const columns: EntityColumn<Account>[] = [
  { field: 'accountNumber', label: 'Account #', render: (a) => <span className="text-gray-500 font-mono text-sm">{a.accountNumber}</span> },
  { field: 'name', label: 'Name', render: (a) => <span className="text-gray-600">{a.name}</span> },
  { field: 'email', label: 'Email', render: (a) => <span className="text-gray-600">{a.email ?? '—'}</span> },
  { field: 'phone', label: 'Phone', render: (a) => <span className="text-gray-600">{a.phone ?? '—'}</span> },
  { field: 'industry', label: 'Industry', render: (a) => <span className="text-gray-600">{a.industry ?? '—'}</span> },
  { field: 'owner', label: 'Owner', render: (a) => <span className="text-gray-600">{a.ownerName ?? '—'}</span> },
]

const exportColumns = [
  { key: 'accountNumber' as const, label: 'Account #' },
  { key: 'name' as const, label: 'Name' },
  { key: 'email' as const, label: 'Email' },
  { key: 'phone' as const, label: 'Phone' },
  { key: 'industry' as const, label: 'Industry' },
  { key: 'ownerName' as const, label: 'Owner' },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Accounts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = getAccessLevel(user, 'crm') !== 'ReadOnly'
  const state = useEntityListView<Account>({ endpoint: '/accounts', defaultSortField: 'name' })

  return (
    <EntityListView
      entityLabel="Account"
      entityLabelPlural="Accounts"
      state={state}
      columns={columns}
      showSortButton={false}
      showColumnsButton={false}
      exportInHeader
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/crm/accounts/new') : undefined}
      onRowClick={(a) => navigate(`/crm/accounts/${a.id}`)}
    />
  )
}

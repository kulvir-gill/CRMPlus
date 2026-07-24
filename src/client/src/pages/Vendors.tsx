import { useNavigate } from 'react-router-dom'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Vendor { id: string; name: string; contactName?: string; email?: string; phone?: string; isActive: boolean; ownerId?: string; ownerName?: string; ownerTeamId?: string; ownerTeamName?: string }

const columns: EntityColumn<Vendor>[] = [
  { field: 'name', label: 'Name', render: (v) => <span className="text-gray-900">{v.name}</span> },
  { field: 'contactName', label: 'Contact Name', render: (v) => <span className="text-gray-600">{v.contactName ?? '—'}</span> },
  { field: 'email', label: 'Email', render: (v) => <span className="text-gray-600">{v.email ?? '—'}</span> },
  { field: 'phone', label: 'Phone', render: (v) => <span className="text-gray-600">{v.phone ?? '—'}</span> },
  { field: 'owner', label: 'Owner', render: (v) => <span className="text-gray-600">{v.ownerName ?? v.ownerTeamName ?? '—'}</span> },
]

const exportColumns = [
  { key: 'name' as const, label: 'Name' },
  { key: 'contactName' as const, label: 'Contact Name' },
  { key: 'email' as const, label: 'Email' },
  { key: 'phone' as const, label: 'Phone' },
  { key: 'ownerName' as const, label: 'Owner', getValue: (v: Vendor) => v.ownerName ?? v.ownerTeamName },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Vendors() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = getAccessLevel(user, 'inventory') !== 'ReadOnly'
  const state = useEntityListView<Vendor>({ endpoint: '/vendors', defaultSortField: 'name' })

  return (
    <EntityListView
      entityLabel="Vendor"
      entityLabelPlural="Vendors"
      state={state}
      columns={columns}
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/inventory/vendors/new') : undefined}
      onRowClick={(v) => navigate(`/inventory/vendors/${v.id}`)}
    />
  )
}

import { useNavigate } from 'react-router-dom'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Product { id: string; productNumber: string; name: string; description?: string; price: number; unit: string; isActive: boolean; ownerId?: string; ownerName?: string; ownerTeamId?: string; ownerTeamName?: string }

const columns: EntityColumn<Product>[] = [
  { field: 'productnumber', label: 'Product #', render: (p) => <span className="text-gray-600 font-mono">{p.productNumber}</span> },
  { field: 'name', label: 'Name', render: (p) => <span className="text-gray-900">{p.name}</span> },
  { field: 'description', label: 'Description', sortable: false, render: (p) => <span className="text-gray-600">{p.description ?? '—'}</span> },
  { field: 'price', label: 'Price', render: (p) => <span className="font-medium">${p.price.toFixed(2)}</span> },
  { field: 'unit', label: 'Unit', render: (p) => <span className="text-gray-600">{p.unit}</span> },
  { field: 'owner', label: 'Owner', render: (p) => <span className="text-gray-600">{p.ownerName ?? p.ownerTeamName ?? '—'}</span> },
]

const exportColumns = [
  { key: 'productNumber' as const, label: 'Product #' },
  { key: 'name' as const, label: 'Name' },
  { key: 'description' as const, label: 'Description' },
  { key: 'price' as const, label: 'Price' },
  { key: 'unit' as const, label: 'Unit' },
  { key: 'ownerName' as const, label: 'Owner', getValue: (p: Product) => p.ownerName ?? p.ownerTeamName },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Products() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = getAccessLevel(user, 'inventory') !== 'ReadOnly'
  const state = useEntityListView<Product>({ endpoint: '/products', defaultSortField: 'name' })

  return (
    <EntityListView
      entityLabel="Product"
      entityLabelPlural="Products"
      state={state}
      columns={columns}
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/inventory/products/new') : undefined}
      onRowClick={(p) => navigate(`/inventory/products/${p.id}`)}
    />
  )
}

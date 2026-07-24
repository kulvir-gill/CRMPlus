import { useNavigate } from 'react-router-dom'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'
import { useAuth, getAccessLevel } from '../context/AuthContext'

interface Contact {
  id: string; firstName: string; lastName: string; email?: string; phone?: string; title?: string
  accountId?: string; accountName?: string; isActive: boolean; ownerId?: string; ownerName?: string; ownerTeamName?: string
}

const columns: EntityColumn<Contact>[] = [
  { field: 'name', label: 'Name', render: (c) => <span className="text-gray-900">{c.firstName} {c.lastName}</span> },
  { field: 'title', label: 'Title', render: (c) => <span className="text-gray-600">{c.title ?? '—'}</span> },
  { field: 'email', label: 'Email', render: (c) => <span className="text-gray-600">{c.email ?? '—'}</span> },
  { field: 'phone', label: 'Phone', render: (c) => <span className="text-gray-600">{c.phone ?? '—'}</span> },
  { field: 'account', label: 'Account', render: (c) => <span className="text-gray-600">{c.accountName ?? '—'}</span> },
  { field: 'owner', label: 'Owner', render: (c) => <span className="text-gray-600">{c.ownerName ?? c.ownerTeamName ?? '—'}</span> },
]

const exportColumns = [
  { key: 'firstName' as const, label: 'First Name' },
  { key: 'lastName' as const, label: 'Last Name' },
  { key: 'title' as const, label: 'Title' },
  { key: 'email' as const, label: 'Email' },
  { key: 'phone' as const, label: 'Phone' },
  { key: 'accountName' as const, label: 'Account' },
  { key: 'ownerName' as const, label: 'Owner', getValue: (c: Contact) => c.ownerName ?? c.ownerTeamName },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Contacts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = getAccessLevel(user, 'crm') !== 'ReadOnly'
  const state = useEntityListView<Contact>({ endpoint: '/contacts', defaultSortField: 'name' })

  return (
    <EntityListView
      entityLabel="Contact"
      entityLabelPlural="Contacts"
      state={state}
      columns={columns}
      exportColumns={exportColumns}
      onNew={canCreate ? () => navigate('/crm/contacts/new') : undefined}
      onRowClick={(c) => navigate(`/crm/contacts/${c.id}`)}
    />
  )
}

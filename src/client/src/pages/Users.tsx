import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EntityListView from '../components/EntityListView'
import type { EntityColumn } from '../components/EntityListView'
import { useEntityListView } from '../hooks/useEntityListView'

interface SecurityRoleRef { id: string; name: string }
interface User {
  id: string; firstName: string; lastName: string; email: string; title?: string
  securityRoles: SecurityRoleRef[]; teamNames?: string[]; isActive: boolean
}

const roleColor: Record<string, string> = { Admin: 'bg-purple-100 text-purple-700', Manager: 'bg-blue-100 text-blue-700', Employee: 'bg-gray-100 text-gray-700' }

const columns: EntityColumn<User>[] = [
  {
    field: 'firstname', label: 'Name', render: (u) => (
      <div>
        <div className="text-gray-900">{u.firstName} {u.lastName}</div>
        {u.title && <div className="text-sm text-gray-500">{u.title}</div>}
      </div>
    ),
  },
  { field: 'email', label: 'Email', render: (u) => <span className="text-gray-600">{u.email}</span> },
  {
    field: 'role', label: 'Security Roles', render: (u) => (
      <div className="flex flex-wrap gap-1">
        {u.securityRoles.map((r) => <span key={r.id} className={`text-sm px-2 py-0.5 rounded-full font-medium ${roleColor[r.name] ?? 'bg-gray-100 text-gray-700'}`}>{r.name}</span>)}
      </div>
    ),
  },
  { field: 'team', label: 'Teams', render: (u) => <span className="text-gray-600">{u.teamNames && u.teamNames.length > 0 ? u.teamNames.join(', ') : '—'}</span> },
]

const exportColumns = [
  { key: 'firstName' as const, label: 'First Name' },
  { key: 'lastName' as const, label: 'Last Name' },
  { key: 'email' as const, label: 'Email' },
  { key: 'title' as const, label: 'Title' },
  { key: 'teamNames' as const, label: 'Teams' },
  { key: 'isActive' as const, label: 'Active' },
]

export default function Users() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const isAdmin = me?.roles?.includes('Admin') ?? false
  const state = useEntityListView<User>({ endpoint: '/users', defaultSortField: 'lastname' })

  return (
    <EntityListView
      entityLabel="User"
      entityLabelPlural="Users"
      state={state}
      columns={columns}
      exportColumns={exportColumns}
      onNew={isAdmin ? () => navigate('/setting/users/new') : undefined}
      onRowClick={(u) => navigate(`/setting/users/${u.id}`)}
    />
  )
}

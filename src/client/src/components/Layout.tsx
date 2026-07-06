import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/activities', label: 'Activities' },
  { to: '/projects', label: 'Projects' },
  { to: '/work-items', label: 'Work Items' },
  { to: '/timesheets', label: 'Timesheets' },
  { to: '/products', label: 'Products' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/users', label: 'Users' },
  { to: '/teams', label: 'Teams' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-indigo-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-indigo-800">
          <h1 className="text-xl font-bold tracking-tight">CRMPlus</h1>
          <p className="text-xs text-indigo-300 mt-1">{user?.firstName} {user?.lastName}</p>
          <span className="text-xs text-indigo-400">{user?.role}</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center px-4 py-2 text-sm text-indigo-100 hover:bg-indigo-800 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-indigo-300 hover:text-white text-left"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

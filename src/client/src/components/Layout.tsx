import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { IconGrid, findModuleByPath, modules } from '../config/modules'
import { IconSearchTop, IconBell } from './DetailChrome'

function IconChevron({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 7.5l4.5 5 4.5-5" />
    </svg>
  )
}

function initials(firstName?: string, lastName?: string) {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase()
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { guardedNavigate } = useUnsavedChanges()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const currentModule = findModuleByPath(location.pathname)
  const visibleModules = modules.filter((m) => user?.modules?.includes(m.key))

  useEffect(() => {
    if (!switcherOpen && !userMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [switcherOpen, userMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex items-center h-10 bg-white text-gray-800 border-b border-gray-200 px-2 gap-1 text-sm shrink-0 shadow-sm z-10">
        <div className="relative" ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            title="Switch module"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <IconGrid className="w-4 h-4" />
          </button>
          {switcherOpen && (
            <div className="absolute z-20 top-full left-0 mt-1 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 w-56 py-2">
              {visibleModules.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { guardedNavigate(`/${m.key}`); setSwitcherOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${m.key === currentModule.key ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  <m.icon />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => guardedNavigate(`/${currentModule.key}`)}
          className="font-semibold px-2 h-7 rounded-lg text-gray-900 hover:bg-gray-100 shrink-0"
        >
          {currentModule.label}
        </button>

        <nav className="flex items-center self-stretch gap-1 ml-1 overflow-x-auto">
          {currentModule.items.map((item) => {
            const isDashboardItem = item.to === `/${currentModule.key}`
            const active = isDashboardItem
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
            return (
              <button
                key={item.to}
                onClick={() => guardedNavigate(item.to)}
                className={`h-full flex items-center px-3 text-sm whitespace-nowrap border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        <button title="Search" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 shrink-0">
          <IconSearchTop />
        </button>
        <button title="Notifications" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 shrink-0">
          <IconBell />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className={`flex items-center gap-2 px-2 h-7 rounded-lg text-gray-700 hover:bg-gray-100 ${userMenuOpen ? 'bg-gray-100' : ''}`}
          >
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {initials(user?.firstName, user?.lastName)}
            </span>
            <span className="hidden sm:inline whitespace-nowrap">{user?.firstName} {user?.lastName}</span>
            <IconChevron open={userMenuOpen} />
          </button>
          {userMenuOpen && (
            <div className="absolute z-20 top-full right-0 mt-1 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 w-52 py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</div>
                <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                <div className="text-sm text-blue-600">{user?.roles?.join(', ')}</div>
              </div>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

import type { ReactNode } from 'react'

function icon(paths: ReactNode) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  )
}

export const IconGrid = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" shapeRendering="geometricPrecision">
    <rect x="2" y="2" width="9" height="9" rx="2" />
    <rect x="13" y="2" width="9" height="9" rx="2" />
    <rect x="2" y="13" width="9" height="9" rx="2" />
    <rect x="13" y="13" width="9" height="9" rx="2" />
  </svg>
)

export const IconDashboard = () => icon(<>
  <rect x="3" y="3" width="7" height="7" rx="1" />
  <rect x="14" y="3" width="7" height="7" rx="1" />
  <rect x="3" y="14" width="7" height="7" rx="1" />
  <rect x="14" y="14" width="7" height="7" rx="1" />
</>)
export const IconAccounts = () => icon(<>
  <path d="M4 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16" />
  <path d="M14 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12" />
  <path d="M4 21h16" />
  <path d="M7 7h1M7 11h1M7 15h1" />
</>)
export const IconContacts = () => icon(<>
  <circle cx="12" cy="8" r="3.2" />
  <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
</>)
export const IconActivities = () => icon(<>
  <path d="M8 6h13M8 12h13M8 18h13" />
  <path d="M3 6h.01M3 12h.01M3 18h.01" />
</>)
export const IconProjects = () => icon(
  <path d="M3 7a1 1 0 0 1 1-1h4l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" />
)
export const IconWorkItems = () => icon(<>
  <path d="M9 6h11M9 12h11M9 18h11" />
  <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
</>)
export const IconTimesheets = () => icon(<>
  <circle cx="12" cy="12" r="8.5" />
  <path d="M12 7.5V12l3 2" />
</>)
export const IconProducts = () => icon(<>
  <path d="M3.5 7.5L12 3l8.5 4.5L12 12 3.5 7.5z" />
  <path d="M3.5 7.5V16l8.5 4.5V12" />
  <path d="M20.5 7.5V16L12 20.5" />
</>)
export const IconVendors = () => icon(<>
  <path d="M4 21V10l8-6 8 6v11" />
  <path d="M9 21v-6h6v6" />
  <path d="M9 10h.01M15 10h.01M12 10h.01" />
</>)
export const IconQuotes = () => icon(<>
  <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
  <path d="M14 3v4h4" />
  <path d="M9 13h6M9 16.5h6" />
</>)
export const IconInvoices = () => icon(<>
  <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z" />
  <path d="M9 8h6M9 12h6" />
</>)
export const IconOrders = () => icon(<>
  <path d="M4 7l8-4 8 4-8 4-8-4z" />
  <path d="M4 7v10l8 4 8-4V7" />
  <path d="M12 11v10" />
</>)
export const IconUsers = () => icon(<>
  <circle cx="9" cy="8" r="3" />
  <path d="M2.5 19c0-3 3-5 6.5-5s6.5 2 6.5 5" />
  <circle cx="17" cy="9" r="2.3" />
  <path d="M15.5 13a5 5 0 0 1 5.5 5" />
</>)
export const IconTeams = () => icon(<>
  <circle cx="8" cy="8" r="2.5" />
  <circle cx="16" cy="8" r="2.5" />
  <path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
  <path d="M11 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
</>)
export const IconSecurityRoles = () => icon(<>
  <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
  <path d="M9.5 12l1.8 1.8 3.2-3.6" />
</>)
export const IconScheduler = () => icon(<>
  <rect x="3" y="4.5" width="18" height="16" rx="2" />
  <path d="M3 9.5h18" />
  <path d="M8 3v3M16 3v3" />
  <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
</>)
export const IconSetting = () => icon(<>
  <circle cx="12" cy="12" r="3" />
  <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
</>)

export interface ModuleItem { to: string; label: string; icon: () => ReactNode }
export interface ModuleDef { key: string; label: string; icon: () => ReactNode; items: ModuleItem[] }

export const modules: ModuleDef[] = [
  {
    key: 'crm', label: 'CRM', icon: IconContacts,
    items: [
      { to: '/crm', label: 'Dashboard', icon: IconDashboard },
      { to: '/crm/accounts', label: 'Accounts', icon: IconAccounts },
      { to: '/crm/contacts', label: 'Contacts', icon: IconContacts },
    ],
  },
  {
    key: 'sales', label: 'Sales', icon: IconQuotes,
    items: [
      { to: '/sales', label: 'Dashboard', icon: IconDashboard },
      { to: '/sales/quotes', label: 'Quotes', icon: IconQuotes },
      { to: '/sales/orders', label: 'Orders', icon: IconOrders },
      { to: '/sales/invoices', label: 'Invoices', icon: IconInvoices },
    ],
  },
  {
    key: 'inventory', label: 'Inventory', icon: IconProducts,
    items: [
      { to: '/inventory', label: 'Dashboard', icon: IconDashboard },
      { to: '/inventory/products', label: 'Products', icon: IconProducts },
      { to: '/inventory/vendors', label: 'Vendors', icon: IconVendors },
    ],
  },
  {
    key: 'resource', label: 'Resource', icon: IconProjects,
    items: [
      { to: '/resource', label: 'Dashboard', icon: IconDashboard },
      { to: '/resource/scheduler', label: 'Scheduler', icon: IconScheduler },
      { to: '/resource/projects', label: 'Projects', icon: IconProjects },
      { to: '/resource/work-items', label: 'Work Items', icon: IconWorkItems },
      { to: '/resource/timesheets', label: 'Timesheets', icon: IconTimesheets },
      { to: '/resource/teams', label: 'Teams', icon: IconTeams },
    ],
  },
  {
    key: 'setting', label: 'Setting', icon: IconSetting,
    items: [
      { to: '/setting', label: 'Dashboard', icon: IconDashboard },
      { to: '/setting/users', label: 'Users', icon: IconUsers },
      { to: '/setting/teams', label: 'Teams', icon: IconTeams },
      { to: '/setting/security-roles', label: 'Security Roles', icon: IconSecurityRoles },
      { to: '/setting/admin-setting', label: 'Admin Setting', icon: IconQuotes },
    ],
  },
]

export function findModuleByPath(pathname: string): ModuleDef {
  return modules.find((m) => pathname === `/${m.key}` || pathname.startsWith(`/${m.key}/`)) ?? modules[0]
}

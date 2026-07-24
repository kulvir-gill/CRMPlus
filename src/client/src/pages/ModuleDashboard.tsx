import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { modules } from '../config/modules'

interface Stats {
  totalAccounts: number; totalContacts: number; totalActivities: number
  totalQuotes: number; totalInvoices: number; openInvoices: number
  totalProducts: number; totalProjects: number; activeProjects: number
  openWorkItems: number; totalTeams: number; totalUsers: number
}
interface WorkItem { id: string; title: string; status: string; priority: string; dueDate: string | null; projectName: string }
interface Timesheet { id: string; weekStartDate: string; status: string }

const priorityColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
}
const statusColor: Record<string, string> = {
  Submitted: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Draft: 'bg-gray-100 text-gray-700',
}

export default function ModuleDashboard({ module }: { module: string }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [pendingTimesheets, setPendingTimesheets] = useState(0)

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => {
      setStats(data.stats)
      setWorkItems(data.myWorkItems)
      setTimesheets(data.myTimesheets)
      setPendingTimesheets(data.pendingTimesheets)
    })
  }, [])

  const def = modules.find((m) => m.key === module) ?? modules[0]

  const cards: { label: string; value: number | string; color: string }[] =
    module === 'crm' ? [
      { label: 'Accounts', value: stats?.totalAccounts ?? '–', color: 'bg-blue-50 text-blue-700' },
      { label: 'Contacts', value: stats?.totalContacts ?? '–', color: 'bg-green-50 text-green-700' },
      { label: 'Activities', value: stats?.totalActivities ?? '–', color: 'bg-purple-50 text-purple-700' },
    ] : module === 'sales' ? [
      { label: 'Quotes', value: stats?.totalQuotes ?? '–', color: 'bg-blue-50 text-blue-700' },
      { label: 'Invoices', value: stats?.totalInvoices ?? '–', color: 'bg-green-50 text-green-700' },
      { label: 'Open Invoices', value: stats?.openInvoices ?? '–', color: 'bg-orange-50 text-orange-700' },
    ] : module === 'inventory' ? [
      { label: 'Products', value: stats?.totalProducts ?? '–', color: 'bg-blue-50 text-blue-700' },
    ] : module === 'resource' ? [
      { label: 'Projects', value: stats?.totalProjects ?? '–', color: 'bg-blue-50 text-blue-700' },
      { label: 'Active Projects', value: stats?.activeProjects ?? '–', color: 'bg-purple-50 text-purple-700' },
      { label: 'Open Work Items', value: stats?.openWorkItems ?? '–', color: 'bg-orange-50 text-orange-700' },
      { label: 'Teams', value: stats?.totalTeams ?? '–', color: 'bg-green-50 text-green-700' },
    ] : [
      { label: 'Users', value: stats?.totalUsers ?? '–', color: 'bg-blue-50 text-blue-700' },
    ]

  return (
    <div>
      <PageHeader title={`${def.label} Dashboard`} subtitle="Welcome back" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((s) => (
            <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
              <p className="text-sm font-medium opacity-70">{s.label}</p>
              <p className="text-sm font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {def.items.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-indigo-300 hover:shadow-sm transition"
            >
              <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <item.icon />
              </span>
              <span className="text-sm text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>

        {module === 'resource' && (
          <>
            {pendingTimesheets > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
                <strong>{pendingTimesheets}</strong> timesheet{pendingTimesheets > 1 ? 's' : ''} pending your approval
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border">
                <div className="px-5 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">My Work Items</h3>
                </div>
                <div className="divide-y">
                  {workItems.length === 0 && <p className="px-5 py-4 text-sm text-gray-500">No active work items</p>}
                  {workItems.map((w) => (
                    <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{w.title}</p>
                        <p className="text-sm text-gray-500">{w.projectName} · {w.status}</p>
                      </div>
                      <span className={`text-sm px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${priorityColor[w.priority] ?? ''}`}>
                        {w.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="px-5 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">Recent Timesheets</h3>
                </div>
                <div className="divide-y">
                  {timesheets.length === 0 && <p className="px-5 py-4 text-sm text-gray-500">No timesheets yet</p>}
                  {timesheets.map((t) => (
                    <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                      <p className="text-sm text-gray-700">Week of {new Date(t.weekStartDate).toLocaleDateString()}</p>
                      <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${statusColor[t.status] ?? ''}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import api from '../api/client'

interface AuditChange {
  fieldName: string
  oldValue?: string | null
  newValue?: string | null
}

interface AuditLogEntry {
  id: string; entityName: string; entityId: string; action: string
  userId?: string | null; userEmail?: string | null
  timestamp: string
  changes: AuditChange[]
}

interface Props {
  entity: string
  entityId: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function humanize(fieldName: string) {
  return fieldName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

const actionStyles: Record<string, string> = {
  Created: 'bg-emerald-100 text-emerald-700',
  Updated: 'bg-blue-100 text-blue-700',
  Deleted: 'bg-red-100 text-red-700',
  Associated: 'bg-purple-100 text-purple-700',
  Deassociated: 'bg-amber-100 text-amber-700',
}

interface Row {
  key: string
  showHeader: boolean
  date: string
  by: string
  action: string
  fieldName: string
  oldValue?: string | null
  newValue?: string | null
}

export default function AuditHistoryTable({ entity, entityId }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    api.get('/audit', { params: { entity, entityId } })
      .then((r) => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoaded(true))
  }, [entity, entityId])

  const rows: Row[] = logs.flatMap((log) => {
    const changes = log.changes.length > 0 ? log.changes : [{ fieldName: '', oldValue: null, newValue: null }]
    return changes.map((change, i) => ({
      key: `${log.id}-${i}`,
      showHeader: i === 0,
      date: formatDateTime(log.timestamp),
      by: log.userEmail ?? 'System',
      action: log.action,
      fieldName: change.fieldName ? humanize(change.fieldName) : '',
      oldValue: change.oldValue,
      newValue: change.newValue,
    }))
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase tracking-wide">Audit History</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 whitespace-nowrap">Changed Date</th>
              <th className="px-4 py-2 whitespace-nowrap">Changed By</th>
              <th className="px-4 py-2 whitespace-nowrap">Event</th>
              <th className="px-4 py-2 whitespace-nowrap">Changed Field</th>
              <th className="px-4 py-2">Old Value</th>
              <th className="px-4 py-2">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.key} className={row.showHeader ? 'border-t-2 border-gray-100' : ''}>
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{row.showHeader ? row.date : ''}</td>
                <td className="px-4 py-2 whitespace-nowrap text-indigo-700">{row.showHeader ? row.by : ''}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {row.showHeader && (
                    <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${actionStyles[row.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.action}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-700">{row.fieldName || '—'}</td>
                <td className="px-4 py-2 text-gray-600">{row.oldValue ?? '—'}</td>
                <td className="px-4 py-2 text-gray-600">{row.newValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loaded && rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No audit history for this record</div>
        )}
      </div>
    </div>
  )
}

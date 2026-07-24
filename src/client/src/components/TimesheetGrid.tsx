import { dayLabels, weekDays, rowTotal } from '../utils/timesheetGrid'
import type { GridRow } from '../utils/timesheetGrid'

interface WorkItemOption { id: string; title: string; projectName: string }

interface Props {
  weekStartDate: string
  rows: GridRow[]
  workItems: WorkItemOption[]
  readOnly?: boolean
  onSetWorkItem: (rowKey: string, workItemId: string) => void
  onSetHour: (rowKey: string, dayIdx: number, value: string) => void
  onRemoveRow: (rowKey: string) => void
  onAddRow: () => void
}

export default function TimesheetGrid({ weekStartDate, rows, workItems, readOnly, onSetWorkItem, onSetHour, onRemoveRow, onAddRow }: Props) {
  const days = weekDays(weekStartDate)
  const grandTotal = rows.reduce((sum, r) => sum + rowTotal(r), 0)

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-gray-50 text-gray-600 text-sm">
          <tr>
            <th className="px-3 py-2 text-left w-64">Work Item</th>
            {days.map((d, i) => (
              <th key={i} className="px-2 py-2 text-center w-16">
                <div>{dayLabels[i]}</div>
                <div className="text-gray-400 font-normal">{d.getDate()}</div>
              </th>
            ))}
            <th className="px-2 py-2 text-center w-16">Total</th>
            {!readOnly && <th className="w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2">
                {readOnly ? (
                  <span className="text-gray-700">{workItems.find((w) => w.id === r.workItemId)?.title ?? '—'}</span>
                ) : (
                  <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={r.workItemId} onChange={(e) => onSetWorkItem(r.key, e.target.value)}>
                    <option value="">— Select work item —</option>
                    {workItems.map((w) => <option key={w.id} value={w.id}>{w.title} ({w.projectName})</option>)}
                  </select>
                )}
              </td>
              {r.hours.map((h, i) => (
                <td key={i} className="px-1 py-2">
                  {readOnly ? (
                    <div className="text-center text-gray-700">{h || '—'}</div>
                  ) : (
                    <input
                      type="number" min="0" max="24" step="0.5"
                      className="block mx-auto w-14 border border-gray-300 rounded px-1.5 py-1.5 text-sm text-center"
                      value={h}
                      onChange={(e) => {
                        const v = e.target.value
                        onSetHour(r.key, i, v !== '' && parseFloat(v) > 24 ? '24' : v)
                      }}
                    />
                  )}
                </td>
              ))}
              <td className="px-2 py-2 text-center font-medium text-gray-700">{rowTotal(r) || ''}</td>
              {!readOnly && (
                <td className="px-1 py-2 text-center">
                  <button onClick={() => onRemoveRow(r.key)} className="text-gray-300 hover:text-red-500" title="Remove row">✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-gray-50">
            <td className="px-3 py-2 text-sm text-gray-500">
              {!readOnly && <button onClick={onAddRow} className="text-indigo-600 hover:underline text-sm">+ Add work item</button>}
            </td>
            <td colSpan={7} />
            <td className="px-2 py-2 text-center font-semibold text-gray-900">{grandTotal}h</td>
            {!readOnly && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

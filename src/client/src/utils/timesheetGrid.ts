export const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function currentWeekStart() {
  const d = new Date()
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return toISODate(d)
}

export function weekDays(weekStart: string) {
  if (!weekStart) return []
  const start = new Date(`${weekStart}T00:00:00`)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
}

export interface GridRow { key: string; workItemId: string; hours: string[] }

export const newGridRow = (): GridRow => ({ key: crypto.randomUUID(), workItemId: '', hours: ['', '', '', '', '', '', ''] })

export function rowTotal(r: GridRow) {
  return r.hours.reduce((sum, h) => sum + (parseFloat(h) || 0), 0)
}

export function buildEntriesFromRows(rows: GridRow[], weekStartDate: string) {
  const days = weekDays(weekStartDate)
  return rows.flatMap((r) => {
    if (!r.workItemId) return []
    return days
      .map((d, i) => ({ workItemId: r.workItemId, date: `${toISODate(d)}T00:00:00Z`, hours: parseFloat(r.hours[i]) || 0, description: null as string | null }))
      .filter((e) => e.hours > 0)
  })
}

export interface EntryLike { workItemId: string; date: string; hours: number }

export function rowsFromEntries(weekStartDate: string, entries: EntryLike[]): GridRow[] {
  const dayKeys = weekDays(weekStartDate).map(toISODate)
  const byWorkItem = new Map<string, GridRow>()
  entries.forEach((e) => {
    let row = byWorkItem.get(e.workItemId)
    if (!row) {
      row = newGridRow()
      row.workItemId = e.workItemId
      byWorkItem.set(e.workItemId, row)
    }
    const dayIdx = dayKeys.indexOf(e.date.slice(0, 10))
    if (dayIdx >= 0) row.hours[dayIdx] = String(e.hours)
  })
  const rows = Array.from(byWorkItem.values())
  return rows.length ? rows : [newGridRow()]
}

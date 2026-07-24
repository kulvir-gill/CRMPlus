export interface ExportColumn<T> {
  key: keyof T
  label: string
  getValue?: (row: T) => unknown
}

function escapeCsvValue(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const UTF8_BOM = '﻿'

export function exportToCsv<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string
) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(',')
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(c.getValue ? c.getValue(row) : row[c.key])).join(','))
  const csv = [header, ...lines].join('\r\n')

  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

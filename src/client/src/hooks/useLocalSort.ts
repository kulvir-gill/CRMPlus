import { useMemo, useState } from 'react'

type Accessor<T> = (row: T) => string | number

export function useLocalSort<T>(rows: T[], accessors: Record<string, Accessor<T>>, defaultField: string | null = null, defaultDir: 'asc' | 'desc' = 'asc') {
  const [sortField, setSortField] = useState<string | null>(defaultField)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir)

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortField || !accessors[sortField]) return rows
    const get = accessors[sortField]
    const copy = [...rows].sort((a, b) => {
      const av = get(a), bv = get(b)
      if (av < bv) return -1
      if (av > bv) return 1
      return 0
    })
    return sortDir === 'desc' ? copy.reverse() : copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortField, sortDir])

  return { sorted, sortField, sortDir, toggleSort }
}

import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'

type LookupItem = Record<string, unknown> & { id: string; name: string }

interface Props {
  value: string | null
  valueLabel: string | null
  endpoint: string
  onChange: (id: string | null, item: LookupItem | null) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
  secondary?: (item: LookupItem) => string | undefined
  recordPath?: string
}

const PAGE_SIZE = 10

function IconSearch() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6" />
      <path d="M17.5 17.5L13.5 13.5" />
    </svg>
  )
}

function IconRecord() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5h6l3 3v11a.5.5 0 01-.5.5h-8.5a.5.5 0 01-.5-.5v-13.5a.5.5 0 01.5-.5z" />
      <path d="M11.5 2.5v3h3" />
    </svg>
  )
}

export default function LookupField({ value, valueLabel, endpoint, onChange, placeholder, readOnly, className, secondary, recordPath }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<LookupItem[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { guardedNavigate } = useUnsavedChanges()

  const goToRecord = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (recordPath && value) guardedNavigate(`${recordPath}/${value}`)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const fetchPage = (q: string, p: number, append: boolean) => {
    setLoading(true)
    api.get(endpoint, { params: { search: q, sortField: 'name', sortDir: 'asc', page: p, pageSize: PAGE_SIZE } })
      .then((r) => {
        setItems((prev) => (append ? [...prev, ...r.data.items] : r.data.items))
        setTotalCount(r.data.totalCount)
        setPage(p)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPage(query, 1, false), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open])

  useEffect(() => {
    if (!open) { setQuery(''); setItems([]); setPage(1); setTotalCount(0) }
  }, [open])

  if (readOnly) {
    if (recordPath && value && valueLabel) {
      return (
        <div className={className}>
          <a href={`${recordPath}/${value}`} onClick={goToRecord} className="text-blue-600 hover:underline cursor-pointer">
            {valueLabel}
          </a>
        </div>
      )
    }
    return <div className={className}>{valueLabel ?? '—'}</div>
  }

  const showLink = !open && value && valueLabel && recordPath

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        {showLink ? (
          <div
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
            className={className ?? 'w-full border border-gray-300 rounded-lg pl-3 pr-9 py-2 text-sm cursor-text'}
          >
            <a href={`${recordPath}/${value}`} onClick={goToRecord} className="text-blue-600 hover:underline cursor-pointer">
              {valueLabel}
            </a>
          </div>
        ) : (
          <input
            ref={inputRef}
            value={open ? query : (valueLabel ?? '')}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={className ?? 'w-full border border-gray-300 rounded-lg pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400'}
          />
        )}
        <button
          type="button"
          onClick={() => { setOpen(true); inputRef.current?.focus() }}
          title="Search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <IconSearch />
        </button>
      </div>
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          <button
            type="button"
            onMouseDown={() => { onChange(null, null); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
          >
            — None —
          </button>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onMouseDown={() => { onChange(item.id, item); setOpen(false) }}
              className={`w-full flex items-start gap-2 text-left px-3 py-2 text-sm hover:bg-gray-50 ${item.id === value ? 'bg-gray-50' : ''}`}
            >
              <IconRecord />
              <span className="min-w-0 flex-1">
                <div className="text-gray-900 truncate">{item.name}</div>
                {secondary?.(item) && <div className="text-sm text-gray-500 truncate">{secondary(item)}</div>}
              </span>
              {item.id === value && <span className="text-gray-400 shrink-0">✓</span>}
            </button>
          ))}
          {!loading && items.length === 0 && <div className="px-3 py-4 text-center text-sm text-gray-500">No matches</div>}
          {items.length < totalCount && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fetchPage(query, page + 1, true) }}
              disabled={loading}
              className="w-full text-center px-3 py-2 text-sm text-indigo-600 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconPower, IconChevron } from './RibbonButton'
import { ToolbarButton, IconSearchTop } from './DetailChrome'
import { exportToCsv } from '../utils/exportCsv'
import type { ExportColumn } from '../utils/exportCsv'
import type { EntityListViewState, ListItem, ViewFilter } from '../hooks/useEntityListView'

export interface EntityColumn<T> {
  field: string
  label: string
  render: (row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right'
}

export interface FilterFieldOption { value: string; label: string }
export interface FilterField { field: string; label: string; options: FilterFieldOption[] }

const STATUS_COLUMN_KEY = '__status'

interface Props<T extends ListItem & { isActive?: boolean }> {
  entityLabel: string
  entityLabelPlural: string
  state: EntityListViewState<T>
  columns: EntityColumn<T>[]
  exportColumns: ExportColumn<T>[]
  onNew?: () => void
  onRowClick?: (row: T) => void
  extraToolbar?: ReactNode
  showStatusColumn?: boolean
  emptyMessage?: string
  viewSelectorOverride?: ReactNode
  filterFields?: FilterField[]
  showSortButton?: boolean
  showColumnsButton?: boolean
  exportInHeader?: boolean
}

function IconNewWhite() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  )
}

function IconFilter() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5h14l-5.5 6.3v4.7l-3 1.5v-6.2L3 4.5z" />
    </svg>
  )
}

function IconSort() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5v13M6 3.5L3.3 6.2M6 3.5l2.7 2.7" />
      <path d="M14 16.5v-13M14 16.5l2.7-2.7M14 16.5l-2.7-2.7" />
    </svg>
  )
}

function IconColumns() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M8.3 4v12M12.7 4v12" />
    </svg>
  )
}

function IconExportPlain() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v9M6.5 8.5L10 12l3.5-3.5" />
      <path d="M4 13.5v1.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1.5" />
    </svg>
  )
}

const viewLabel = (view: ViewFilter, plural: string) =>
  view === 'active' ? `Active ${plural}` : view === 'inactive' ? `Inactive ${plural}` : `All ${plural}`

export default function EntityListView<T extends ListItem & { isActive?: boolean }>({
  entityLabel,
  entityLabelPlural,
  state,
  columns,
  exportColumns,
  onNew,
  onRowClick,
  extraToolbar,
  showStatusColumn = true,
  emptyMessage,
  viewSelectorOverride,
  filterFields = [],
  showSortButton = true,
  showColumnsButton = true,
  exportInHeader = false,
}: Props<T>) {
  const {
    items, totalCount, totalPages, pageSize, search, setSearch, view, setView, sortField, sortDir, setSortField, setSortDir, toggleSort,
    filters, setFilter, clearFilters,
    page, setPage, selectedIds, selectAllMatching, toggleRow, allOnPageSelected, toggleSelectAll,
    bulkSetActive, fetchAllMatching, selectedCount,
  } = state

  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const viewMenuRef = useRef<HTMLDivElement>(null)
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const sortMenuRef = useRef<HTMLDivElement>(null)
  const columnsMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!viewMenuOpen && !filterMenuOpen && !sortMenuOpen && !columnsMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setViewMenuOpen(false)
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setFilterMenuOpen(false)
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setSortMenuOpen(false)
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) setColumnsMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [viewMenuOpen, filterMenuOpen, sortMenuOpen, columnsMenuOpen])

  const exportCurrent = async () => {
    const rows = selectedCount > 0
      ? (selectAllMatching ? await fetchAllMatching() : items.filter((i) => selectedIds.has(i.id)))
      : await fetchAllMatching()
    exportToCsv(rows, exportColumns, `${entityLabelPlural.toLowerCase().replace(/\s+/g, '-')}.csv`)
  }

  const statusColumnHidden = hiddenColumns.has(STATUS_COLUMN_KEY)
  const visibleColumns = columns.filter((c) => !hiddenColumns.has(c.field))
  const totalVisibleCount = visibleColumns.length + (showStatusColumn && !statusColumnHidden ? 1 : 0)
  const toggleColumn = (field: string) => {
    setHiddenColumns((prev) => {
      const isHidden = prev.has(field)
      if (!isHidden && totalVisibleCount <= 1) return prev
      const next = new Set(prev)
      if (isHidden) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const colSpan = 1 + visibleColumns.length + (showStatusColumn && !statusColumnHidden ? 1 : 0)
  const activeFilterCount = Object.keys(filters).length

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0 gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            {viewSelectorOverride ?? (
              <div className="relative shrink-0" ref={viewMenuRef}>
                <button
                  onClick={() => setViewMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-900 hover:text-gray-700"
                >
                  {viewLabel(view, entityLabelPlural)}
                  <IconChevron open={viewMenuOpen} />
                </button>
                {viewMenuOpen && (
                  <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-48 py-1">
                    {(['active', 'inactive', 'all'] as ViewFilter[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => { setView(v); setViewMenuOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${view === v ? 'text-blue-700 font-medium' : 'text-gray-700'}`}
                      >
                        {viewLabel(v, entityLabelPlural)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {extraToolbar}
            {selectedCount > 0 && (
              <>
                <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
                <ToolbarButton icon={<IconPower />} label="Activate" onClick={() => bulkSetActive(true)} title={`Activate ${selectedCount} selected`} />
                <ToolbarButton icon={<IconPower />} label="Deactivate" onClick={() => bulkSetActive(false)} title={`Deactivate ${selectedCount} selected`} />
                <span className="ml-1 text-sm text-gray-500 whitespace-nowrap">
                  {selectedCount} selected{selectAllMatching && ' (all matching pages)'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <IconSearchTop />
              </span>
              <input
                placeholder="Filter by keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-lg pl-9 pr-3.5 py-2 text-sm w-64 shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            {exportInHeader && (
              <ToolbarButton size="sm" icon={<IconExportPlain />} label="Export" onClick={exportCurrent} title={selectedCount > 0 ? `Export ${selectedCount} selected` : 'Export all matching rows'} />
            )}
            {onNew && <ToolbarButton size="sm" icon={<IconNewWhite />} label={`New ${entityLabel}`} onClick={onNew} variant="primary" />}
          </div>
        </div>

        {(filterFields.length > 0 || showSortButton || showColumnsButton || !exportInHeader) && (
        <div className="flex items-center justify-between px-6 pb-3 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            {filterFields.length > 0 && (
              <div className="relative" ref={filterMenuRef}>
                <ToolbarButton icon={<IconFilter />} label={activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'} onClick={() => setFilterMenuOpen((v) => !v)} />
                {filterMenuOpen && (
                  <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-56 py-2">
                    {filterFields.map((f) => (
                      <div key={f.field} className="px-3 py-1.5">
                        <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">{f.label}</div>
                        {f.options.map((o) => (
                          <button
                            key={o.value}
                            onClick={() => setFilter(f.field, filters[f.field] === o.value ? undefined : o.value)}
                            className={`w-full text-left px-2 py-1 rounded text-sm ${filters[f.field] === o.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    ))}
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1 pt-2">
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {showSortButton && (
              <div className="relative" ref={sortMenuRef}>
                <ToolbarButton icon={<IconSort />} label="Sort" onClick={() => setSortMenuOpen((v) => !v)} />
                {sortMenuOpen && (
                  <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-52 py-2">
                    {columns.filter((c) => c.sortable !== false).map((c) => (
                      <button
                        key={c.field}
                        onClick={() => setSortField(c.field)}
                        className={`w-full text-left px-3 py-1.5 text-sm ${sortField === c.field ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {c.label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-2 px-3 flex gap-1.5">
                      <button
                        onClick={() => setSortDir('asc')}
                        className={`flex-1 px-2 py-1 text-sm rounded-lg font-medium ${sortDir === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        Ascending
                      </button>
                      <button
                        onClick={() => setSortDir('desc')}
                        className={`flex-1 px-2 py-1 text-sm rounded-lg font-medium ${sortDir === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        Descending
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showColumnsButton && (
              <div className="relative" ref={columnsMenuRef}>
                <ToolbarButton icon={<IconColumns />} label="Columns" onClick={() => setColumnsMenuOpen((v) => !v)} />
                {columnsMenuOpen && (
                  <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-52 py-2 max-h-80 overflow-y-auto">
                    {columns.map((c) => (
                      <label key={c.field} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={!hiddenColumns.has(c.field)} onChange={() => toggleColumn(c.field)} />
                        {c.label}
                      </label>
                    ))}
                    {showStatusColumn && (
                      <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-t border-gray-100 mt-1 pt-2">
                        <input type="checkbox" checked={!statusColumnHidden} onChange={() => toggleColumn(STATUS_COLUMN_KEY)} />
                        Status
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {!exportInHeader && (
            <ToolbarButton size="sm" icon={<IconExportPlain />} label="Export" onClick={exportCurrent} title={selectedCount > 0 ? `Export ${selectedCount} selected` : 'Export all matching rows'} />
          )}
        </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col bg-white mx-6 mb-6 rounded-xl border border-gray-200 shadow-card overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#fafbfc]">
                <tr>
                  <th className="w-10 px-[18px] py-3.5 text-left text-sm font-bold text-gray-400 uppercase tracking-[.06em] whitespace-nowrap border-b border-gray-200">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} onClick={(e) => e.stopPropagation()} className="accent-blue-600" />
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.field}
                      onClick={() => col.sortable !== false && toggleSort(col.field)}
                      className={`px-[18px] py-3.5 select-none text-sm font-bold text-gray-400 uppercase tracking-[.06em] whitespace-nowrap border-b border-gray-200 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    >
                      {col.label}{sortField === col.field && <span className="text-blue-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                  {showStatusColumn && !statusColumnHidden && (
                    <th className="px-[18px] py-3.5 text-left text-sm font-bold text-gray-400 uppercase tracking-[.06em] whitespace-nowrap border-b border-gray-200">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'group hover:bg-blue-50 cursor-pointer' : 'group hover:bg-blue-50'}
                  >
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} className="accent-blue-600" />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.field} className={`px-4 py-2 ${col.align === 'right' ? 'text-right' : ''}`}>{col.render(row)}</td>
                    ))}
                    {showStatusColumn && !statusColumnHidden && (
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${row.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-blue-600' : 'bg-gray-400'}`} />
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">{emptyMessage ?? `No ${entityLabelPlural.toLowerCase()} found`}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 flex items-center justify-between px-[18px] py-3.5 border-t border-gray-200 bg-[#fafbfc] text-sm text-gray-400">
            <span>
              Showing <span className="font-semibold text-gray-600">{totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{(page - 1) * pageSize + items.length}</span> of{' '}
              <span className="font-semibold text-gray-600">{totalCount}</span> {totalCount === 1 ? entityLabel.toLowerCase() : entityLabelPlural.toLowerCase()}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                title="Previous page"
                className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ‹
              </button>
              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white font-semibold">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title="Next page"
                className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

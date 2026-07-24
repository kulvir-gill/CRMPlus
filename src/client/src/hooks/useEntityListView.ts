import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import { useAlert } from '../context/AlertContext'

export type ViewFilter = 'active' | 'inactive' | 'all'

export interface ListItem { id: string }

export interface EntityListViewOptions {
  endpoint: string
  defaultSortField: string
  defaultSortDir?: 'asc' | 'desc'
  pageSize?: number
  extraParams?: Record<string, unknown>
  bulkEndpoint?: string
}

export function useEntityListView<T extends ListItem>({
  endpoint,
  defaultSortField,
  defaultSortDir = 'asc',
  pageSize = 10,
  extraParams = {},
  bulkEndpoint,
}: EntityListViewOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [view, setView] = useState<ViewFilter>(() => (searchParams.get('view') as ViewFilter) || 'active')
  const [sortField, setSortField] = useState(() => searchParams.get('sortField') || defaultSortField)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => (searchParams.get('sortDir') as 'asc' | 'desc') || defaultSortDir)
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const { showAlert } = useAlert()

  const extraKey = JSON.stringify(extraParams)
  const filtersKey = JSON.stringify(filters)
  const resolvedBulkEndpoint = bulkEndpoint ?? `${endpoint}/bulk-status`

  const setFilter = (field: string, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[field]
      else next[field] = value
      return next
    })
  }
  const clearFilters = () => setFilters({})

  const buildParams = (overridePage?: number, overridePageSize?: number) => ({
    ...extraParams,
    ...filters,
    search, isActive: view === 'all' ? undefined : view === 'active',
    sortField, sortDir, page: overridePage ?? page, pageSize: overridePageSize ?? pageSize,
  })

  const load = () => api.get(endpoint, { params: buildParams() })
    .then((r) => { setItems(r.data.items); setTotalCount(r.data.totalCount) })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [search, view, sortField, sortDir, page, extraKey, filtersKey])
  useEffect(() => { setSelectedIds(new Set()); setSelectAllMatching(false) }, [search, view, sortField, sortDir, page, extraKey, filtersKey])

  const fetchAllMatching = () => api.get(endpoint, { params: buildParams(1, Math.max(totalCount, 1)) })
    .then((r) => r.data.items as T[])

  const skipNextReset = useRef(true)
  useEffect(() => {
    if (skipNextReset.current) { skipNextReset.current = false; return }
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, view, sortField, sortDir, extraKey, filtersKey])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.q = search
    if (view !== 'active') params.view = view
    if (sortField !== defaultSortField) params.sortField = sortField
    if (sortDir !== defaultSortDir) params.sortDir = sortDir
    if (page !== 1) params.page = String(page)
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, view, sortField, sortDir, page])

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleRow = (id: string) => {
    setSelectAllMatching(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allOnPageSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id))
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectAllMatching(false)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        items.forEach((i) => next.delete(i.id))
        return next
      })
    } else {
      setSelectAllMatching(true)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        items.forEach((i) => next.add(i.id))
        return next
      })
    }
  }

  const bulkSetActive = async (isActive: boolean) => {
    const ids = selectAllMatching ? (await fetchAllMatching()).map((i) => i.id) : [...selectedIds]
    try {
      await api.put(resolvedBulkEndpoint, { ids, isActive })
      setSelectedIds(new Set())
      setSelectAllMatching(false)
      await load()
    } catch (err) {
      showAlert(
        'Unable to Update Status',
        axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to update the selected records.'
      )
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const selectedCount = selectAllMatching ? totalCount : selectedIds.size

  return {
    items, totalCount, totalPages, pageSize,
    search, setSearch, view, setView, sortField, sortDir, setSortField, setSortDir, toggleSort,
    filters, setFilter, clearFilters,
    page, setPage, selectedIds, selectAllMatching, toggleRow, allOnPageSelected, toggleSelectAll,
    bulkSetActive, fetchAllMatching, selectedCount, load,
  }
}

export type EntityListViewState<T extends ListItem> = ReturnType<typeof useEntityListView<T>>

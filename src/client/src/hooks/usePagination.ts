import { useEffect, useState } from 'react'

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const pageItems = items.slice((page - 1) * pageSize, page * pageSize)

  return { page, setPage, totalPages, pageItems }
}

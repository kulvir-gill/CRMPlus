interface Props {
  field: string
  label: string
  sortField: string | null
  sortDir: 'asc' | 'desc'
  onSort: (field: string) => void
  className?: string
}

export default function SortableTh({ field, label, sortField, sortDir, onSort, className }: Props) {
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-2 text-left select-none cursor-pointer hover:bg-gray-100 ${className ?? ''}`}
    >
      {label}{sortField === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
    </th>
  )
}

import type { ReactNode } from 'react'

function IconX() {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  )
}

interface SubgridProps<T> {
  title: string
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  onAdd?: () => void
  onRemove?: (item: T) => void
  emptyMessage?: string
  addTitle?: string
}

export default function Subgrid<T>({ title, items, getKey, renderItem, onAdd, onRemove, emptyMessage, addTitle }: SubgridProps<T>) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
        {onAdd && (
          <button onClick={onAdd} title={addTitle ?? `Add ${title}`} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">+</button>
        )}
      </div>
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <div key={getKey(item)} className="group flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
            {onRemove && (
              <button
                onClick={() => onRemove(item)}
                title="Remove"
                className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
              >
                <IconX />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">{emptyMessage ?? 'No records'}</div>
        )}
      </div>
    </div>
  )
}

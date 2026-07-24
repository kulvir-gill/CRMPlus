import { useState } from 'react'
import Modal from './Modal'

interface PickerModalProps<T> {
  title: string
  candidates: T[]
  getKey: (item: T) => string
  renderLabel: (item: T) => string
  onPick: (item: T) => void
  onClose: () => void
  emptyMessage?: string
}

export default function PickerModal<T>({ title, candidates, getKey, renderLabel, onPick, onClose, emptyMessage }: PickerModalProps<T>) {
  const [search, setSearch] = useState('')
  const filtered = candidates.filter((c) => renderLabel(c).toLowerCase().includes(search.toLowerCase()))

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <div className="max-h-80 overflow-y-auto divide-y border rounded-lg">
          {filtered.map((c) => (
            <div key={getKey(c)} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="text-sm text-gray-900 truncate">{renderLabel(c)}</div>
              <button onClick={() => onPick(c)} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shrink-0">Add</button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-gray-500">{emptyMessage ?? 'No matches'}</div>
          )}
        </div>
      </div>
    </Modal>
  )
}

import type { ReactNode } from 'react'

export function RibbonButton({ icon, label, onClick, disabled, title }: {
  icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean; title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? (disabled ? 'Not available in this app' : undefined)}
      className={disabled
        ? 'flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 cursor-not-allowed rounded-full'
        : 'flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-full'}
    >
      {icon}
      {label}
    </button>
  )
}

export function IconNew() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  )
}

export function IconRefresh() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 8A5.5 5.5 0 105.6 12" />
      <path d="M15.8 4.5v3.6h-3.6" />
    </svg>
  )
}

export function IconPower() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4.5v5" />
      <path d="M6 6a6 6 0 106 0" />
    </svg>
  )
}

export function IconExport() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v9M6.5 8.5L10 12l3.5-3.5" />
      <path d="M4 13.5v1.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1.5" />
    </svg>
  )
}

export function IconBack() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 5.5L7 10l5.5 4.5" />
    </svg>
  )
}

export function IconSave({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`w-4 h-4 ${active ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h9l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
      <path d="M7 4v4h5V4" />
      <path d="M6.5 12h7v4h-7z" />
    </svg>
  )
}

export function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  )
}

export function IconReject() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  )
}

export function IconChevron({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 7.5l4.5 5 4.5-5" />
    </svg>
  )
}

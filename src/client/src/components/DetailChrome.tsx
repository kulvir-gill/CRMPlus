import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'

export function IconSearchTop() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6" />
      <path d="M17.5 17.5L13.5 13.5" />
    </svg>
  )
}

export function IconBell() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5a4 4 0 00-4 4v2.3c0 .6-.2 1.2-.6 1.7L4.5 12.8a.6.6 0 00.4 1h10.2a.6.6 0 00.4-1l-.9-1.3a2.7 2.7 0 01-.6-1.7V7.5a4 4 0 00-4-4z" />
      <path d="M8.3 15.5a1.7 1.7 0 003.4 0" />
    </svg>
  )
}

export function IconDoc() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 2.5h6l3 3v11a.5.5 0 01-.5.5h-8.5a.5.5 0 01-.5-.5v-13.5a.5.5 0 01.5-.5z" />
      <path d="M11.5 2.5v3h3" />
      <path d="M7 11h6M7 13.5h6M7 8.5h2" />
    </svg>
  )
}

export function IconCart() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="16.5" r="1" />
      <circle cx="14.5" cy="16.5" r="1" />
      <path d="M2.5 3.5h2l1.7 9.2a1.5 1.5 0 001.5 1.3h6.6a1.5 1.5 0 001.5-1.2l1.2-6.3H5.3" />
    </svg>
  )
}

export function IconReceipt() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2.5h10v15l-2-1.3-1.5 1.3-1.5-1.3-1.5 1.3-1.5-1.3-2 1.3v-15z" />
      <path d="M7.3 6.5h5.4M7.3 9.5h5.4M7.3 12.5h3" />
    </svg>
  )
}

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  const { guardedNavigate } = useUnsavedChanges()
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300">/</span>}
          {it.to ? (
            <button onClick={() => guardedNavigate(it.to!)} className="text-gray-500 hover:text-gray-700">{it.label}</button>
          ) : (
            <span className="font-semibold text-gray-900">{it.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export function ToolbarButton({ icon, label, onClick, disabled, title, variant = 'secondary', size = 'md' }: {
  icon?: ReactNode; label: string; onClick?: () => void; disabled?: boolean; title?: string; variant?: 'primary' | 'secondary'; size?: 'md' | 'sm'
}) {
  const base = size === 'sm'
    ? 'flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg whitespace-nowrap'
    : 'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap'
  const styles = variant === 'primary'
    ? disabled
      ? `${base} bg-blue-300 text-white cursor-not-allowed`
      : `${base} bg-blue-600 text-white hover:bg-blue-700`
    : disabled
      ? `${base} bg-white border border-gray-200 text-gray-300 cursor-not-allowed`
      : `${base} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={styles}>
      {icon}
      {label}
    </button>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>
}

export function StatusPill({ label, tone = 'gray' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'gray' | 'blue' }) {
  const tones: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const dots: Record<string, string> = {
    green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-blue-500', gray: 'bg-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium border ${tones[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />
      {label}
    </span>
  )
}

export interface HeaderMetric { label: string; content: ReactNode }

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 4.5L6.5 10l6 5.5" />
    </svg>
  )
}

export function RecordHeader({ icon, iconBg, title, subtitle, badge, metrics, toolbar, onBack, flush }: {
  icon: ReactNode; iconBg: string; title: string; subtitle: string
  badge?: ReactNode
  metrics?: HeaderMetric[]
  toolbar?: ReactNode
  onBack?: () => void
  flush?: boolean
}) {
  return (
    <div className={flush ? 'bg-white' : 'bg-white rounded-xl border border-gray-200 shadow-card'}>
      <div className={`flex items-center justify-between gap-4 flex-wrap ${flush ? 'px-6 py-2' : 'px-4 py-2.5'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back"
              className="w-7 h-7 -ml-1.5 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
            >
              <IconChevronLeft />
            </button>
          )}
          <div className={`${flush ? 'w-8 h-8' : 'w-8 h-8'} rounded-lg flex items-center justify-center text-white shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 leading-tight truncate">{title}</h2>
              {badge}
            </div>
            <p className="text-sm text-gray-500 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 flex-wrap justify-end shrink-0">
          {metrics?.map((m, i) => (
            <div key={i} className="text-right">
              <div className="text-sm font-medium text-gray-400 mb-0.5">{m.label}</div>
              {m.content}
            </div>
          ))}
          {toolbar && metrics && metrics.length > 0 && <div className="w-px h-8 bg-gray-200" />}
          {toolbar && <div className="flex items-center flex-wrap gap-2">{toolbar}</div>}
        </div>
      </div>
    </div>
  )
}

export interface StepperStage { key: string; label: string }

export function ProgressStepper({ stages, reached, actions }: {
  stages: StepperStage[]
  reached: boolean[]
  actions: (null | { enabled: boolean; onClick: () => void })[]
}) {
  return (
    <div className="flex items-center justify-center bg-white px-6 py-2.5 border-t border-gray-100">
      <div className="flex items-center w-full max-w-5xl">
        {stages.map((stage, i) => {
          const isReached = reached[i]
          const action = actions[i]
          const clickable = !isReached && !!action?.enabled
          return (
            <div key={stage.key} className="contents">
              <button
                type="button"
                disabled={!clickable}
                onClick={action?.onClick}
                title={stage.label}
                className={`flex items-center gap-1.5 shrink-0 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  isReached ? 'bg-emerald-500 text-white'
                    : clickable ? 'bg-slate-900 text-white'
                      : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}>
                  {isReached ? (
                    <svg viewBox="0 0 20 20" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                    </svg>
                  ) : i + 1}
                </span>
                <span className={`text-sm font-medium whitespace-nowrap ${
                  isReached || clickable ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
              </button>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isReached ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SectionCard({ icon, title, action, children }: { icon?: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-500">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function InfoRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 px-5 border-b border-gray-100 last:border-b-0">{children}</div>
}

export function InfoField({ label, required, children, size = 'sm', full, labelWidth }: { label: string; required?: boolean; children: ReactNode; size?: 'sm' | 'md'; full?: boolean; labelWidth?: string }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 min-w-0 ${full ? 'col-span-2' : ''}`}>
      <span className={`font-medium text-gray-400 shrink-0 ${labelWidth ?? ''} ${size === 'md' ? 'text-sm' : 'text-sm'}`}>
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </span>
      <div className={`font-semibold text-gray-900 min-w-0 flex-1 ${size === 'md' ? 'text-sm' : 'text-sm'}`}>{children}</div>
    </div>
  )
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</div>
}

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-sm font-medium text-gray-400 mb-0.5">{label}</div>
      {children}
    </div>
  )
}

export function ReadOnlyBox({ children }: { children: ReactNode }) {
  return <div className="w-full py-1 text-sm text-gray-800">{children}</div>
}

export function VersionPill({ label }: { label: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">{label}</span>
}

export function DiscountPill({ value }: { value: number }) {
  if (!value) return <span className="text-gray-400">—</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">{value}%</span>
}

export function LinkCell({ to, children }: { to: string; children: ReactNode }) {
  const { guardedNavigate } = useUnsavedChanges()
  return (
    <a
      href={to}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); guardedNavigate(to) }}
      className="text-blue-600 hover:underline cursor-pointer font-medium"
    >
      {children}
    </a>
  )
}

export function TotalsPanel({ rows, total }: { rows: { label: string; value: string; muted?: boolean; negative?: boolean }[]; total: string }) {
  const totalParts = total.match(/^(\D*)(.*)$/) ?? [null, '', total]
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200">
        <IconReceipt />
        <span className="text-sm font-semibold text-gray-500">Totals</span>
      </div>
      <div className="text-sm divide-y divide-gray-100">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between px-4 py-[9px]">
            <span className="text-gray-500">{r.label}</span>
            <span className={r.negative ? 'text-red-500 font-medium' : r.muted ? 'text-gray-400 font-medium' : 'text-gray-900 font-medium'}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="p-3 pt-2">
        <div className="flex items-center justify-between bg-gradient-to-br from-gray-900 to-[#26344d] rounded-xl px-4 py-1.5">
          <span className="text-sm font-semibold text-gray-300">Total</span>
          <span className="text-white">
            <span className="text-sm font-medium text-gray-300">{totalParts[1]}</span>
            <span className="text-sm font-bold">{totalParts[2]}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export function useBack() {
  const navigate = useNavigate()
  const { guardedNavigate } = useUnsavedChanges()
  return { navigate, guardedNavigate }
}

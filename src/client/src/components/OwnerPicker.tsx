import { useState } from 'react'
import PickerModal from './PickerModal'

interface UserOption { id: string; firstName: string; lastName: string }
interface TeamOption { id: string; name: string }

interface Candidate { key: string; label: string; kind: 'none' | 'user' | 'team'; id: string | null }

interface Props {
  ownerId: string | null
  ownerTeamId: string | null
  ownerName?: string | null
  ownerTeamName?: string | null
  users: UserOption[]
  teams: TeamOption[]
  onChange: (ownerId: string | null, ownerTeamId: string | null) => void
  readOnly?: boolean
  className?: string
  title?: string
}

export default function OwnerPicker({ ownerId, ownerTeamId, ownerName, ownerTeamName, users, teams, onChange, readOnly, className, title }: Props) {
  const [showPicker, setShowPicker] = useState(false)

  const resolvedLabel = ownerTeamId
    ? (ownerTeamName ?? teams.find((t) => t.id === ownerTeamId)?.name ?? '—')
    : ownerId
      ? (ownerName ?? (() => { const u = users.find((x) => x.id === ownerId); return u ? `${u.firstName} ${u.lastName}` : '—' })())
      : '—'

  if (readOnly) {
    return <span className={className}>{resolvedLabel}</span>
  }

  const candidates: Candidate[] = [
    { key: 'none', label: '— None —', kind: 'none', id: null },
    ...teams.map((t) => ({ key: `team:${t.id}`, label: t.name, kind: 'team' as const, id: t.id })),
    ...users.map((u) => ({ key: `user:${u.id}`, label: `${u.firstName} ${u.lastName}`, kind: 'user' as const, id: u.id })),
  ]

  const pick = (c: Candidate) => {
    onChange(c.kind === 'user' ? c.id : null, c.kind === 'team' ? c.id : null)
    setShowPicker(false)
  }

  return (
    <>
      <button type="button" onClick={() => setShowPicker(true)} className={className ?? 'text-sm text-indigo-600 hover:underline'}>
        {resolvedLabel}
      </button>
      {showPicker && (
        <PickerModal
          title={title ?? 'Select Owner'}
          candidates={candidates}
          getKey={(c) => c.key}
          renderLabel={(c) => c.kind === 'team' ? `👥 ${c.label}` : c.label}
          onPick={pick}
          onClose={() => setShowPicker(false)}
          emptyMessage="No teams or users match"
        />
      )}
    </>
  )
}

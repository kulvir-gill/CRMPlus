import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import axios from 'axios'
import api from '../api/client'
import { useAlert } from '../context/AlertContext'
import { useAuth, getAccessLevel } from '../context/AuthContext'
import WorkItemFormModal, { emptyWorkItemForm, combineDueDateTime, splitDueDateTime } from './WorkItemFormModal'
import type { WorkItemFormValues } from './WorkItemFormModal'

interface WorkItem {
  id: string; title: string; description?: string; status: string; priority: string; isActive: boolean
  projectId: string; projectName: string; assignedUserId?: string; assignedUserName?: string
  assignedTeamId?: string; assignedTeamName?: string
  dueDate?: string; estimatedHours: number; actualHours: number
}
interface Project { id: string; name: string }
interface User { id: string; firstName: string; lastName: string; teamIds?: string[] }
interface Team { id: string; name: string }

const avatarPalette = ['bg-indigo-600', 'bg-teal-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-purple-600', 'bg-emerald-600']
function colorFor(seed: string) {
  const code = seed.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return avatarPalette[code % avatarPalette.length]
}

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const DRAG_MIME = 'text/plain'

function isUntimed(iso?: string) {
  if (!iso) return true
  const d = new Date(iso)
  return d.getHours() === 0 && d.getMinutes() === 0
}
function timeFraction(iso: string) {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}
function hourLabel(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12} ${period}`
}

const HOUR_START = 0
const HOUR_END = 24
const HOUR_HEIGHT = 48
const BUSINESS_START = 8
const BUSINESS_END = 18

function monthGrid(cursor: Date) {
  const year = cursor.getFullYear(), month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

function startOfWeek(cursor: Date) {
  const d = new Date(cursor)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return d
}

function weekGrid(cursor: Date) {
  const start = startOfWeek(cursor)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

type ViewMode = 'month' | 'week'

function apiErrorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback
}

export default function WorkItemCalendar() {
  const { showAlert } = useAlert()
  const { user: me } = useAuth()
  const resourceAccess = getAccessLevel(me, 'resource')
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [items, setItems] = useState<WorkItem[]>([])
  const [backlogItems, setBacklogItems] = useState<WorkItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filterKey, setFilterKey] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<WorkItem | null>(null)
  const [form, setForm] = useState<WorkItemFormValues>(emptyWorkItemForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const weekScrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => viewMode === 'month' ? monthGrid(cursor) : weekGrid(cursor), [cursor, viewMode])

  useEffect(() => {
    if (viewMode === 'week' && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = (BUSINESS_START - HOUR_START) * HOUR_HEIGHT
    }
  }, [viewMode, cursor])

  const load = () => {
    const dueFrom = toISODate(days[0])
    const dueToExclusive = new Date(days[days.length - 1])
    dueToExclusive.setDate(dueToExclusive.getDate() + 1)
    api.get('/workitems', { params: { dueFrom, dueTo: toISODate(dueToExclusive), isActive: true, pageSize: 500 } })
      .then((r) => setItems(r.data.items))
  }
  const loadBacklog = () => {
    api.get('/workitems', { params: { unscheduled: true, isActive: true, pageSize: 200 } })
      .then((r) => setBacklogItems(r.data.items))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [cursor, viewMode])
  useEffect(() => {
    loadBacklog()
    api.get('/projects', { params: { pageSize: 1000 } }).then((r) => setProjects(r.data.items))
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/teams').then((r) => setTeams(r.data))
  }, [])

  const teamMemberIds = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    users.forEach((u) => {
      u.teamIds?.forEach((teamId) => {
        if (!map[teamId]) map[teamId] = new Set()
        map[teamId].add(u.id)
      })
    })
    return map
  }, [users])

  const matchesFilter = (i: WorkItem) => {
    if (filterKey === 'all') return true
    if (filterKey.startsWith('user:')) return i.assignedUserId === filterKey.slice(5)
    if (filterKey.startsWith('team:')) {
      const teamId = filterKey.slice(5)
      if (i.assignedTeamId === teamId) return true
      const memberIds = teamMemberIds[teamId] ?? new Set<string>()
      return !!i.assignedUserId && memberIds.has(i.assignedUserId)
    }
    return true
  }

  const filteredItems = useMemo(() => items.filter(matchesFilter), [items, filterKey, teamMemberIds])
  const filteredBacklog = useMemo(() => backlogItems.filter(matchesFilter), [backlogItems, filterKey, teamMemberIds])

  const itemsByDay = useMemo(() => {
    const map: Record<string, WorkItem[]> = {}
    filteredItems.forEach((i) => {
      if (!i.dueDate) return
      const key = i.dueDate.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(i)
    })
    Object.values(map).forEach((list) => list.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')))
    return map
  }, [filteredItems])

  const openCreateOn = (date: Date) => {
    if (resourceAccess === 'ReadOnly') return
    setEditing(null)
    setFormError(null)
    setForm({ ...emptyWorkItemForm, dueDate: toISODate(date) })
    setShowModal(true)
  }
  const openEdit = (w: WorkItem) => {
    setEditing(w)
    setFormError(null)
    setForm({
      title: w.title, description: w.description ?? '', projectId: w.projectId, assignedUserId: w.assignedUserId ?? '', assignedTeamId: w.assignedTeamId ?? '',
      status: w.status, priority: w.priority, isActive: w.isActive,
      ...splitDueDateTime(w.dueDate), estimatedHours: w.estimatedHours.toString(),
    })
    setShowModal(true)
  }
  const set = (k: keyof WorkItemFormValues, v: string | boolean) => { setForm((f) => ({ ...f, [k]: v })); setFormError(null) }
  const save = async () => {
    const payload = { ...form, assignedUserId: form.assignedUserId || null, assignedTeamId: form.assignedTeamId || null, estimatedHours: parseFloat(form.estimatedHours) || 0, dueDate: combineDueDateTime(form.dueDate, form.dueTime) }
    try {
      if (editing) await api.put(`/workitems/${editing.id}`, payload)
      else await api.post('/workitems', payload)
      setShowModal(false)
      load()
      loadBacklog()
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Failed to save work item.'))
    }
  }

  const findById = (id: string) => items.find((i) => i.id === id) ?? backlogItems.find((i) => i.id === id)

  const scheduleItem = async (item: WorkItem, date: Date) => {
    const { dueTime } = splitDueDateTime(item.dueDate)
    const targetDueDate = combineDueDateTime(toISODate(date), dueTime)
    try {
      await api.put(`/workitems/${item.id}`, {
        title: item.title, description: item.description ?? '', projectId: item.projectId,
        assignedUserId: item.assignedUserId || null, assignedTeamId: item.assignedTeamId || null, status: item.status, priority: item.priority,
        isActive: item.isActive, dueDate: targetDueDate, estimatedHours: item.estimatedHours,
      })
      load()
      loadBacklog()
    } catch (err) {
      showAlert('Unable to Reschedule', apiErrorMessage(err, 'Failed to reschedule work item.'))
    }
  }

  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData(DRAG_MIME, id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDayDragOver = (e: DragEvent, key: string) => { e.preventDefault(); setDragOverKey(key) }
  const onDayDrop = (e: DragEvent, date: Date) => {
    e.preventDefault()
    setDragOverKey(null)
    const id = e.dataTransfer.getData(DRAG_MIME)
    const dropped = id && findById(id)
    if (dropped) scheduleItem(dropped, date)
  }

  const today = toISODate(new Date())
  const periodLabel = viewMode === 'month'
    ? cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  const goPrev = () => setCursor((c) => {
    const d = new Date(c)
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    return d
  })
  const goNext = () => setCursor((c) => {
    const d = new Date(c)
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    return d
  })
  const goToday = () => setCursor(new Date())

  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i), [])

  const ItemChip = ({ item }: { item: WorkItem }) => (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e, item.id) }}
      onClick={(e) => { e.stopPropagation(); openEdit(item) }}
      title={`${item.title} · ${item.assignedUserName ?? item.assignedTeamName ?? 'Unassigned'} (drag to reschedule)`}
      className="flex items-center gap-1 text-sm px-1.5 py-0.5 rounded bg-white border border-gray-200 hover:border-indigo-300 truncate cursor-grab active:cursor-grabbing"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorFor(item.assignedUserName ?? item.assignedTeamName ?? item.id)}`} />
      {item.dueDate && !isUntimed(item.dueDate) && <span className="text-gray-400 shrink-0">{formatTime(item.dueDate)}</span>}
      <span className="truncate">{item.title}</span>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-wrap gap-2">
        <span className="text-sm font-semibold text-gray-900">Work Schedule</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`text-sm px-2.5 py-1.5 ${viewMode === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`text-sm px-2.5 py-1.5 border-l border-gray-200 ${viewMode === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Weekly
            </button>
          </div>
          <button onClick={goPrev} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">‹</button>
          <span className="text-sm font-medium text-gray-700 w-40 text-center">{periodLabel}</span>
          <button onClick={goNext} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600">›</button>
          <button onClick={goToday} className="text-sm px-2 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">Today</button>
          <select value={filterKey} onChange={(e) => setFilterKey(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="all">All Work Items</option>
            <optgroup label="Teams">
              {teams.map((t) => <option key={t.id} value={`team:${t.id}`}>{t.name}</option>)}
            </optgroup>
            <optgroup label="Users">
              {users.map((u) => <option key={u.id} value={`user:${u.id}`}>{u.firstName} {u.lastName}</option>)}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-52 shrink-0 border-r border-gray-100 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wide shrink-0">
            Backlog ({filteredBacklog.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredBacklog.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, item.id)}
                onClick={() => openEdit(item)}
                title="Drag onto a day to schedule, or click to edit"
                className="px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-gray-50"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorFor(item.assignedUserName ?? item.assignedTeamName ?? item.id)}`} />
                  <span className="truncate text-sm font-medium text-gray-800">{item.title}</span>
                </div>
                <div className="text-sm text-gray-400 truncate pl-3">{item.projectName} · {item.assignedUserName ?? item.assignedTeamName ?? 'Unassigned'}</div>
              </div>
            ))}
            {filteredBacklog.length === 0 && <div className="px-3 py-6 text-center text-gray-400 text-sm">No unscheduled items</div>}
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="flex-1 min-w-0 h-full flex flex-col">
            <div className="shrink-0 grid grid-cols-7 text-sm font-medium text-gray-500 border-b border-gray-200">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
              {days.map((d) => {
                const key = toISODate(d)
                const inMonth = d.getMonth() === cursor.getMonth()
                const dayItems = itemsByDay[key] ?? []
                return (
                  <div
                    key={key}
                    onClick={() => openCreateOn(d)}
                    onDragOver={(e) => onDayDragOver(e, key)}
                    onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                    onDrop={(e) => onDayDrop(e, d)}
                    className={`border-b border-r border-gray-100 p-1.5 overflow-hidden cursor-pointer hover:bg-gray-50 ${inMonth ? '' : 'bg-gray-50/60'} ${dragOverKey === key ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : ''}`}
                  >
                    <div className={key === today ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-sm font-semibold mb-1' : `text-sm mb-1 ${inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item) => <ItemChip key={item.id} item={item} />)}
                      {dayItems.length > 3 && <div className="text-sm text-gray-400 px-1.5">+{dayItems.length - 3} more</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="border-b border-gray-200" />
              {days.map((d) => {
                const key = toISODate(d)
                return (
                  <div key={key} className="text-center py-2 border-b border-l border-gray-100">
                    <div className="text-sm text-gray-500 uppercase">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    <div className={key === today ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-sm font-semibold' : 'text-sm text-gray-700'}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="text-sm text-gray-400 text-right pr-1.5 pt-1.5">All day</div>
              {days.map((d) => {
                const key = toISODate(d)
                const untimed = (itemsByDay[key] ?? []).filter((i) => isUntimed(i.dueDate))
                return (
                  <div
                    key={key}
                    onClick={() => openCreateOn(d)}
                    onDragOver={(e) => onDayDragOver(e, `allday-${key}`)}
                    onDragLeave={() => setDragOverKey((k) => (k === `allday-${key}` ? null : k))}
                    onDrop={(e) => onDayDrop(e, d)}
                    className={`min-h-[32px] border-l border-gray-100 p-1 space-y-1 cursor-pointer hover:bg-gray-50 ${dragOverKey === `allday-${key}` ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : ''}`}
                  >
                    {untimed.map((item) => <ItemChip key={item.id} item={item} />)}
                  </div>
                )
              })}
            </div>

            <div ref={weekScrollRef} className="overflow-y-auto" style={{ maxHeight: (BUSINESS_END - BUSINESS_START) * HOUR_HEIGHT }}>
              <div className="grid relative" style={{ gridTemplateColumns: '48px repeat(7, 1fr)', height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}>
                <div className="relative">
                  {hours.map((h) => (
                    <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * HOUR_HEIGHT - 6 }} className="text-sm text-gray-400 pr-1.5 w-full text-right">
                      {hourLabel(h)}
                    </div>
                  ))}
                </div>
                {days.map((d) => {
                  const key = toISODate(d)
                  const timed = (itemsByDay[key] ?? []).filter((i) => !isUntimed(i.dueDate))
                  return (
                    <div
                      key={key}
                      onClick={() => openCreateOn(d)}
                      onDragOver={(e) => onDayDragOver(e, key)}
                      onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                      onDrop={(e) => onDayDrop(e, d)}
                      className={`relative border-l border-gray-100 cursor-pointer hover:bg-gray-50/60 ${dragOverKey === key ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : ''}`}
                    >
                      {hours.map((h) => (
                        <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * HOUR_HEIGHT, width: '100%', borderTop: '1px solid #f3f4f6' }} />
                      ))}
                      {timed.map((item) => {
                        const frac = timeFraction(item.dueDate!)
                        const top = Math.max(0, frac - HOUR_START) * HOUR_HEIGHT
                        const durationHours = item.estimatedHours > 0 ? item.estimatedHours : 1
                        const height = Math.max(20, durationHours * HOUR_HEIGHT)
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, item.id) }}
                            onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                            title={`${item.title} · ${item.assignedUserName ?? item.assignedTeamName ?? 'Unassigned'} (drag to reschedule)`}
                            style={{ position: 'absolute', top, height, left: 2, right: 2 }}
                            className="rounded bg-indigo-50 border border-indigo-200 hover:border-indigo-400 overflow-hidden px-1.5 py-0.5 text-sm cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorFor(item.assignedUserName ?? item.assignedTeamName ?? item.id)}`} />
                              <span className="font-medium text-gray-700 shrink-0">{formatTime(item.dueDate!)}</span>
                            </div>
                            <div className="truncate text-gray-600">{item.title}</div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <WorkItemFormModal
          title={editing ? 'Edit Work Item' : 'New Work Item'}
          form={form}
          onChange={set}
          projects={projects}
          users={users}
          teams={teams}
          onSave={save}
          onClose={() => setShowModal(false)}
          error={formError}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAlert } from '../context/AlertContext'
import { IconBack, IconSave, IconReject } from '../components/RibbonButton'
import { Breadcrumb, Toolbar, ToolbarButton, RecordHeader } from '../components/DetailChrome'
import Subgrid from '../components/Subgrid'
import PickerModal from '../components/PickerModal'

interface SecurityRoleRef { id: string; name: string }
interface Team {
  id: string; name: string; managerId?: string | null; managerName?: string
  securityRoles: SecurityRoleRef[]; memberCount: number; createdAt: string
}
interface User { id: string; firstName: string; lastName: string }
interface Member { id: string; firstName: string; lastName: string; email: string; isActive: boolean }

const empty = { name: '', managerId: '', securityRoleIds: [] as string[] }

function apiErrorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback
}

export default function TeamDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const base = location.pathname.startsWith('/setting') ? '/setting/teams' : '/resource/teams'
  const { user: me } = useAuth()
  const isAdmin = me?.roles?.includes('Admin') ?? false
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { showAlert } = useAlert()

  const [team, setTeam] = useState<Team | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [allRoles, setAllRoles] = useState<SecurityRoleRef[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [showRolePicker, setShowRolePicker] = useState(false)

  useEffect(() => {
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setUsers(r.data.items))
    api.get('/securityroles').then((r) => setAllRoles(r.data))
  }, [])

  const loadTeam = () => api.get(`/teams/${id}`).then((r) => {
    const t: Team = r.data
    setTeam(t)
    setForm({ name: t.name, managerId: t.managerId ?? '', securityRoleIds: t.securityRoles.map((x) => x.id) })
    setIsDirty(false)
  })

  const loadMembers = () => api.get(`/teams/${id}/members`).then((r) => setMembers(r.data))

  useEffect(() => {
    if (isNew) {
      setTeam({ id: '', name: '', managerId: null, securityRoles: [], memberCount: 0, createdAt: new Date().toISOString() })
      setForm(empty)
      setMembers([])
      setIsDirty(false)
      return
    }
    loadTeam()
    loadMembers()
  }, [id])

  useEffect(() => { setDirty(isDirty) }, [isDirty, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])

  const set = (k: keyof typeof form, v: string | string[]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setIsDirty(true)
  }

  const addRole = (r: SecurityRoleRef) => {
    set('securityRoleIds', [...form.securityRoleIds, r.id])
    setShowRolePicker(false)
  }
  const removeRole = (r: SecurityRoleRef) => {
    set('securityRoleIds', form.securityRoleIds.filter((id) => id !== r.id))
  }

  const save = async () => {
    const payload = { name: form.name, managerId: form.managerId || null, securityRoleIds: form.securityRoleIds }
    try {
      if (isNew) {
        const res = await api.post('/teams', payload)
        setIsDirty(false)
        navigate(`${base}/${res.data.id}`, { replace: true })
      } else {
        await api.put(`/teams/${id}`, payload)
        await loadTeam()
      }
    } catch (err) {
      showAlert('Unable to Save Team', apiErrorMessage(err, 'Failed to save team.'))
    }
  }

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  const remove = async () => {
    if (!confirm(`Delete team "${team?.name}"?`)) return
    try {
      await api.delete(`/teams/${id}`)
      navigate(base)
    } catch (err) {
      showAlert('Unable to Delete Team', apiErrorMessage(err, 'Failed to delete team.'))
    }
  }

  if (!team) return null

  const readOnly = !isAdmin
  const saveDisabled = readOnly || !form.name.trim() || (!isNew && !isDirty)
  const displayName = isNew ? (form.name || 'New Team') : team.name
  const selectedRoles = allRoles.filter((r) => form.securityRoleIds.includes(r.id))
  const roleCandidates = allRoles.filter((r) => !form.securityRoleIds.includes(r.id))

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Teams', to: base }, { label: displayName }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate(base)} title="Back to teams" />
          {isAdmin && !isNew && (
            <ToolbarButton icon={<IconReject />} label="Delete" onClick={remove} />
          )}
          {isAdmin && (
            <ToolbarButton
              icon={<IconSave />}
              label={isDirty ? 'Save*' : 'Save'}
              onClick={save}
              disabled={saveDisabled}
              variant="primary"
            />
          )}
        </Toolbar>
      </div>

      <div className="px-6 pb-3">
        <RecordHeader
          icon={<span className="text-sm font-semibold">{displayName.slice(0, 2).toUpperCase()}</span>}
          iconBg="bg-teal-600"
          title={displayName}
          subtitle={`Team${!isNew ? ` · ${team.memberCount} member${team.memberCount === 1 ? '' : 's'}` : ''}`}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.name}
                  disabled={readOnly}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.managerId}
                  disabled={readOnly}
                  onChange={(e) => set('managerId', e.target.value)}
                >
                  <option value="">— None —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>
            </div>

            <Subgrid
              title="Security Roles"
              items={selectedRoles}
              getKey={(r) => r.id}
              renderItem={(r) => <span className="text-sm text-gray-900">{r.name}</span>}
              onAdd={!readOnly ? () => setShowRolePicker(true) : undefined}
              onRemove={!readOnly ? removeRole : undefined}
              emptyMessage="No security roles assigned"
            />
          </div>

          <div className="col-span-6">
            <Subgrid
              title="Members"
              items={members}
              getKey={(m) => m.id}
              renderItem={(m) => (
                <div>
                  <div className="text-sm text-gray-900">{m.firstName} {m.lastName}</div>
                  <div className="text-sm text-gray-500">{m.email}</div>
                </div>
              )}
              emptyMessage={isNew ? 'Save the team to see members' : 'No members yet'}
            />
          </div>
        </div>
      </div>

      {showRolePicker && (
        <PickerModal
          title="Add Security Role"
          candidates={roleCandidates}
          getKey={(r) => r.id}
          renderLabel={(r) => r.name}
          onPick={addRole}
          onClose={() => setShowRolePicker(false)}
          emptyMessage="No more security roles to add"
        />
      )}
    </div>
  )
}

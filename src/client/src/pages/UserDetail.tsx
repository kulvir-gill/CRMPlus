import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import api from '../api/client'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import { useAlert } from '../context/AlertContext'
import { IconBack, IconSave, IconPower } from '../components/RibbonButton'
import { Breadcrumb, Toolbar, ToolbarButton, RecordHeader, StatusPill } from '../components/DetailChrome'
import Subgrid from '../components/Subgrid'
import PickerModal from '../components/PickerModal'

interface SecurityRoleRef { id: string; name: string }
interface User {
  id: string; firstName: string; lastName: string; email: string; title?: string
  securityRoles: SecurityRoleRef[]; inheritedSecurityRoles: SecurityRoleRef[]
  teamIds?: string[]; teamNames?: string[]; managerId?: string | null; managerName?: string; isActive: boolean
}
interface Team { id: string; name: string }

const empty = {
  firstName: '', lastName: '', email: '', password: '', title: '',
  securityRoleIds: [] as string[], teamIds: [] as string[], managerId: '', isActive: true,
}

function apiErrorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback
}

const avatarPalette = ['bg-indigo-700', 'bg-teal-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600']
function avatarColor(seed: string) {
  const code = seed.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return avatarPalette[code % avatarPalette.length]
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function UserDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const isAdmin = me?.roles?.includes('Admin') ?? false
  const { setDirty, registerSave, guardedNavigate } = useUnsavedChanges()
  const { showAlert } = useAlert()

  const [record, setRecord] = useState<User | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [allRoles, setAllRoles] = useState<SecurityRoleRef[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [form, setForm] = useState(empty)
  const [isDirty, setIsDirty] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)

  useEffect(() => {
    api.get('/teams').then((r) => setTeams(r.data))
    api.get('/securityroles').then((r) => setAllRoles(r.data))
    api.get('/users', { params: { isActive: true, pageSize: 1000 } }).then((r) => setAllUsers(r.data.items))
  }, [])

  const loadUser = () => api.get(`/users/${id}`).then((r) => {
    const u: User = r.data
    setRecord(u)
    setForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', title: u.title ?? '',
      securityRoleIds: u.securityRoles.map((x) => x.id), teamIds: u.teamIds ?? [], managerId: u.managerId ?? '', isActive: u.isActive,
    })
    setIsDirty(false)
  })

  useEffect(() => {
    if (isNew) {
      setRecord({ id: '', firstName: '', lastName: '', email: '', securityRoles: [], inheritedSecurityRoles: [], teamIds: [], isActive: true })
      setForm(empty)
      setIsDirty(false)
      return
    }
    loadUser()
  }, [id])

  useEffect(() => { setDirty(isDirty) }, [isDirty, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])

  const set = (k: keyof typeof form, v: string | boolean | string[]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setIsDirty(true)
  }

  const addRole = (r: SecurityRoleRef) => { set('securityRoleIds', [...form.securityRoleIds, r.id]); setShowRolePicker(false) }
  const removeRole = (r: SecurityRoleRef) => set('securityRoleIds', form.securityRoleIds.filter((x) => x !== r.id))
  const addTeam = (t: Team) => { set('teamIds', [...form.teamIds, t.id]); setShowTeamPicker(false) }
  const removeTeam = (t: Team) => set('teamIds', form.teamIds.filter((x) => x !== t.id))

  const save = async () => {
    try {
      if (isNew) {
        if (!form.password || form.password.length < 6) {
          showAlert('Unable to Save User', 'Password must be at least 6 characters.')
          return
        }
        const res = await api.post('/users', {
          firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, title: form.title || null,
          securityRoleIds: form.securityRoleIds, teamIds: form.teamIds, managerId: form.managerId || null, isActive: form.isActive,
        })
        setIsDirty(false)
        navigate(`/setting/users/${res.data.id}`, { replace: true })
      } else {
        await api.put(`/users/${id}`, {
          firstName: form.firstName, lastName: form.lastName, title: form.title || null,
          securityRoleIds: form.securityRoleIds, teamIds: form.teamIds, managerId: form.managerId || null, isActive: form.isActive,
        })
        await loadUser()
      }
    } catch (err) {
      showAlert('Unable to Save User', apiErrorMessage(err, 'Failed to save user.'))
    }
  }

  useEffect(() => {
    registerSave(save)
    return () => registerSave(null)
  })

  const toggleActive = async () => {
    if (!record || isNew) return
    try {
      await api.put(`/users/${id}`, {
        firstName: form.firstName, lastName: form.lastName, title: form.title || null,
        securityRoleIds: form.securityRoleIds, teamIds: form.teamIds, managerId: form.managerId || null, isActive: !record.isActive,
      })
      await loadUser()
    } catch (err) {
      showAlert('Unable to Update User', apiErrorMessage(err, 'Failed to update user.'))
    }
  }

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Unable to Reset Password', 'Password must be at least 6 characters.')
      return
    }
    try {
      await api.post(`/users/${id}/reset-password`, { newPassword })
      setShowResetModal(false)
      setNewPassword('')
      showAlert('Password Reset', `${form.firstName} ${form.lastName}'s password has been reset.`)
    } catch (err) {
      showAlert('Unable to Reset Password', apiErrorMessage(err, 'Failed to reset password.'))
    }
  }

  if (!record) return null

  const readOnly = !isAdmin
  const saveDisabled = readOnly || (!isNew && !isDirty) || !form.firstName.trim() || !form.lastName.trim() || (isNew && !form.email.trim())
  const displayName = isNew ? (form.firstName || form.lastName ? `${form.firstName} ${form.lastName}` : 'New User') : `${record.firstName} ${record.lastName}`

  const selectedRoles = allRoles.filter((r) => form.securityRoleIds.includes(r.id))
  const roleCandidates = allRoles.filter((r) => !form.securityRoleIds.includes(r.id))
  const selectedTeams = teams.filter((t) => form.teamIds.includes(t.id))
  const teamCandidates = teams.filter((t) => !form.teamIds.includes(t.id))

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3">
        <Breadcrumb items={[{ label: 'Users', to: '/setting/users' }, { label: displayName }]} />
        <Toolbar>
          <ToolbarButton icon={<IconBack />} label="Back" onClick={() => guardedNavigate('/setting/users')} title="Back to users" />
          {isAdmin && !isNew && (
            <>
              <ToolbarButton icon={<IconPower />} label={record.isActive ? 'Deactivate' : 'Activate'} onClick={toggleActive} />
              <ToolbarButton icon={<IconSave />} label="Reset Password" onClick={() => setShowResetModal(true)} />
            </>
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
          icon={<span className="text-sm font-semibold">{initials(displayName)}</span>}
          iconBg={avatarColor(displayName)}
          title={displayName}
          subtitle={`${record.title ? `${record.title} · ` : ''}User${!isNew && record.email ? ` · ${record.email}` : ''}`}
          badge={!isNew && !record.isActive ? <StatusPill label="Inactive" tone="gray" /> : undefined}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-6 bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.firstName}
                  disabled={readOnly}
                  onChange={(e) => set('firstName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.lastName}
                  disabled={readOnly}
                  onChange={(e) => set('lastName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                {isNew ? (
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                    value={form.email}
                    disabled={readOnly}
                    onChange={(e) => set('email', e.target.value)}
                  />
                ) : (
                  <div className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">{record.email}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.title}
                  disabled={readOnly}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Software Engineer"
                />
              </div>
              {isNew && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                    value={form.password}
                    disabled={readOnly}
                    onChange={(e) => set('password', e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.managerId}
                  disabled={readOnly}
                  onChange={(e) => set('managerId', e.target.value)}
                >
                  <option value="">— None —</option>
                  {allUsers.filter((u) => u.id !== record.id).map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="col-span-6 space-y-4">
            <Subgrid
              title="Security Roles"
              items={selectedRoles}
              getKey={(r) => r.id}
              renderItem={(r) => <span className="text-sm text-gray-900">{r.name}</span>}
              onAdd={!readOnly ? () => setShowRolePicker(true) : undefined}
              onRemove={!readOnly ? removeRole : undefined}
              emptyMessage="No security roles assigned directly"
            />

            <Subgrid
              title="Teams"
              items={selectedTeams}
              getKey={(t) => t.id}
              renderItem={(t) => <span className="text-sm text-gray-900">{t.name}</span>}
              onAdd={!readOnly ? () => setShowTeamPicker(true) : undefined}
              onRemove={!readOnly ? removeTeam : undefined}
              emptyMessage="Not a member of any team"
            />

            <Subgrid
              title="Inherited Security Roles (via Teams)"
              items={record.inheritedSecurityRoles}
              getKey={(r) => r.id}
              renderItem={(r) => <span className="text-sm text-gray-900">{r.name}</span>}
              emptyMessage="No security roles inherited from teams"
            />
          </div>
        </div>
      </div>

      {showResetModal && (
        <Modal title="Reset Password" onClose={() => { setShowResetModal(false); setNewPassword('') }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Set a new password for {record.firstName} {record.lastName}.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowResetModal(false); setNewPassword('') }} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={resetPassword} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Reset Password</button>
            </div>
          </div>
        </Modal>
      )}

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

      {showTeamPicker && (
        <PickerModal
          title="Add Team"
          candidates={teamCandidates}
          getKey={(t) => t.id}
          renderLabel={(t) => t.name}
          onPick={addTeam}
          onClose={() => setShowTeamPicker(false)}
          emptyMessage="No more teams to add"
        />
      )}
    </div>
  )
}

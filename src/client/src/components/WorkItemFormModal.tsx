import Modal from './Modal'

export interface WorkItemFormValues {
  title: string; description: string; projectId: string; assignedUserId: string; assignedTeamId: string
  status: string; priority: string; isActive: boolean; dueDate: string; dueTime: string; estimatedHours: string
}

export const emptyWorkItemForm: WorkItemFormValues = {
  title: '', description: '', projectId: '', assignedUserId: '', assignedTeamId: '',
  status: 'Backlog', priority: 'Medium', isActive: true, dueDate: '', dueTime: '09:00', estimatedHours: '0',
}

export const workItemStatuses = ['Backlog', 'InProgress', 'InReview', 'Done', 'Cancelled']
export const workItemPriorities = ['Low', 'Medium', 'High', 'Critical']

export function combineDueDateTime(dueDate: string, dueTime: string): string | null {
  if (!dueDate) return null
  return `${dueDate}T${dueTime || '09:00'}:00`
}

export function splitDueDateTime(iso?: string): { dueDate: string; dueTime: string } {
  if (!iso) return { dueDate: '', dueTime: '09:00' }
  const [datePart, timePart] = iso.split('T')
  return { dueDate: datePart, dueTime: timePart ? timePart.slice(0, 5) : '09:00' }
}

interface Project { id: string; name: string }
interface User { id: string; firstName: string; lastName: string }
interface Team { id: string; name: string }

interface Props {
  title: string
  form: WorkItemFormValues
  onChange: (k: keyof WorkItemFormValues, v: string | boolean) => void
  projects: Project[]
  users: User[]
  teams: Team[]
  onSave: () => void
  onClose: () => void
  error?: string | null
}

export default function WorkItemFormModal({ title, form, onChange, projects, users, teams, onSave, onClose, error }: Props) {
  const assigneeValue = form.assignedTeamId ? `team:${form.assignedTeamId}` : form.assignedUserId ? `user:${form.assignedUserId}` : ''
  const onAssigneeChange = (value: string) => {
    if (value.startsWith('user:')) { onChange('assignedUserId', value.slice(5)); onChange('assignedTeamId', '') }
    else if (value.startsWith('team:')) { onChange('assignedTeamId', value.slice(5)); onChange('assignedUserId', '') }
    else { onChange('assignedUserId', ''); onChange('assignedTeamId', '') }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={(e) => onChange('title', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(e) => onChange('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.projectId} onChange={(e) => onChange('projectId', e.target.value)}>
              <option value="">— Select —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={assigneeValue} onChange={(e) => onAssigneeChange(e.target.value)}>
              <option value="">— None —</option>
              <optgroup label="Teams">
                {teams.map((t) => <option key={t.id} value={`team:${t.id}`}>{t.name}</option>)}
              </optgroup>
              <optgroup label="Users">
                {users.map((u) => <option key={u.id} value={`user:${u.id}`}>{u.firstName} {u.lastName}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => onChange('status', e.target.value)}>
              {workItemStatuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={(e) => onChange('priority', e.target.value)}>
              {workItemPriorities.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate} onChange={(e) => onChange('dueDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
            <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueTime} onChange={(e) => onChange('dueTime', e.target.value)} disabled={!form.dueDate} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
            <input type="number" min="0" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.estimatedHours} onChange={(e) => onChange('estimatedHours', e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => onChange('isActive', e.target.checked)} />
          Active
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
        </div>
      </div>
    </Modal>
  )
}

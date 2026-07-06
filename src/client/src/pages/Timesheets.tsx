import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'

interface Timesheet { id: number; userName: string; weekStartDate: string; status: string; totalHours: number; notes?: string; rejectionReason?: string }

const statusColor: Record<string, string> = { Draft: 'bg-gray-100 text-gray-700', Submitted: 'bg-yellow-100 text-yellow-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700' }

export default function Timesheets() {
  const { user } = useAuth()
  const isManager = user?.role === 'Manager' || user?.role === 'Admin'
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [showPending, setShowPending] = useState(false)
  const [reviewId, setReviewId] = useState<number | null>(null)
  const [reviewStatus, setReviewStatus] = useState('Approved')
  const [rejectionReason, setRejectionReason] = useState('')

  const load = () =>
    api.get('/timesheets', { params: { myTimesheets: !showPending, pendingApproval: showPending } })
      .then((r) => setTimesheets(r.data))

  useEffect(() => { load() }, [showPending])

  const submit = async (id: number) => {
    await api.post(`/timesheets/${id}/submit`)
    load()
  }

  const review = async () => {
    const statusMap: Record<string, number> = { Approved: 2, Rejected: 3 }
    await api.post(`/timesheets/${reviewId}/review`, { status: statusMap[reviewStatus], rejectionReason })
    setReviewId(null); load()
  }

  return (
    <div>
      <PageHeader title="Timesheets" />
      <div className="p-6">
        {isManager && (
          <div className="flex gap-3 mb-4">
            <button onClick={() => setShowPending(false)} className={`text-sm px-4 py-2 rounded-lg border ${!showPending ? 'bg-indigo-600 text-white border-indigo-600' : ''}`}>My Timesheets</button>
            <button onClick={() => setShowPending(true)} className={`text-sm px-4 py-2 rounded-lg border ${showPending ? 'bg-indigo-600 text-white border-indigo-600' : ''}`}>Pending Approval</button>
          </div>
        )}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>{['Employee', 'Week', 'Total Hours', 'Status', 'Notes', ''].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {timesheets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.userName}</td>
                  <td className="px-4 py-3">{new Date(t.weekStartDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{t.totalHours}h</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status] ?? ''}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{t.notes ?? t.rejectionReason ?? '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {t.status === 'Draft' && <button onClick={() => submit(t.id)} className="text-indigo-600 hover:underline">Submit</button>}
                    {isManager && t.status === 'Submitted' && <button onClick={() => setReviewId(t.id)} className="text-indigo-600 hover:underline">Review</button>}
                  </td>
                </tr>
              ))}
              {timesheets.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No timesheets</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {reviewId && (
        <Modal title="Review Timesheet" onClose={() => setReviewId(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
            {reviewStatus === 'Rejected' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setReviewId(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={review} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Submit Review</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

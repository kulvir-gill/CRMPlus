import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'

interface Team { id: string; name: string; managerName?: string; memberCount: number }

export default function Teams() {
  const navigate = useNavigate()
  const location = useLocation()
  const base = location.pathname.startsWith('/setting') ? '/setting/teams' : '/resource/teams'
  const { user: me } = useAuth()
  const isAdmin = me?.roles?.includes('Admin')
  const [teams, setTeams] = useState<Team[]>([])

  useEffect(() => { api.get('/teams').then((r) => setTeams(r.data)) }, [])

  return (
    <div>
      <PageHeader title="Teams" subtitle={`${teams.length} teams`}
        action={isAdmin ? <button onClick={() => navigate(`${base}/new`)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">+ New Team</button> : undefined} />
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <button key={t.id} onClick={() => navigate(`${base}/${t.id}`)} className="text-left bg-white rounded-xl border p-5 hover:border-indigo-300 hover:shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-1">{t.name}</h4>
            <p className="text-sm text-gray-500">Manager: {t.managerName ?? '—'}</p>
            <p className="text-sm text-gray-500">{t.memberCount} members</p>
          </button>
        ))}
        {teams.length === 0 && <p className="text-gray-500">No teams yet</p>}
      </div>
    </div>
  )
}

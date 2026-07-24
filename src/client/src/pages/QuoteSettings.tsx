import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import PageHeader from '../components/PageHeader'

interface QuoteSettingsData { id: string; defaultValidityDays: number; documentLocation?: string | null }

function apiErrorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback
}

export default function QuoteSettings() {
  const { user: me } = useAuth()
  const isAdmin = me?.roles?.includes('Admin') ?? false
  const { showAlert } = useAlert()
  const [settings, setSettings] = useState<QuoteSettingsData | null>(null)
  const [validityDays, setValidityDays] = useState('30')
  const [documentLocation, setDocumentLocation] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/quotesettings').then((r) => {
    setSettings(r.data)
    setValidityDays(String(r.data.defaultValidityDays))
    setDocumentLocation(r.data.documentLocation ?? '')
    setIsDirty(false)
  })

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/quotesettings', { defaultValidityDays: parseInt(validityDays, 10) || 0, documentLocation: documentLocation.trim() || null })
      await load()
    } catch (err) {
      showAlert('Unable to Save Quote Settings', apiErrorMessage(err, 'Failed to save quote settings.'))
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return null

  return (
    <div>
      <PageHeader title="Admin Setting" subtitle="Defaults applied when quotes are created or revised" />
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 max-w-lg">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase tracking-wide">Quote Validation</div>
          <div className="divide-y divide-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-40 shrink-0 text-sm text-gray-500">Default Validity (days)</div>
              {isAdmin ? (
                <input
                  type="number"
                  min={0}
                  value={validityDays}
                  onChange={(e) => { setValidityDays(e.target.value); setIsDirty(true) }}
                  className="flex-1 min-w-0 text-sm text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              ) : (
                <div className="flex-1 min-w-0 text-sm text-gray-500">{validityDays}</div>
              )}
            </div>
            <div className="px-4 py-3 text-sm text-gray-500">
              New quotes set their Valid Until date to the creation date plus this many days. Revising a quote recalculates
              Valid Until the same way from the revision date.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 max-w-lg">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase tracking-wide">Document Storage</div>
          <div className="divide-y divide-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-40 shrink-0 text-sm text-gray-500">Document Location</div>
              {isAdmin ? (
                <input
                  value={documentLocation}
                  onChange={(e) => { setDocumentLocation(e.target.value); setIsDirty(true) }}
                  placeholder="e.g. D:\CRMPlusDocuments"
                  className="flex-1 min-w-0 text-sm text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              ) : (
                <div className="flex-1 min-w-0 text-sm text-gray-500">{documentLocation || '—'}</div>
              )}
            </div>
            <div className="px-4 py-3 text-sm text-gray-500">
              A folder on the server where generated documents are saved. Each account gets a subfolder named after its account
              number, created automatically when the account is saved. Generated quote documents are saved under
              <code className="mx-1 px-1 py-0.5 bg-gray-100 rounded">{'{Document Location}\\{Account #}\\quote\\{Quote #}.pdf'}</code>.
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="max-w-lg flex justify-end">
            <button
              onClick={save}
              disabled={!isDirty || saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

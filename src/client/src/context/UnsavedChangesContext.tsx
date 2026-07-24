import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type NavigateTarget = string | number

interface UnsavedChangesContextType {
  isDirty: boolean
  setDirty: (v: boolean) => void
  registerSave: (fn: (() => Promise<void>) | null) => void
  guardedNavigate: (to: NavigateTarget) => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>(null!)

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [isDirty, setIsDirty] = useState(false)
  const [pendingTo, setPendingTo] = useState<NavigateTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const saveRef = useRef<(() => Promise<void>) | null>(null)

  const setDirty = useCallback((v: boolean) => setIsDirty(v), [])
  const registerSave = useCallback((fn: (() => Promise<void>) | null) => { saveRef.current = fn }, [])

  const goTo = (to: NavigateTarget) => {
    if (typeof to === 'number') navigate(to)
    else navigate(to)
  }

  const guardedNavigate = useCallback((to: NavigateTarget) => {
    if (isDirty) setPendingTo(to)
    else goTo(to)
  }, [isDirty, navigate])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const cancel = () => setPendingTo(null)

  const discard = () => {
    const to = pendingTo
    setIsDirty(false)
    setPendingTo(null)
    if (to !== null) goTo(to)
  }

  const saveAndGo = async () => {
    if (saveRef.current) {
      setSaving(true)
      try {
        await saveRef.current()
      } finally {
        setSaving(false)
      }
    }
    const to = pendingTo
    setIsDirty(false)
    setPendingTo(null)
    if (to !== null) goTo(to)
  }

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, registerSave, guardedNavigate }}>
      {children}
      {pendingTo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={cancel}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 border border-gray-300 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-bold text-gray-900">Unsaved Changes</h3>
              <button onClick={cancel} className="text-gray-400 hover:text-gray-600 text-sm leading-none shrink-0">&times;</button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              You have unsaved changes on this record. Do you want to save them before leaving, or discard them?
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={cancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={discard} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Discard Changes</button>
              <button
                onClick={saveAndGo}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  )
}

export const useUnsavedChanges = () => useContext(UnsavedChangesContext)

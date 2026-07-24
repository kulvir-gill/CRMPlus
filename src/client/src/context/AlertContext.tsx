import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface AlertState { title: string; message: string }

interface AlertContextType {
  showAlert: (title: string, message: string) => void
}

const AlertContext = createContext<AlertContextType>(null!)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState | null>(null)

  const showAlert = useCallback((title: string, message: string) => setAlertState({ title, message }), [])
  const close = () => setAlertState(null)

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alertState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={close}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 border border-gray-300 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-sm font-bold text-gray-900">{alertState.title}</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-sm leading-none shrink-0">&times;</button>
            </div>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{alertState.message}</p>
            <button onClick={close} className="mt-5 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Close
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
}

export const useAlert = () => useContext(AlertContext)

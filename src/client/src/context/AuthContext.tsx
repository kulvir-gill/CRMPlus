import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../api/client'

interface AuthUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  modules: string[]
  moduleAccess: string[]
  token: string
}

export function getAccessLevel(user: AuthUser | null, module: string): 'Full' | 'ReadOnly' | 'UserLevel' {
  const entry = user?.moduleAccess?.find((m) => m.startsWith(`${module}:`))
  const level = entry?.split(':')[1]
  return level === 'ReadOnly' || level === 'UserLevel' ? level : 'Full'
}

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('user')
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed.roles) || !Array.isArray(parsed.modules) || !Array.isArray(parsed.moduleAccess)) {
      // Stale session from before multi-role/module/access-level support (or otherwise malformed) - force a fresh login.
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }
    return parsed
  })

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    setUser(data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

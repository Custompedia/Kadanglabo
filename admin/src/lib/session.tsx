import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from './api'

export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'editor'
}

interface Session {
  /** undefined while checking, null when signed out */
  user: User | null | undefined
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

const Ctx = createContext<Session>(null as never)
export const useSession = () => useContext(Ctx)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
  }, [])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  return <Ctx.Provider value={{ user, setUser, logout }}>{children}</Ctx.Provider>
}

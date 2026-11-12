import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api'
import { http } from '../http/httpClient'
import { storageService } from '../services/storageService'
import { socketService } from '../services/socketService'
import { clearAllResourceCaches } from '../lib/resourceCache'
import type { User } from '../types'

interface AuthApi { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => Promise<void>; refreshUser: () => Promise<void>; isAdmin: boolean }
const Ctx = createContext<AuthApi | null>(null)

/** AuthProvider — holds the signed-in user; bootstraps via refresh cookie. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => { try { setUser(await authApi.me()) } catch { setUser(null) } }, [])

  useEffect(() => {
    (async () => {
      if (!storageService.getAccessToken()) await http.refresh()
      if (storageService.getAccessToken()) await refreshUser()
      setLoading(false)
    })()
    return http.onUnauthorized(() => { setUser(null); socketService.disconnect() })
  }, [refreshUser])

  useEffect(() => { if (user) socketService.connect(); else socketService.disconnect() }, [user])

  const login = async (email: string, password: string) => {
    const r = await authApi.login(email, password)
    storageService.setAccessToken(r.accessToken)
    setUser(r.user)
    return r.user
  }
  const logout = async () => { try { await authApi.logout() } catch { /* ignore */ } storageService.setAccessToken(null); socketService.disconnect(); clearAllResourceCaches(); setUser(null) }

  return <Ctx.Provider value={{ user, loading, login, logout, refreshUser, isAdmin: user?.role === 'admin' }}>{children}</Ctx.Provider>
}
export function useAuth() { const c = useContext(Ctx); if (!c) throw new Error('AuthProvider missing'); return c }

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCurrentUser, loginWithPassword, logoutSession } from './authApi'
import type { AuthUserProfile } from './types'
import { getAccessToken } from './tokenStore'
import { shouldRequireLogin } from './requireLogin'

type AuthState = {
  user: AuthUserProfile | null
  ready: boolean
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    if (!shouldRequireLogin()) {
      setUser(null)
      return
    }
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const u = await fetchCurrentUser()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!shouldRequireLogin()) {
        if (!cancelled) {
          setReady(true)
        }
        return
      }
      const token = getAccessToken()
      if (!token) {
        if (!cancelled) setReady(true)
        return
      }
      try {
        const u = await fetchCurrentUser()
        if (!cancelled) setUser(u)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await loginWithPassword(username, password)
      setError(null)
      setUser(res.user)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    logoutSession()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      loading,
      error,
      login,
      logout,
      refreshUser,
    }),
    [user, ready, loading, error, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export function useOptionalAuth(): AuthState | null {
  return useContext(AuthContext)
}

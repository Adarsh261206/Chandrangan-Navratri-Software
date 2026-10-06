import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError, setCsrfToken } from './api'
import type { AdminUser } from '../types'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  user: AdminUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    let cancelled = false

    api.auth
      .me()
      .then((session) => {
        if (cancelled) return
        setCsrfToken(session.csrf)
        setUser(session.user)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setCsrfToken(null)
        setUser(null)
        if (error instanceof ApiError && error.isNetwork) {
          // Keep the visitor on the login screen; they can retry from there.
          setStatus('anonymous')
          return
        }
        setStatus('anonymous')
      })

    const onUnauthorized = () => {
      setCsrfToken(null)
      setUser(null)
      setStatus('anonymous')
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => {
      cancelled = true
      window.removeEventListener('auth:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const session = await api.auth.login(username, password)
    setCsrfToken(session.csrf)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } catch {
      // Signing out locally still clears the session state.
    }
    setCsrfToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

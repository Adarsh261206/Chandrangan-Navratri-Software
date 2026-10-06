import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../services/auth'
import { Brand } from './Brand'

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-cream-50">
      <Brand />
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-maroon-200 border-t-maroon-700"
        aria-hidden="true"
      />
      <p className="text-sm text-charcoal-500" role="status">
        {label}
      </p>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullScreenLoader label="Checking your session…" />
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}

/** Blocks every account except super_admin (redirects them to their simple home). */
export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { status, isSuperAdmin } = useAuth()

  if (status === 'loading') {
    return <FullScreenLoader label="Checking your session…" />
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return <FullScreenLoader />
  }

  if (status === 'authenticated') {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

/** Focus the main region when the route changes (screen-reader friendly). */
export function useRouteFocus(): void {
  const location = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])
}

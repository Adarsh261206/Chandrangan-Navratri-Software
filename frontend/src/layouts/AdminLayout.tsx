import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import {
  IconDashboard,
  IconGroups,
  IconLogout,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrophy,
} from '../components/ui/Icons'
import { useAuth } from '../services/auth'
import { cn } from '../utils/cn'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/admin/age-groups', label: 'Age Groups', icon: IconGroups, end: false },
  { to: '/admin/participants', label: 'Participants', icon: IconSearch, end: false },
  { to: '/admin/results', label: 'Results', icon: IconTrophy, end: false },
]

const BOTTOM_ITEMS = [
  { to: '/admin', label: 'Home', icon: IconDashboard, end: true },
  { to: '/admin/age-groups', label: 'Groups', icon: IconGroups, end: false },
  { to: '/admin/participants', label: 'Search', icon: IconSearch, end: false },
  { to: '/admin/results', label: 'Results', icon: IconTrophy, end: false },
]

function navLinkClass(isActive: boolean): string {
  return cn(
    'focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
    isActive ? 'bg-maroon-700 text-white shadow-card' : 'text-charcoal-600 hover:bg-cream-200/70'
  )
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
  }

  return (
    <div className="min-h-dvh bg-cream-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-cream-200 bg-white lg:flex">
        <div className="border-b border-cream-200 px-5 py-5">
          <Brand />
        </div>

        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <IconSettings className="h-5 w-5 shrink-0" />
            Settings
          </NavLink>
        </nav>

        <div className="border-t border-cream-200 p-3">
          <Link
            to="/results"
            className="focus-ring mb-2 flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-charcoal-500 hover:bg-cream-100"
          >
            View public results →
          </Link>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-cream-100 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-charcoal-800">
                {user?.username ?? 'Admin'}
              </p>
              <p className="text-xs text-charcoal-500">Signed in</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Log out"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-600 hover:bg-white hover:text-maroon-700"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-cream-200 bg-white/95 backdrop-blur-sm lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/admin" aria-label="Go to dashboard">
            <Brand />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/results"
              aria-label="View public results"
              className="focus-ring flex h-10 items-center rounded-lg px-2 text-xs font-semibold text-charcoal-600 hover:bg-cream-100"
            >
              Public
            </Link>
            <Link
              to="/admin/settings"
              aria-label="Settings"
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-charcoal-600 hover:bg-cream-100"
            >
              <IconSettings className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Log out"
              disabled={loggingOut}
              className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-charcoal-600 hover:bg-cream-100 hover:text-maroon-700 disabled:opacity-60"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main
        key={location.pathname}
        className="px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:ml-64 lg:px-8 lg:pb-10"
      >
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Bottom navigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/97 backdrop-blur-sm lg:hidden"
      >
        <div className="grid grid-cols-5">
          {BOTTOM_ITEMS.slice(0, 2).map((item) => (
            <BottomLink key={item.to} {...item} />
          ))}
          <div className="flex items-start justify-center">
            <Link
              to="/admin/participants/new"
              aria-label="Add participant"
              className="focus-ring -mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-maroon-700 text-white shadow-card-hover transition-transform active:scale-95"
            >
              <IconPlus className="h-7 w-7" />
            </Link>
          </div>
          {BOTTOM_ITEMS.slice(2).map((item) => (
            <BottomLink key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function BottomLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof IconDashboard
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'focus-ring flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
          isActive ? 'text-maroon-700' : 'text-charcoal-500'
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}

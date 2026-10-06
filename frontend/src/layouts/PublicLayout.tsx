import { Link, Outlet } from 'react-router-dom'
import { Brand } from '../components/Brand'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream-50">
      <header className="festive-pattern bg-maroon-800 text-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link to="/" aria-label="ChandranganXSumit Navratrotsav home">
            <Brand inverted />
          </Link>
          <Link
            to="/login"
            className="focus-ring shrink-0 rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-cream-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 py-5 text-center text-xs text-charcoal-500 sm:px-6">
          <p className="font-semibold text-charcoal-700">
            ChandranganXSumit Navratrotsav — Navratri Prize Results
          </p>
          <p>Results are updated live by event volunteers.</p>
        </div>
      </footer>
    </div>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { IconArrowLeft } from '../components/ui/Icons'

export default function NotFoundPage() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<span className="text-3xl font-extrabold">404</span>}
        title="Page not found"
        description="The page you are looking for does not exist or may have moved."
        action={
          <Link
            to={isAdmin ? '/admin' : '/results'}
            className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl bg-maroon-700 px-5 text-sm font-semibold text-white hover:bg-maroon-800"
          >
            <IconArrowLeft className="h-4 w-4" />
            {isAdmin ? 'Back to Dashboard' : 'Back to Results'}
          </Link>
        }
      />
    </div>
  )
}

import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  FullScreenLoader,
  RedirectIfAuthenticated,
  RequireAuth,
  RequireSuperAdmin,
  useRouteFocus,
} from './components/Guards'
import { useAuth } from './services/auth'
import { AdminLayout } from './layouts/AdminLayout'
import { PublicLayout } from './layouts/PublicLayout'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AgeGroupsPage = lazy(() => import('./pages/AgeGroupsPage'))
const AgeGroupDetailPage = lazy(() => import('./pages/AgeGroupDetailPage'))
const ParticipantsPage = lazy(() => import('./pages/ParticipantsPage'))
const AddParticipantPage = lazy(() => import('./pages/AddParticipantPage'))
const ParticipantDetailPage = lazy(() => import('./pages/ParticipantDetailPage'))
const ResultsAdminPage = lazy(() => import('./pages/ResultsAdminPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PublicResultsPage = lazy(() => import('./pages/PublicResultsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const SimpleHomePage = lazy(() => import('./pages/SimpleHomePage'))

/** Super admins land on the dashboard; the limited admin role gets the simple home. */
function AdminHomePage() {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin ? <DashboardPage /> : <SimpleHomePage />
}

function RouteFallback() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <FullScreenLoader label="Loading…" />
    </div>
  )
}

function App() {
  useRouteFocus()
  const location = useLocation()

  return (
    <Suspense fallback={<RouteFallback />} key={location.pathname}>
      <Routes>
        <Route path="/" element={<Navigate to="/results" replace />} />

        <Route element={<PublicLayout />}>
          <Route path="/results" element={<PublicResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminHomePage />} />
          <Route
            path="age-groups"
            element={
              <RequireSuperAdmin>
                <AgeGroupsPage />
              </RequireSuperAdmin>
            }
          />
          <Route
            path="age-groups/:groupId"
            element={
              <RequireSuperAdmin>
                <AgeGroupDetailPage />
              </RequireSuperAdmin>
            }
          />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="participants/new" element={<AddParticipantPage />} />
          <Route path="participants/:participantId" element={<ParticipantDetailPage />} />
          <Route
            path="results"
            element={
              <RequireSuperAdmin>
                <ResultsAdminPage />
              </RequireSuperAdmin>
            }
          />
          <Route
            path="settings"
            element={
              <RequireSuperAdmin>
                <SettingsPage />
              </RequireSuperAdmin>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App

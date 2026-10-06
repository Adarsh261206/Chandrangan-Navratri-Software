import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FullScreenLoader, RedirectIfAuthenticated, RequireAuth, useRouteFocus } from './components/Guards'
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
          <Route index element={<DashboardPage />} />
          <Route path="age-groups" element={<AgeGroupsPage />} />
          <Route path="age-groups/:groupId" element={<AgeGroupDetailPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="participants/new" element={<AddParticipantPage />} />
          <Route path="participants/:participantId" element={<ParticipantDetailPage />} />
          <Route path="results" element={<ResultsAdminPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App

import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { mockups } from './mockups/registry'
import { useAuth } from './contexts/AuthContext'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const LeadDetailPage = lazy(() => import('./pages/LeadDetailPage'))
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'))
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'))
const InboxPage = lazy(() => import('./pages/InboxPage'))
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const SignRequestPage = lazy(() => import('./pages/SignRequestPage'))
const SignPage = lazy(() => import('./pages/SignPage'))
const TrackingPage = lazy(() => import('./pages/TrackingPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminIntegrationsPage = lazy(() => import('./pages/AdminIntegrationsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const DesignIndex = lazy(() => import('./pages/design/DesignIndex'))
const DesignSystem = lazy(() => import('./pages/design/DesignSystem'))
const DesignGuide = lazy(() => import('./pages/design/DesignGuide'))

/** MockupRoute — resolves `/design/:name` to its lazy mockup component. */
function MockupRoute() {
  const { name } = useParams()
  const entry = mockups.find((m) => m.name === name)
  if (!entry) return <Navigate to="/design/index" replace />
  const Cmp = entry.component
  return <Cmp />
}

/** Protected — requires a signed-in user (optionally admin). */
function Protected({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Fallback />
  if (!user) return <Navigate to="/login" replace />
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function Fallback() {
  return <div data-cmp="app.loading_div" className="h-full w-full flex items-center justify-center text-sm text-fg-muted">Loading…</div>
}

/** App — top-level router: product routes + design mockups. */
export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/inbox" element={<Protected><InboxPage /></Protected>} />
        <Route path="/inbox/:threadId" element={<Protected><InboxPage /></Protected>} />
        <Route path="/leads" element={<Protected><LeadsPage /></Protected>} />
        <Route path="/leads/:id" element={<Protected><LeadDetailPage /></Protected>} />
        <Route path="/companies" element={<Protected><CompaniesPage /></Protected>} />
        <Route path="/companies/:id" element={<Protected><CompanyDetailPage /></Protected>} />
        <Route path="/knowledge" element={<Protected><KnowledgePage /></Protected>} />
        <Route path="/calendar" element={<Protected><CalendarPage /></Protected>} />
        <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
        <Route path="/documents" element={<Protected><DocumentsPage /></Protected>} />
        <Route path="/documents/:id" element={<Protected><SignRequestPage /></Protected>} />
        {/* Public: a recipient signs through their private link, no login. */}
        <Route path="/sign/:token" element={<SignPage />} />
        <Route path="/tracking" element={<Protected><TrackingPage /></Protected>} />
        <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/admin/users" element={<Protected admin><AdminUsersPage /></Protected>} />
        <Route path="/admin/integrations" element={<Protected admin><AdminIntegrationsPage /></Protected>} />
        <Route path="/design" element={<Navigate to="/design/index" replace />} />
        <Route path="/design/index" element={<DesignIndex />} />
        <Route path="/design/design-system" element={<DesignSystem />} />
        <Route path="/design-guide" element={<DesignGuide />} />
        <Route path="/design/:name" element={<MockupRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

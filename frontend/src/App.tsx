import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuthStore, isOrganizer, isSuperAdmin } from './store'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy-loaded page components
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Home = lazy(() => import('./pages/Home'))
const Events = lazy(() => import('./pages/Events'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const CreateEvent = lazy(() => import('./pages/CreateEvent'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MyRegistrations = lazy(() => import('./pages/MyRegistrations'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const Scanner = lazy(() => import('./pages/admin/Scanner'))
const OrganizerAnalytics = lazy(() => import('./pages/organizer/Analytics'))
const SubmitProject = lazy(() => import('./pages/SubmitProject'))
const TeamBoard = lazy(() => import('./pages/TeamBoard'))
const JudgingDashboard = lazy(() => import('./pages/JudgingDashboard'))
const MentorshipBooking = lazy(() => import('./pages/MentorshipBooking'))
const LiveScoreboard = lazy(() => import('./pages/LiveScoreboard'))
const Scorekeeper = lazy(() => import('./pages/Scorekeeper'))
const MatchList = lazy(() => import('./pages/MatchList'))
const BracketView = lazy(() => import('./pages/BracketView'))
const PerformanceSchedule = lazy(() => import('./pages/PerformanceSchedule'))
const PaperSubmissionPortal = lazy(() => import('./pages/PaperSubmissionPortal'))
const ReviewerDashboard = lazy(() => import('./pages/ReviewerDashboard'))
const Profile = lazy(() => import('./pages/Profile'))

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <CircularProgress aria-label="Loading page" />
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Route Guards
// ---------------------------------------------------------------------------

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Requires organizer or super_admin role */
function OrganizerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isOrganizer(user)) return <Navigate to="/home" replace />
  return <>{children}</>
}

/** Requires super_admin role */
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperAdmin(user)) return <Navigate to="/home" replace />
  return <>{children}</>
}

/** Redirects already-authenticated users away from login/register */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Redirects authenticated users to their role-specific dashboard */
function RoleRedirect() {
  const { user } = useAuthStore()

  if (isSuperAdmin(user)) return <Navigate to="/admin" replace />
  if (isOrganizer(user)) return <Navigate to="/dashboard" replace />
  return <Navigate to="/home" replace />
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Guest-only Routes — redirect to dashboard if already logged in */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* All authenticated routes live inside Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Role-based redirect at root */}
            <Route index element={<RoleRedirect />} />

            {/* Student / common routes */}
            <Route path="home" element={<Home />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="events/:eventId/submit" element={<SubmitProject />} />
            <Route path="events/:eventId/teams" element={<TeamBoard />} />
            <Route path="events/:eventId/mentorship" element={<MentorshipBooking />} />
            <Route path="events/:eventId/matches" element={<MatchList />} />
            <Route path="events/:eventId/brackets" element={<BracketView />} />
            <Route path="events/:eventId/matches/:matchId" element={<LiveScoreboard />} />
            <Route path="events/:eventId/performances" element={<PerformanceSchedule />} />
            <Route path="events/:eventId/academic/submit" element={<PaperSubmissionPortal />} />
            <Route path="profile" element={<Profile />} />
            <Route path="my-registrations" element={<MyRegistrations />} />

            {/* Organizer routes */}
            <Route path="dashboard" element={
              <OrganizerRoute><Dashboard /></OrganizerRoute>
            } />
            <Route path="organizer/analytics" element={
              <OrganizerRoute><OrganizerAnalytics /></OrganizerRoute>
            } />
            <Route path="events/create" element={
              <OrganizerRoute><CreateEvent /></OrganizerRoute>
            } />
            <Route path="scan" element={
              <OrganizerRoute><Scanner /></OrganizerRoute>
            } />
            <Route path="events/:eventId/judging" element={
              <OrganizerRoute><JudgingDashboard /></OrganizerRoute>
            } />
            <Route path="events/:eventId/matches/:matchId/score" element={
              <OrganizerRoute><Scorekeeper /></OrganizerRoute>
            } />
            <Route path="events/:eventId/academic/review" element={
              <OrganizerRoute><ReviewerDashboard /></OrganizerRoute>
            } />

            {/* Super Admin routes */}
            <Route path="admin/*" element={
              <SuperAdminRoute><AdminDashboard /></SuperAdminRoute>
            } />
          </Route>

          {/* Catch all — send to login or role redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App

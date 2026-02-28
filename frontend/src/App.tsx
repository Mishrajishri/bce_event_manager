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

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <CircularProgress aria-label="Loading page" />
    </Box>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function OrganizerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isOrganizer(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperAdmin(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />

            <Route path="my-registrations" element={
              <ProtectedRoute><MyRegistrations /></ProtectedRoute>
            } />

            <Route path="dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />

            <Route path="events/create" element={
              <OrganizerRoute><CreateEvent /></OrganizerRoute>
            } />

            {/* Super Admin Routes */}
            <Route path="admin/*" element={
              <SuperAdminRoute><AdminDashboard /></SuperAdminRoute>
            } />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import JobView from './pages/JobView'
import PublicJobView from './pages/PublicJobView'
import UserManagement from './pages/UserManagement'
import ResetPasswordForm from './components/ResetPasswordForm'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen app-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/job/:jobId" element={<PublicJobView />} />
        <Route path="/public/job/:jobId" element={<PublicJobView />} />
        
        {/* Protected admin routes - require authentication */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/job/:jobId" element={
          <ProtectedRoute>
            <JobView />
          </ProtectedRoute>
        } />
        
        {/* Root redirect - redirect based on authentication status */}
        <Route path="/" element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
        
        {/* Catch all route - redirect to appropriate page */}
        <Route path="*" element={
          user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  )
}

export default App
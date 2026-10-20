import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <main className="auth-loading" aria-live="polite">
        <div className="auth-loading-spinner" />
        <p>Checking your Gada session…</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'organizer') return <Navigate to="/organizer-dashboard" replace />
    return <Navigate to="/participant-dashboard" replace />
  }

  return children
}

export default ProtectedRoute

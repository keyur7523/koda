import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requireApiKey?: boolean
}

export function ProtectedRoute({ children, requireApiKey = false }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-koda-bg flex items-center justify-center">
        <Loader2 className="text-koda-accent animate-spin" size={32} />
      </div>
    )
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  // Redirect to setup if API key required but not set
  if (requireApiKey && user && !user.has_api_key) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}


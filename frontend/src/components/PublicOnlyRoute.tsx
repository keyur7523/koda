import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

interface PublicOnlyRouteProps {
  children: ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth()

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-koda-bg flex items-center justify-center">
        <Loader2 className="text-koda-accent animate-spin" size={32} />
      </div>
    )
  }

  // Redirect authenticated users
  if (isAuthenticated) {
    // If no API key, send to setup
    if (user && !user.has_api_key) {
      return <Navigate to="/setup" replace />
    }
    // Otherwise send to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}


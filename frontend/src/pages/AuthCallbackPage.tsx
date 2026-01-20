import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, user, isLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')

    // If error param exists, show error
    if (errorParam) {
      setError(errorParam)
      setIsProcessing(false)
      return
    }

    // If no token and no error, redirect to auth
    if (!token) {
      navigate('/auth', { replace: true })
      return
    }

    // Token exists - log user in
    const handleLogin = async () => {
      try {
        await login(token)
      } catch (err) {
        setError('Failed to authenticate. Please try again.')
        setIsProcessing(false)
      }
    }

    handleLogin()
  }, [searchParams, login, navigate])

  // After login, wait for user to be fetched then redirect
  useEffect(() => {
    if (!isLoading && user && isProcessing) {
      // Check for pending approval (user was connecting GitHub during approval flow)
      const pendingApproval = localStorage.getItem('pending_approval')
      if (pendingApproval) {
        // Has pending approval, go back to dashboard to restore
        navigate('/dashboard?restore=true', { replace: true })
        return
      }
      
      // Normal flow - redirect based on has_api_key
      if (user.has_api_key) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/setup', { replace: true })
      }
    }
  }, [isLoading, user, isProcessing, navigate])

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-koda-bg flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-koda-surface border border-koda-border rounded-2xl p-8 text-center"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="text-red-600" size={24} />
          </div>
          <h1 className="text-xl font-semibold text-koda-text mb-2">
            Authentication Failed
          </h1>
          <p className="text-koda-text-muted mb-6">
            {error}
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center px-6 py-3 
                     bg-koda-accent hover:bg-koda-accent-hover text-white 
                     font-medium rounded-lg transition-colors"
          >
            Try Again
          </Link>
        </motion.div>
      </div>
    )
  }

  // Loading/processing state
  return (
    <div className="min-h-screen bg-koda-bg flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-6">
          <span className="text-koda-accent text-4xl">◆</span>
        </div>
        <Loader2 className="mx-auto text-koda-accent animate-spin mb-4" size={32} />
        <p className="text-koda-text font-medium">Signing you in...</p>
        <p className="text-koda-text-muted text-sm mt-2">Please wait</p>
      </motion.div>
    </div>
  )
}


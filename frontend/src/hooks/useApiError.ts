import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError, getErrorMessage, isUnauthorizedError } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

interface UseApiErrorOptions {
  /** If true, automatically redirect to /auth on 401 errors */
  redirectOnUnauthorized?: boolean
  /** Custom message prefix for toast notifications */
  toastPrefix?: string
}

/**
 * Hook for handling API errors consistently across the app.
 * Shows appropriate toast notifications and handles auth redirects.
 */
export function useApiError(options: UseApiErrorOptions = {}) {
  const { redirectOnUnauthorized = true, toastPrefix } = options
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleError = useCallback((error: unknown) => {
    const message = getErrorMessage(error)
    const displayMessage = toastPrefix ? `${toastPrefix}: ${message}` : message

    // Handle 401 - unauthorized
    if (isUnauthorizedError(error)) {
      if (redirectOnUnauthorized) {
        logout()
        toast.error('Session expired. Please log in again.')
        navigate('/auth')
        return
      }
    }

    // Show error toast for all other errors
    if (error instanceof ApiError) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          toast.error(displayMessage, {
            description: 'Check your internet connection',
            duration: 5000,
          })
          break
        case 'RATE_LIMITED':
          toast.warning(displayMessage, {
            description: 'Please wait before trying again',
            duration: 5000,
          })
          break
        case 'FORBIDDEN':
          toast.error(displayMessage, {
            duration: 4000,
          })
          break
        case 'SERVER_ERROR':
          toast.error(displayMessage, {
            description: 'Our team has been notified',
            duration: 5000,
          })
          break
        default:
          toast.error(displayMessage)
      }
    } else {
      toast.error(displayMessage)
    }

    return message
  }, [navigate, logout, redirectOnUnauthorized, toastPrefix])

  /**
   * Wrapper to run an async function with automatic error handling.
   * Returns the result or undefined if an error occurred.
   */
  const withErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>
  ): Promise<T | undefined> => {
    try {
      return await fn()
    } catch (error) {
      handleError(error)
      return undefined
    }
  }, [handleError])

  return {
    handleError,
    withErrorHandling,
  }
}


import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('VITE_API_URL is not set')
}
const TOKEN_KEY = 'koda_token'

// Types
export interface User {
  id: number
  email: string
  username: string
  avatar_url: string | null
  has_api_key: boolean
  has_github: boolean  // Whether user has GitHub linked (can create PRs)
  tokens_used: number
  tokens_limit: number
  is_premium: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextType extends AuthState {
  login: (token: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

// Context
const AuthContext = createContext<AuthContextType | null>(null)

// Provider
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const navigate = useNavigate()

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        // Token invalid or expired
        localStorage.removeItem(TOKEN_KEY)
        setState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        })
        return
      }

      const userData = await response.json()
      // Map backend response to frontend User interface
      const user: User = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        avatar_url: userData.avatar_url,
        has_api_key: userData.has_anthropic_key || userData.has_openai_key,
        has_github: userData.has_github ?? false,
        tokens_used: userData.tokens_used,
        tokens_limit: userData.tokens_limit,
        is_premium: userData.is_premium,
      }
      setState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem(TOKEN_KEY)
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      })
    }
  }, [])

  const login = useCallback(async (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    setState(prev => ({ ...prev, token, isLoading: true }))
    await fetchUser()
  }, [fetchUser])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    })
    navigate('/')
  }, [navigate])

  // Check for existing token on mount
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    fetchUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

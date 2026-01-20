import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { register, loginWithEmail } from '../api/client'

type AuthTab = 'signup' | 'signin'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

export function EmailAuthPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [activeTab, setActiveTab] = useState<AuthTab>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    // Confirm password validation (sign up only)
    if (activeTab === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignUp = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const response = await register(email, password)
      await login(response.token)
      toast.success('Account created successfully!')
      // Navigate to setup since new users don't have API key
      navigate('/setup')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      setErrors({ general: message })
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const response = await loginWithEmail(email, password)
      await login(response.token)
      toast.success('Welcome back!')
      // Navigate based on whether user has API key
      if (response.user.has_anthropic_key || response.user.has_openai_key) {
        navigate('/dashboard')
      } else {
        navigate('/setup')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setErrors({ general: message })
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setErrors({})
  }

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab)
    clearForm()
  }

  return (
    <div className="min-h-screen bg-koda-bg flex flex-col items-center justify-center px-4">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mb-4"
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm text-koda-text-muted 
                   hover:text-koda-accent transition-colors"
        >
          <ArrowLeft size={16} />
          Back to sign in options
        </Link>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <Link to="/" className="flex items-center gap-2">
          <span className="text-koda-accent text-3xl">◆</span>
          <span className="text-2xl font-semibold text-koda-text">Koda</span>
        </Link>
      </motion.div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md bg-koda-surface border border-koda-border 
                   rounded-2xl shadow-lg overflow-hidden"
      >
        {/* Tabs */}
        <div className="flex border-b border-koda-border">
          <button
            onClick={() => switchTab('signup')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative
                      ${activeTab === 'signup' 
                        ? 'text-koda-accent' 
                        : 'text-koda-text-muted hover:text-koda-text'}`}
          >
            Sign Up
            {activeTab === 'signup' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-koda-accent"
              />
            )}
          </button>
          <button
            onClick={() => switchTab('signin')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative
                      ${activeTab === 'signin' 
                        ? 'text-koda-accent' 
                        : 'text-koda-text-muted hover:text-koda-text'}`}
          >
            Sign In
            {activeTab === 'signin' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-koda-accent"
              />
            )}
          </button>
        </div>

        {/* Form */}
        <div className="p-8">
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-koda-text mb-2"
              >
                Email
              </label>
              <div className="relative">
                <Mail 
                  size={18} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-koda-text-muted" 
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 bg-koda-bg border rounded-lg 
                           text-koda-text placeholder:text-koda-text-muted
                           focus:outline-none focus:ring-2 focus:ring-koda-accent 
                           focus:border-transparent transition-all
                           ${errors.email ? 'border-red-500' : 'border-koda-border'}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-koda-text mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock 
                  size={18} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-koda-text-muted" 
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: undefined })
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-4 py-3 bg-koda-bg border rounded-lg 
                           text-koda-text placeholder:text-koda-text-muted
                           focus:outline-none focus:ring-2 focus:ring-koda-accent 
                           focus:border-transparent transition-all
                           ${errors.password ? 'border-red-500' : 'border-koda-border'}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Input (Sign Up only) */}
            {activeTab === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-medium text-koda-text mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock 
                    size={18} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-koda-text-muted" 
                  />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-3 bg-koda-bg border rounded-lg 
                             text-koda-text placeholder:text-koda-text-muted
                             focus:outline-none focus:ring-2 focus:ring-koda-accent 
                             focus:border-transparent transition-all
                             ${errors.confirmPassword ? 'border-red-500' : 'border-koda-border'}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </motion.div>
            )}

            {/* General Error Message */}
            {errors.general && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{errors.general}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={activeTab === 'signup' ? handleSignUp : handleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-koda-accent hover:bg-koda-accent-hover 
                       text-white font-medium rounded-lg transition-colors mt-6
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {activeTab === 'signup' ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                activeTab === 'signup' ? 'Create Account' : 'Sign In'
              )}
            </button>

            {/* Forgot Password (Sign In only) */}
            {activeTab === 'signin' && (
              <div className="text-center mt-4">
                <button
                  onClick={() => console.log('Forgot password clicked')}
                  className="text-sm text-koda-text-muted hover:text-koda-accent transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 text-koda-text-muted text-sm"
      >
        By continuing, you agree to our Terms and Privacy Policy
      </motion.p>
    </div>
  )
}


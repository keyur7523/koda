import { Link, useNavigate } from 'react-router-dom'
import { Github, Mail } from 'lucide-react'
import { motion } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL
if (!API_URL) {
  throw new Error('VITE_API_URL is not set')
}

// Google icon SVG component (Lucide doesn't have a Google icon)
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function AuthPage() {
  const navigate = useNavigate()

  const handleGitHub = () => {
    // Redirect to backend GitHub OAuth endpoint
    window.location.href = `${API_URL}/api/auth/github`
  }

  const handleGoogle = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_URL}/api/auth/google`
  }

  const handleEmail = () => {
    navigate('/auth/email')
  }

  return (
    <div className="min-h-screen bg-koda-bg flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
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
                   rounded-2xl p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-koda-text text-center mb-2">
          Get started with Koda
        </h1>
        <p className="text-koda-text-muted text-center mb-8">
          Sign up to start coding with AI
        </p>

        {/* Auth Buttons */}
        <div className="space-y-3">
          {/* GitHub */}
          <button
            onClick={handleGitHub}
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                     bg-[#24292e] hover:bg-[#2f363d] text-white
                     rounded-lg font-medium transition-colors"
          >
            <Github size={20} />
            Continue with GitHub
          </button>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                     bg-white hover:bg-gray-50 text-gray-700
                     border border-gray-300
                     rounded-lg font-medium transition-colors"
          >
            <GoogleIcon size={20} />
            Continue with Google
          </button>

          {/* Email */}
          <button
            onClick={handleEmail}
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                     bg-koda-bg hover:bg-koda-surface-hover text-koda-text
                     border border-koda-border
                     rounded-lg font-medium transition-colors"
          >
            <Mail size={20} />
            Continue with Email
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-koda-border" />
          <span className="text-koda-text-muted text-sm">or</span>
          <div className="flex-1 h-px bg-koda-border" />
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-koda-text-muted">
          Already have an account?{' '}
          <Link
            to="/auth/signin"
            className="text-koda-accent hover:text-koda-accent-hover font-medium"
          >
            Sign in
          </Link>
        </p>
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

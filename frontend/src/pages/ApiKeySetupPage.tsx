import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Key, ExternalLink, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { saveApiKey } from '../api/client'

export function ApiKeySetupPage() {
  const navigate = useNavigate()
  const { token, fetchUser } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveKey = async () => {
    if (!apiKey.trim() || !token) return

    setIsLoading(true)
    try {
      await saveApiKey(token, apiKey.trim())
      await fetchUser() // Refresh user state
      toast.success('API key saved successfully!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to save API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save API key')
    } finally {
      setIsLoading(false)
    }
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

      {/* Setup Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md bg-koda-surface border border-koda-border 
                   rounded-2xl p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-koda-text text-center mb-2">
          Connect your API key
        </h1>
        <p className="text-koda-text-muted text-center mb-8">
          Enter your Anthropic API key to get started
        </p>

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key size={18} className="text-koda-accent" />
            <span className="font-medium text-koda-text">Anthropic API Key</span>
          </div>

          <div>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 pr-12 bg-koda-bg border border-koda-border 
                         rounded-lg text-koda-text placeholder:text-koda-text-muted
                         focus:outline-none focus:ring-2 focus:ring-koda-accent 
                         focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                         text-koda-text-muted hover:text-koda-text transition-colors"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-koda-text-muted">
              Your key is stored securely and never shared
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || isLoading}
            className="w-full py-3 px-4 bg-koda-accent hover:bg-koda-accent-hover 
                     text-white font-medium rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>

          {/* Get API Key Link */}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-koda-text-muted 
                     hover:text-koda-accent transition-colors"
          >
            <ExternalLink size={14} />
            Get an API key at console.anthropic.com
          </a>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 text-koda-text-muted text-sm"
      >
        You can update your key anytime in settings
      </motion.p>
    </div>
  )
}


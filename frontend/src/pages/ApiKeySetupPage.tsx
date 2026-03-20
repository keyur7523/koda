import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Key, ExternalLink, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { saveApiKey, saveOpenAiKey } from '../api/client'

type Provider = 'anthropic' | 'openai'

const PROVIDER_CONFIG = {
  anthropic: {
    label: 'Anthropic',
    placeholder: 'sk-ant-...',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleName: 'console.anthropic.com',
    saveFn: saveApiKey,
  },
  openai: {
    label: 'OpenAI',
    placeholder: 'sk-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    consoleName: 'platform.openai.com',
    saveFn: saveOpenAiKey,
  },
} as const

export function ApiKeySetupPage() {
  const navigate = useNavigate()
  const { token, fetchUser } = useAuth()
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const config = PROVIDER_CONFIG[provider]

  const handleSaveKey = async () => {
    if (!apiKey.trim() || !token) return

    setIsLoading(true)
    try {
      await config.saveFn(token, apiKey.trim())
      await fetchUser()
      toast.success('API key saved successfully!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to save API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save API key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
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
        <p className="text-koda-text-muted text-center mb-6">
          Choose a provider and enter your API key
        </p>

        {/* Provider Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-koda-bg rounded-lg border border-koda-border">
          {(['anthropic', 'openai'] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setProvider(p); setApiKey('') }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all
                ${provider === p
                  ? 'bg-koda-accent text-white shadow-sm'
                  : 'text-koda-text-muted hover:text-koda-text'
                }`}
            >
              {PROVIDER_CONFIG[p].label}
            </button>
          ))}
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key size={18} className="text-koda-accent" />
            <span className="font-medium text-koda-text">{config.label} API Key</span>
          </div>

          <div>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config.placeholder}
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
            href={config.consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-koda-text-muted
                     hover:text-koda-accent transition-colors"
          >
            <ExternalLink size={14} />
            Get an API key at {config.consoleName}
          </a>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-koda-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-koda-surface px-2 text-koda-text-muted">or</span>
            </div>
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="w-full py-3 px-4 border border-koda-border text-koda-text-muted
                     hover:text-koda-text hover:border-koda-text/30 font-medium rounded-lg
                     transition-colors flex items-center justify-center gap-2"
          >
            Skip for now
            <ArrowRight size={16} />
          </button>
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

import { useState } from 'react'
import { 
  User, Key, LogOut, Trash2, Eye, EyeOff, 
  Check, AlertTriangle, Loader2 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { MainLayout } from '../components/layouts/MainLayout'
import { useAuth } from '../contexts/AuthContext'
import { saveApiKey, removeApiKey, deleteAccount } from '../api/client'

export function SettingsPage() {
  const { user, token, logout, fetchUser } = useAuth()
  
  // API Key state
  const [showApiKeyForm, setShowApiKeyForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  if (!user || !token) return null
  
  const hasApiKey = user.has_api_key
  
  // Handlers
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return
    
    setIsLoading(true)
    try {
      await saveApiKey(token, apiKey.trim())
      await fetchUser()
      setApiKey('')
      setShowApiKeyForm(false)
      toast.success('API key saved successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save API key')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRemoveApiKey = async () => {
    setIsLoading(true)
    try {
      await removeApiKey(token)
      await fetchUser()
      toast.success('API key removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove API key')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    
    setIsLoading(true)
    try {
      await deleteAccount(token)
      toast.success('Account deleted')
      logout()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account')
      setIsLoading(false)
    }
  }
  
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-koda-text">Settings</h1>
        
        {/* Profile Section */}
        <section className="bg-koda-surface border border-koda-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-koda-text mb-4 flex items-center gap-2">
            <User size={20} className="text-koda-accent" />
            Profile
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.username}
                  className="w-16 h-16 rounded-full border-2 border-koda-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-koda-accent/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-koda-accent">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div>
                <p className="text-lg font-medium text-koda-text">{user.username}</p>
                <p className="text-sm text-koda-text-muted">{user.email}</p>
              </div>
            </div>
            
            {hasApiKey && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
                              bg-koda-accent/10 text-koda-accent">
                  <Check size={14} />
                  API Key Connected
                </span>
              </div>
            )}
          </div>
        </section>
        
        {/* API Key Section */}
        <section className="bg-koda-surface border border-koda-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-koda-text mb-4 flex items-center gap-2">
            <Key size={20} className="text-koda-accent" />
            API Key
          </h2>
          
          {hasApiKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-koda-accent">
                <Check size={18} />
                <span>API key connected</span>
              </div>
              
              <p className="text-sm text-koda-text-muted">
                Your Anthropic API key is securely stored and encrypted.
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowApiKeyForm(!showApiKeyForm)}
                  className="px-4 py-2 text-sm font-medium text-koda-text bg-koda-bg 
                           border border-koda-border rounded-lg hover:bg-koda-surface-hover 
                           transition-colors"
                >
                  Update API Key
                </button>
                <button
                  onClick={handleRemoveApiKey}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-red-500 bg-red-500/10 
                           border border-red-500/20 rounded-lg hover:bg-red-500/20 
                           transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-koda-text-muted">
                No API key connected. Add your Anthropic API key for unlimited usage.
              </p>
              
              {!showApiKeyForm && (
                <button
                  onClick={() => setShowApiKeyForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-koda-accent 
                           rounded-lg hover:bg-koda-accent-hover transition-colors"
                >
                  Add API Key
                </button>
              )}
            </div>
          )}
          
          {/* API Key Form */}
          <AnimatePresence>
            {showApiKeyForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="w-full px-4 py-3 pr-12 bg-koda-bg border border-koda-border
                             rounded-lg text-koda-text placeholder:text-koda-text-muted
                             focus:outline-none focus:ring-2 focus:ring-koda-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                             text-koda-text-muted hover:text-koda-text"
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveApiKey}
                    disabled={!apiKey.trim() || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-koda-accent 
                             rounded-lg hover:bg-koda-accent-hover transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center gap-2"
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowApiKeyForm(false)
                      setApiKey('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-koda-text-muted 
                             hover:text-koda-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        
        {/* Account Section */}
        <section className="bg-koda-surface border border-koda-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-koda-text mb-4">Account</h2>
          
          <div className="space-y-4">
            <button
              onClick={logout}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-red-500 
                       bg-red-500/10 border border-red-500/20 rounded-lg 
                       hover:bg-red-500/20 transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
            
            <div className="border-t border-koda-border pt-4">
              <h3 className="text-sm font-medium text-red-500 mb-2">Danger Zone</h3>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-500 
                           border border-red-500/30 rounded-lg 
                           hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg space-y-3"
                >
                  <div className="flex items-start gap-2 text-red-500">
                    <AlertTriangle size={18} className="mt-0.5" />
                    <div>
                      <p className="font-medium">Are you sure?</p>
                      <p className="text-sm opacity-80">
                        This action cannot be undone. All your data will be permanently deleted.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-koda-text-muted mb-1">
                      Type <strong>DELETE</strong> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 bg-koda-bg border border-koda-border
                               rounded-lg text-koda-text focus:outline-none focus:ring-2 
                               focus:ring-red-500"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 
                               rounded-lg hover:bg-red-600 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center gap-2"
                    >
                      {isLoading && <Loader2 size={16} className="animate-spin" />}
                      Delete My Account
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="px-4 py-2 text-sm font-medium text-koda-text-muted 
                               hover:text-koda-text transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

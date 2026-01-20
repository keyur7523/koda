import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, ExternalLink, X, History,
  AlertCircle, Check, Loader2
} from 'lucide-react'
import type { SelectedRepo } from '../../hooks/useRepoSelection'
import { validateGitHubUrl } from '../../hooks/useRepoSelection'

interface RepoSelectorProps {
  selectedRepo: SelectedRepo | null
  repoHistory: SelectedRepo[]
  isEditing: boolean
  onSelectFromUrl: (url: string) => { success: boolean; error?: string }
  onSelectFromHistory: (repo: SelectedRepo) => void
  onClear: () => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onRemoveFromHistory: (url: string) => void
}

export function RepoSelector({
  selectedRepo,
  repoHistory,
  isEditing,
  onSelectFromUrl,
  onSelectFromHistory,
  onClear,
  onStartEditing,
  onCancelEditing,
  onRemoveFromHistory,
}: RepoSelectorProps) {
  const [inputUrl, setInputUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const handleSubmit = () => {
    setError(null)
    
    const validation = validateGitHubUrl(inputUrl)
    if (!validation.valid) {
      setError(validation.error || 'Invalid URL')
      return
    }
    
    setIsValidating(true)
    
    // Small delay for UX
    setTimeout(() => {
      const result = onSelectFromUrl(inputUrl)
      setIsValidating(false)
      
      if (!result.success) {
        setError(result.error || 'Failed to select repository')
      } else {
        setInputUrl('')
        setShowHistory(false)
      }
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancelEditing()
    }
  }

  const handleHistorySelect = (repo: SelectedRepo) => {
    onSelectFromHistory(repo)
    setShowHistory(false)
    setInputUrl('')
    setError(null)
  }

  // Show selected repo view
  if (selectedRepo && !isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-koda-surface border border-koda-border rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-koda-accent/10 rounded-lg">
              <GitBranch size={20} className="text-koda-accent" />
            </div>
            <div>
              <p className="text-sm text-koda-text-muted">Working on</p>
              <div className="flex items-center gap-2">
                <span className="font-medium text-koda-text">
                  {selectedRepo.owner}/{selectedRepo.name}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-koda-bg rounded-full text-koda-text-muted">
                  {selectedRepo.branch}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={selectedRepo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-koda-text-muted hover:text-koda-text 
                       hover:bg-koda-bg rounded-lg transition-colors"
              title="Open on GitHub"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onStartEditing}
              className="px-3 py-1.5 text-sm font-medium text-koda-text-muted 
                       hover:text-koda-text hover:bg-koda-bg rounded-lg transition-colors"
            >
              Change
            </button>
            <button
              onClick={onClear}
              className="p-2 text-koda-text-muted hover:text-red-400 
                       hover:bg-red-500/10 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Show repo input view
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-koda-surface border border-koda-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-koda-text-muted">
        <GitBranch size={18} />
        <span className="text-sm font-medium">Select a repository to get started</span>
      </div>
      
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => repoHistory.length > 0 && setShowHistory(true)}
              placeholder="https://github.com/owner/repo"
              className={`w-full px-4 py-2.5 bg-koda-bg border rounded-lg text-koda-text 
                       placeholder:text-koda-text-muted focus:outline-none focus:ring-2 
                       transition-all ${
                         error 
                           ? 'border-red-500 focus:ring-red-500/30' 
                           : 'border-koda-border focus:ring-koda-accent focus:border-transparent'
                       }`}
            />
            
            {/* History dropdown */}
            <AnimatePresence>
              {showHistory && repoHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-koda-surface border 
                           border-koda-border rounded-lg shadow-lg z-10 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-koda-border">
                    <History size={14} className="text-koda-text-muted" />
                    <span className="text-xs font-medium text-koda-text-muted">Recent repositories</span>
                  </div>
                  {repoHistory.map((repo) => (
                    <div
                      key={repo.url}
                      className="flex items-center justify-between px-3 py-2 hover:bg-koda-bg 
                               cursor-pointer group"
                    >
                      <button
                        onClick={() => handleHistorySelect(repo)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <GitBranch size={14} className="text-koda-text-muted" />
                        <span className="text-sm text-koda-text">
                          {repo.owner}/{repo.name}
                        </span>
                        <span className="text-xs text-koda-text-muted">
                          ({repo.branch})
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveFromHistory(repo.url)
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-koda-text-muted 
                                 hover:text-red-400 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!inputUrl.trim() || isValidating}
            className="px-4 py-2.5 bg-koda-accent text-white rounded-lg font-medium text-sm
                     hover:bg-koda-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
          >
            {isValidating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            <span className="hidden sm:inline">Select</span>
          </button>
          
          {selectedRepo && (
            <button
              onClick={onCancelEditing}
              className="px-3 py-2.5 text-koda-text-muted hover:text-koda-text 
                       hover:bg-koda-bg rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 mt-2 text-sm text-red-400"
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Click outside to close history */}
      {showHistory && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowHistory(false)}
        />
      )}
    </motion.div>
  )
}


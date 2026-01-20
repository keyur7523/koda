import { Link } from 'react-router-dom'
import { AlertTriangle, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export function TokenUsageIndicator() {
  const { user } = useAuth()
  
  if (!user) return null
  
  // Users with API key don't show usage (unlimited)
  if (user.has_api_key) return null
  
  const used = user.tokens_used
  const limit = user.tokens_limit
  const percentage = Math.min(100, (used / limit) * 100)
  const remaining = Math.max(0, limit - used)
  
  // Determine state
  const isAtLimit = used >= limit
  const isWarning = percentage >= 80 && !isAtLimit
  
  // Format numbers
  const formatNumber = (n: number) => n.toLocaleString()
  
  return (
    <div className="px-3 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-koda-text-muted flex items-center gap-1">
          <Zap size={12} />
          Free Tier
        </span>
        <span className="text-xs text-koda-text-muted">
          {formatNumber(used)} / {formatNumber(limit)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-koda-bg rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isAtLimit
              ? 'bg-red-500'
              : isWarning
              ? 'bg-yellow-500'
              : 'bg-koda-accent'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Warning/Error message */}
      {isAtLimit && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="text-red-500 font-medium">Limit reached</p>
              <Link 
                to="/setup" 
                className="text-koda-accent hover:underline"
              >
                Add your API key to continue →
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {isWarning && !isAtLimit && (
        <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {formatNumber(remaining)} tokens remaining
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


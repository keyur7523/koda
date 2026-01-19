import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, ChevronDown, FileText, FilePlus, FileX, Eye } from 'lucide-react'
import type { StagedChange, ChangeType } from '../../types/changes'
import { DiffEditor } from '../code/DiffEditor'

interface ApprovalFlowProps {
  changes: StagedChange[]
  onApprove: () => void
  onReject: () => void
  isLoading?: boolean
}

const changeTypeConfig: Record<ChangeType, { icon: React.ReactNode; label: string; color: string }> = {
  create: { icon: <FilePlus size={16} />, label: 'Create', color: 'text-green-600 bg-green-50' },
  modify: { icon: <FileText size={16} />, label: 'Modify', color: 'text-blue-600 bg-blue-50' },
  delete: { icon: <FileX size={16} />, label: 'Delete', color: 'text-red-600 bg-red-50' },
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'html': 'html',
    'txt': 'plaintext',
  }
  return langMap[ext || ''] || 'plaintext'
}

export function ApprovalFlow({ changes, onApprove, onReject, isLoading }: ApprovalFlowProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  if (changes.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-amber-100 border-b border-amber-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-amber-900">Review Changes</h3>
            <p className="text-sm text-amber-700">
              {changes.length} file{changes.length !== 1 ? 's' : ''} will be modified
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onReject}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 
                       bg-white border border-koda-border rounded-lg text-sm font-medium
                       hover:bg-koda-surface-hover disabled:opacity-50
                       transition-colors"
            >
              <X size={16} />
              <span>Reject</span>
            </button>
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 
                       bg-koda-accent text-white rounded-lg text-sm font-medium
                       hover:bg-koda-accent-hover disabled:opacity-50
                       transition-colors"
            >
              <Check size={16} />
              <span>Approve & Apply</span>
            </button>
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="divide-y divide-amber-200">
        {changes.map((change, index) => {
          const config = changeTypeConfig[change.changeType]
          const isExpanded = expandedIndex === index
          
          return (
            <div key={change.path} className="bg-white">
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left
                         hover:bg-koda-surface-hover transition-colors"
              >
                <span className={`p-1.5 rounded ${config.color}`}>
                  {config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{change.path}</p>
                  <p className="text-xs text-koda-text-muted">{config.label}</p>
                </div>
                <Eye size={16} className="text-koda-text-muted" />
                <ChevronDown 
                  size={16} 
                  className={`text-koda-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              
              {isExpanded && (
                <div className="border-t border-koda-border">
                  <DiffEditor
                    original={change.originalContent || ''}
                    modified={change.newContent}
                    language={getLanguageFromPath(change.path)}
                    height="250px"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

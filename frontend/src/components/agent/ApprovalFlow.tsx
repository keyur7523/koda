import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, ChevronDown, FileText, FilePlus, FileX, Eye, ExternalLink, GitPullRequest, Loader2, Github, Download, Copy, CheckCircle } from 'lucide-react'
import type { StagedChange, ChangeType } from '../../types/changes'
import { DiffEditor } from '../code/DiffEditor'

interface PRResult {
  url: string
  number: number
}

interface ApprovalFlowProps {
  changes: StagedChange[]
  onApprove: () => void
  onReject: () => void
  isLoading?: boolean
  prResult?: PRResult | null
  hasGitHub?: boolean  // Whether user has GitHub connected
  onConnectGitHub?: () => void
  onDownloadPatch?: () => void
  onCopyDiff?: () => void
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

export function ApprovalFlow({ 
  changes, 
  onApprove, 
  onReject, 
  isLoading, 
  prResult,
  hasGitHub = true,  // Default to true for backward compatibility
  onConnectGitHub,
  onDownloadPatch,
  onCopyDiff,
}: ApprovalFlowProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [copied, setCopied] = useState(false)

  const handleCopyDiff = () => {
    onCopyDiff?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show PR success state
  if (prResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border border-green-200 bg-green-50 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <GitPullRequest size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-900 mb-2">
            PR created!
          </h3>
          <p className="text-green-700 mb-6">
            Your changes have been submitted as PR #{prResult.number}
          </p>
          <a
            href={prResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 
                     bg-green-600 text-white rounded-lg font-medium
                     hover:bg-green-700 transition-colors"
          >
            <span>View Pull Request</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </motion.div>
    )
  }

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
          
          <div className="flex flex-wrap gap-2">
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
            
            {hasGitHub ? (
              // GitHub connected - show Create PR button
              <button
                onClick={onApprove}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 
                         bg-koda-accent text-white rounded-lg text-sm font-medium
                         hover:bg-koda-accent-hover disabled:opacity-50
                         transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating PR...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Approve & Create PR</span>
                  </>
                )}
              </button>
            ) : (
              // No GitHub - show alternative options
              <>
                <button
                  onClick={onConnectGitHub}
                  className="flex items-center gap-2 px-4 py-2 
                           bg-gray-900 text-white rounded-lg text-sm font-medium
                           hover:bg-gray-800 transition-colors"
                >
                  <Github size={16} />
                  <span>Connect GitHub</span>
                </button>
                <button
                  onClick={onDownloadPatch}
                  className="flex items-center gap-2 px-4 py-2 
                           bg-white border border-koda-border rounded-lg text-sm font-medium
                           hover:bg-koda-surface-hover transition-colors"
                >
                  <Download size={16} />
                  <span>Download Patch</span>
                </button>
                <button
                  onClick={handleCopyDiff}
                  className="flex items-center gap-2 px-4 py-2 
                           bg-white border border-koda-border rounded-lg text-sm font-medium
                           hover:bg-koda-surface-hover transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy Diff</span>
                    </>
                  )}
                </button>
              </>
            )}
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

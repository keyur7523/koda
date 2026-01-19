import { motion } from 'framer-motion'
import { ChevronRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { ToolCall } from '../../types/agent'
import { Collapse } from '../ui/Animations'

interface ToolCallItemProps {
  toolCall: ToolCall
}

export function ToolCallItem({ toolCall }: ToolCallItemProps) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    pending: <ChevronRight size={14} className="text-koda-text-muted" />,
    running: <Loader2 size={14} className="animate-spin text-koda-accent" />,
    complete: (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <CheckCircle size={14} className="text-koda-accent" />
      </motion.div>
    ),
    error: <AlertCircle size={14} className="text-red-500" />,
  }[toolCall.status]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border border-koda-border rounded-lg overflow-hidden bg-koda-surface"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left
                   hover:bg-koda-surface-hover transition-colors"
      >
        {statusIcon}
        <code className="text-sm font-mono text-koda-accent">{toolCall.name}</code>
        <span className="text-xs text-koda-text-muted truncate flex-1">
          {JSON.stringify(toolCall.args)}
        </span>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={14} className="text-koda-text-muted" />
        </motion.div>
      </button>
      
      <Collapse isOpen={expanded && !!toolCall.result}>
        <div className="px-3 py-2 border-t border-koda-border bg-koda-bg">
          <pre className="text-xs font-mono text-koda-text whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {toolCall.result}
          </pre>
        </div>
      </Collapse>
    </motion.div>
  )
}

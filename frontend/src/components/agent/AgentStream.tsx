import { motion, AnimatePresence } from 'framer-motion'
import type { AgentState } from '../../types/agent'
import { PhaseIndicator } from './PhaseIndicator'
import { ToolCallItem } from './ToolCallItem'
import { EmptyState } from './EmptyState'
import { AgentStreamSkeleton } from './AgentStreamSkeleton'
import { PlanSkeleton } from './PlanSkeleton'
import { FadeIn, StaggerContainer, StaggerItem } from '../ui/Animations'

interface AgentStreamProps {
  state: AgentState
  onExampleClick?: (task: string) => void
}

export function AgentStream({ state, onExampleClick }: AgentStreamProps) {
  // Idle state - show empty state
  if (state.phase === 'idle' && !state.task) {
    return onExampleClick ? (
      <FadeIn>
        <EmptyState onExampleClick={onExampleClick} />
      </FadeIn>
    ) : null
  }

  // Understanding phase with no content yet - show skeleton
  if (state.phase === 'understanding' && !state.summary && state.toolCalls.length === 0) {
    return (
      <FadeIn>
        <AgentStreamSkeleton />
      </FadeIn>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current phase */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <PhaseIndicator phase={state.phase} />
          {state.task && (
            <span className="text-sm text-koda-text-muted truncate ml-4 max-w-[50%]">
              {state.task}
            </span>
          )}
        </div>
      </FadeIn>

      {/* Summary */}
      <AnimatePresence>
        {state.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-koda-surface border border-koda-border rounded-lg"
          >
            <h3 className="text-sm font-medium mb-2">Summary</h3>
            <p className="text-sm text-koda-text-muted whitespace-pre-wrap">{state.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan - show skeleton while planning */}
      <AnimatePresence>
        {state.phase === 'planning' && state.plan.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <PlanSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan - show actual plan */}
      <AnimatePresence>
        {state.plan.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-koda-surface border border-koda-border rounded-lg"
          >
            <h3 className="text-sm font-medium mb-3">Plan</h3>
            <StaggerContainer>
              <ol className="space-y-2">
                {state.plan.map((step, i) => (
                  <StaggerItem key={i}>
                    <li className="flex items-start gap-3">
                      <motion.span
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className={`
                          flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                          ${step.status === 'complete' ? 'bg-koda-accent text-white' : 
                            step.status === 'running' ? 'bg-koda-accent-light text-koda-accent' :
                            'bg-koda-bg text-koda-text-muted'}
                        `}
                      >
                        {i + 1}
                      </motion.span>
                      <span className={`text-sm ${step.status === 'complete' ? 'text-koda-text-muted' : 'text-koda-text'}`}>
                        {step.description}
                      </span>
                    </li>
                  </StaggerItem>
                ))}
              </ol>
            </StaggerContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool calls */}
      {state.toolCalls.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tool Executions</h3>
            <div className="space-y-2">
              {state.toolCalls.map((tc) => (
                <ToolCallItem key={tc.id} toolCall={tc} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Error */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

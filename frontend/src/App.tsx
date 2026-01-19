import { motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { MainLayout } from './components/layouts/MainLayout'
import { TaskInput } from './components/agent/TaskInput'
import { AgentStream } from './components/agent/AgentStream'
import { ApprovalFlow } from './components/agent/ApprovalFlow'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { useAgentStore } from './stores/agentStore'
import { useAgentWebSocket } from './hooks/useAgentWebSocket'
import { useToast } from './hooks/useToast'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { approveChanges } from './api/client'

function App() {
  const { agentState, stagedChanges, isConnected, setStagedChanges, setPhase, setError } =
    useAgentStore()
  const { runTask } = useAgentWebSocket()
  const toast = useToast()
  useKeyboardShortcuts()

  const handleApprove = async () => {
    try {
      await approveChanges(true)
      setPhase('complete')
      setStagedChanges([])
      toast.success('Changes applied successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply'
      setError(message)
      toast.error(message)
    }
  }

  const handleReject = async () => {
    try {
      await approveChanges(false)
      setPhase('complete')
      setStagedChanges([])
      toast.info('Changes discarded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject'
      setError(message)
      toast.error(message)
    }
  }

  const isLoading =
    isConnected || !['idle', 'complete', 'error', 'awaiting_approval'].includes(agentState.phase)

  return (
    <>
      <Toaster position="top-right" richColors />
      <MainLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <ErrorBoundary>
            <TaskInput onSubmit={runTask} isLoading={isLoading} />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <AgentStream state={agentState} onExampleClick={runTask} />
          </ErrorBoundary>
          
          {agentState.phase === 'awaiting_approval' && stagedChanges.length > 0 && (
            <ErrorBoundary>
              <ApprovalFlow
                changes={stagedChanges}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </ErrorBoundary>
          )}
        </motion.div>
      </MainLayout>
    </>
  )
}

export default App

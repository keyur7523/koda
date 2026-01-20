import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { MainLayout } from '../components/layouts/MainLayout'
import { AgentStream } from '../components/agent/AgentStream'
import { ApprovalFlow } from '../components/agent/ApprovalFlow'
import { DashboardIdleState } from '../components/agent/DashboardIdleState'
import { useAgentStore } from '../stores/agentStore'
import { useAgentWebSocket } from '../hooks/useAgentWebSocket'
import { useRepoSelection } from '../hooks/useRepoSelection'
import { useAuth } from '../contexts/AuthContext'
import { approveChanges, fetchTaskHistory, createTask, updateTask } from '../api/client'
import { useToast } from '../hooks/useToast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function DashboardPage() {
  const location = useLocation()
  const { 
    agentState, stagedChanges, setStagedChanges, setPhase, reset, prResult, setPRResult,
    currentTaskId, setTaskHistory, setCurrentTaskId, updateTaskStatus, setTask
  } = useAgentStore()
  const { runTask } = useAgentWebSocket()
  const { token, user } = useAuth()
  const toast = useToast()
  const {
    selectedRepo,
    repoHistory,
    isEditing,
    selectRepo,
    selectRepoFromUrl,
    clearSelection,
    startEditing,
    cancelEditing,
    removeFromHistory,
  } = useRepoSelection()

  // Task input value for pre-filling from examples
  const [taskInputValue, setTaskInputValue] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  
  // Check if user has GitHub connected
  const hasGitHub = user?.has_github ?? false

  // Fetch task history on mount
  useEffect(() => {
    if (!token) return
    
    fetchTaskHistory(token)
      .then((history) => {
        // Convert backend format to store format
        const formatted = history.map((item) => ({
          id: item.id,
          task: item.task,
          status: item.status,
          timestamp: new Date(item.created_at),
          repoUrl: item.repo_url,
          prUrl: item.pr_url,
        }))
        setTaskHistory(formatted)
      })
      .catch((error) => {
        console.error('Failed to fetch task history:', error)
      })
  }, [token, setTaskHistory])

  // Restore approval state after GitHub OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('restore') === 'true') {
      const pendingStr = localStorage.getItem('pending_approval')
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr)
          
          // Check expiry (10 minutes)
          if (Date.now() - pending.timestamp > 10 * 60 * 1000) {
            localStorage.removeItem('pending_approval')
            toast.warning('Approval session expired. Please run the task again.')
            return
          }
          
          // Restore state
          if (pending.stagedChanges) setStagedChanges(pending.stagedChanges)
          if (pending.task) setTask(pending.task)
          if (pending.taskId) setCurrentTaskId(pending.taskId)
          if (pending.repoUrl) selectRepo(pending.repoUrl)
          setPhase('awaiting_approval')
          
          // Clean up
          localStorage.removeItem('pending_approval')
          
          toast.success('GitHub connected! You can now create a PR.')
        } catch (e) {
          console.error('Failed to restore approval state:', e)
          localStorage.removeItem('pending_approval')
        }
      }
      
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [location.search, setStagedChanges, setTask, setCurrentTaskId, selectRepo, setPhase, toast])

  const isLoading = ['cloning', 'understanding', 'planning', 'executing'].includes(agentState.phase)
  const isIdle = agentState.phase === 'idle' && !agentState.task
  const isComplete = agentState.phase === 'complete'
  const isRunning = !isIdle && !isComplete
  
  // Show sidebar when task is running or complete (not during idle state)
  const showSidebar = !isIdle

  const handleRunTask = async (task: string) => {
    if (!selectedRepo || !token) return
    
    try {
      // Create task record in backend
      const { id } = await createTask(token, {
        task,
        repo_url: selectedRepo.url,
      })
      setCurrentTaskId(id)
      
      // Run the task
      runTask(task, {
        url: selectedRepo.url,
        branch: selectedRepo.branch,
      })
      
      // Clear the input value after submitting
      setTaskInputValue('')
    } catch (error) {
      console.error('Failed to create task:', error)
      // Still run the task even if backend save fails
      runTask(task, {
        url: selectedRepo.url,
        branch: selectedRepo.branch,
      })
      setTaskInputValue('')
    }
  }

  const handleApprove = async () => {
    if (!token) {
      toast.error('You must be logged in to approve changes')
      return
    }

    setIsApproving(true)
    try {
      const response = await approveChanges(token, {
        approved: true,
        repo_url: selectedRepo?.url,
        branch: selectedRepo?.branch,
        task_description: agentState.task || undefined,
      })

      if (response.success) {
        const prUrl = response.pr_url || null
        
        if (prUrl && response.pr_number) {
          // PR was created
          setPRResult({ url: prUrl, number: response.pr_number })
          toast.success('PR created!')
        } else {
          // Changes applied locally
          toast.success(response.message)
        }
        
        setPhase('complete')
        setStagedChanges([])
        
        // Update task status in backend
        if (currentTaskId) {
          updateTaskStatus(currentTaskId, 'complete', prUrl)
          updateTask(token, currentTaskId, { status: 'complete', pr_url: prUrl }).catch(console.error)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve changes'
      toast.error(message)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!token) {
      toast.error('You must be logged in to reject changes')
      return
    }

    setIsApproving(true)
    try {
      const response = await approveChanges(token, { approved: false })
      toast.info(response.message || 'Changes discarded')
      setPhase('complete')
      setStagedChanges([])
      
      // Update task status in backend (still complete, just no PR)
      if (currentTaskId) {
        updateTaskStatus(currentTaskId, 'complete')
        updateTask(token, currentTaskId, { status: 'complete' }).catch(console.error)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject changes'
      toast.error(message)
    } finally {
      setIsApproving(false)
    }
  }

  const handleStartNewTask = () => {
    reset()
    setTaskInputValue('')
  }

  // Alternative approval handlers for non-GitHub users
  const handleConnectGitHub = () => {
    // Save current approval state to localStorage before redirect
    const pendingApproval = {
      taskId: currentTaskId,
      stagedChanges: stagedChanges,
      task: agentState.task,
      repoUrl: selectedRepo,
      timestamp: Date.now(),
    }
    localStorage.setItem('pending_approval', JSON.stringify(pendingApproval))
    
    // Redirect to GitHub OAuth link flow with current token as state
    const linkUrl = `${API_URL}/api/auth/github/link?state=${encodeURIComponent(token || '')}`
    window.location.href = linkUrl
  }

  const handleDownloadPatch = async () => {
    if (!token) {
      toast.error('You must be logged in')
      return
    }
    try {
      const response = await fetch(`${API_URL}/api/changes/patch`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('Failed to download patch')
      }
      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'koda-changes.patch'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Patch downloaded!')
    } catch (error) {
      toast.error('Failed to download patch')
    }
  }

  const handleCopyDiff = async () => {
    if (!token) {
      toast.error('You must be logged in')
      return
    }
    try {
      const response = await fetch(`${API_URL}/api/changes/diff`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) {
        throw new Error('Failed to get diff')
      }
      const data = await response.json()
      await navigator.clipboard.writeText(data.diff)
      toast.success('Diff copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy diff')
    }
  }

  return (
    <MainLayout showSidebar={showSidebar}>
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Idle State - Show the new dashboard layout */}
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardIdleState
                selectedRepo={selectedRepo}
                repoHistory={repoHistory}
                isEditing={isEditing}
                onSelectFromUrl={selectRepoFromUrl}
                onSelectFromHistory={selectRepo}
                onClear={clearSelection}
                onStartEditing={startEditing}
                onCancelEditing={cancelEditing}
                onRemoveFromHistory={removeFromHistory}
                taskInputValue={taskInputValue}
                onTaskInputChange={setTaskInputValue}
                onTaskSubmit={handleRunTask}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {/* Running/Active State - Show AgentStream */}
          {(isRunning || isComplete) && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 space-y-6"
            >
              {/* Show which repo we're working on */}
              {selectedRepo && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-koda-text-muted">
                    Working on:{' '}
                    <span className="font-medium text-koda-text">
                      {selectedRepo.owner}/{selectedRepo.name}
                    </span>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-koda-bg rounded-full">
                      {selectedRepo.branch}
                    </span>
                  </div>
                  
                  {/* Start new task button - shown when complete */}
                  {isComplete && (
                    <button
                      onClick={handleStartNewTask}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                               text-koda-text bg-koda-surface border border-koda-border
                               rounded-lg hover:bg-koda-surface-hover transition-colors"
                    >
                      <RotateCcw size={16} />
                      Start new task
                    </button>
                  )}
                </div>
              )}

              {/* Agent Stream */}
              <AgentStream state={agentState} />

              {/* Approval Flow - shown when awaiting approval or PR created */}
              {(agentState.phase === 'awaiting_approval' && stagedChanges.length > 0) || prResult ? (
                <ApprovalFlow
                  changes={stagedChanges}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isLoading={isApproving}
                  prResult={prResult}
                  hasGitHub={hasGitHub}
                  onConnectGitHub={handleConnectGitHub}
                  onDownloadPatch={handleDownloadPatch}
                  onCopyDiff={handleCopyDiff}
                />
              ) : null}

              {/* Completion message */}
              {isComplete && stagedChanges.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <p className="text-koda-text-muted">
                    Task completed successfully!
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}

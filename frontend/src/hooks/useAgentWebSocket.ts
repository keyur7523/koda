import { useCallback, useRef } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { useToast } from './useToast'
import { useAuth } from '../contexts/AuthContext'

const WS_BASE_URL = import.meta.env.VITE_WS_URL
if (!WS_BASE_URL) {
  throw new Error('VITE_WS_URL is not set')
}

// Reconnection config
const MAX_RECONNECT_ATTEMPTS = 3
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 10000 // 10 seconds

export interface RepoInfo {
  url: string
  branch: string
}

export function useAgentWebSocket() {
  const {
    setPhase,
    setTask,
    setSummary,
    setPlan,
    addToolCall,
    updateToolCall,
    setStagedChanges,
    setError,
    setConnected,
    addTaskToHistory,
    updateTaskStatus,
    reset,
  } = useAgentStore()
  
  const toast = useToast()
  const { token, logout } = useAuth()
  
  // Track reconnection state
  const reconnectAttempts = useRef(0)
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY)
  const currentWs = useRef<WebSocket | null>(null)
  const currentTask = useRef<string | null>(null)
  const currentRepo = useRef<RepoInfo | null>(null)
  const currentHistoryId = useRef<string | null>(null)
  const isIntentionallyClosed = useRef(false)

  const connect = useCallback((task: string, repo: RepoInfo | null, historyId: string) => {
    // Prevent duplicate connections
    if (currentWs.current?.readyState === WebSocket.OPEN) {
      return
    }

    isIntentionallyClosed.current = false
    currentTask.current = task
    currentRepo.current = repo
    currentHistoryId.current = historyId

    const wsUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token || '')}`
    const ws = new WebSocket(wsUrl)
    currentWs.current = ws

    ws.onopen = () => {
      setConnected(true)
      reconnectAttempts.current = 0
      reconnectDelay.current = INITIAL_RECONNECT_DELAY
      
      // Only send task on initial connection, not reconnection
      if (task) {
        const message: { task: string; repo_url?: string; branch?: string } = { task }
        
        // Include repo info if provided
        if (repo) {
          message.repo_url = repo.url
          message.branch = repo.branch
        }
        
        ws.send(JSON.stringify(message))
      }
    }

    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data)

      switch (type) {
        case 'phase':
          setPhase(data.phase)
          break
        case 'tool_call':
          addToolCall({ name: data.name, args: data.args, status: 'running' })
          break
        case 'tool_result':
          updateToolCall(data.name, data.result)
          break
        case 'summary':
          setSummary(data.summary)
          break
        case 'plan':
          setPlan(
            data.plan.map((step: unknown) => ({
              description: (step as { description?: string }).description || (step as string),
              tool: (step as { tool?: string | null }).tool || null,
              status: 'pending' as const,
            }))
          )
          break
        case 'complete':
          setPhase(data.phase)
          setStagedChanges(data.changes || [])
          updateTaskStatus(historyId, data.changes?.length > 0 ? 'complete' : 'complete')
          isIntentionallyClosed.current = true
          ws.close()
          break
        case 'error':
          setError(data.message)
          updateTaskStatus(historyId, 'error')

          // Handle specific error codes
          if (data.code === 'API_KEY_DECRYPT_FAILED') {
            toast.error('API key error', {
              description: 'Please remove and re-add your API key in Settings.',
              duration: 8000,
            })
          } else if (data.code === 'API_KEY_REQUIRED') {
            toast.error('API key required', {
              description: 'Add your Anthropic API key in Settings to run tasks.',
              duration: 6000,
            })
          } else if (data.message?.includes('Authentication') || data.message?.includes('token')) {
            toast.error('Session expired. Please log in again.')
            logout()
          } else {
            toast.error(data.message)
          }

          isIntentionallyClosed.current = true
          ws.close()
          break
      }
    }

    ws.onerror = () => {
      // Error will trigger onclose, handle reconnection there
    }

    ws.onclose = () => {
      setConnected(false)
      currentWs.current = null

      // Don't reconnect if intentionally closed
      if (isIntentionallyClosed.current) {
        return
      }

      // Handle unexpected closure with reconnection
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++
        
        toast.warning(`Connection lost. Reconnecting... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`)

        setTimeout(() => {
          if (!isIntentionallyClosed.current && currentTask.current && currentHistoryId.current) {
            connect(currentTask.current, currentRepo.current, currentHistoryId.current)
          }
        }, reconnectDelay.current)

        // Exponential backoff with cap
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          MAX_RECONNECT_DELAY
        )
      } else {
        // Max attempts reached
        setError('Unable to connect to the agent')
        if (currentHistoryId.current) {
          updateTaskStatus(currentHistoryId.current, 'error')
        }
        toast.error('Unable to connect. Please refresh the page and try again.')
      }
    }
  }, [token, logout, toast, setPhase, setConnected, addToolCall, updateToolCall, 
      setSummary, setPlan, setStagedChanges, setError, updateTaskStatus])

  const runTask = useCallback((task: string, repo?: RepoInfo | null) => {
    // Require authentication
    if (!token) {
      toast.error('Please log in to run tasks')
      return
    }

    // Close any existing connection
    if (currentWs.current) {
      isIntentionallyClosed.current = true
      currentWs.current.close()
    }

    // Reset state
    reset()
    reconnectAttempts.current = 0
    reconnectDelay.current = INITIAL_RECONNECT_DELAY
    
    setPhase('understanding')
    setTask(task)
    
    const historyId = addTaskToHistory(task)
    connect(task, repo || null, historyId)
  }, [token, toast, reset, setPhase, setTask, addTaskToHistory, connect])

  const disconnect = useCallback(() => {
    isIntentionallyClosed.current = true
    if (currentWs.current) {
      currentWs.current.close()
    }
  }, [])

  return { runTask, disconnect }
}

import { useCallback } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { useToast } from './useToast'

const WS_URL = 'ws://localhost:8000/api/ws/task'

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

  const runTask = useCallback((task: string) => {
    reset()
    setPhase('understanding')
    setTask(task)
    
    const historyId = addTaskToHistory(task)

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ task }))
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
            data.plan.map((step: any) => ({
              description: step.description || step,
              tool: step.tool || null,
              status: 'pending' as const,
            }))
          )
          break
        case 'complete':
          setPhase(data.phase)
          setStagedChanges(data.changes || [])
          updateTaskStatus(historyId, data.changes?.length > 0 ? 'complete' : 'complete')
          ws.close()
          break
        case 'error':
          setError(data.message)
          updateTaskStatus(historyId, 'error')
          toast.error(data.message)
          ws.close()
          break
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection failed')
      updateTaskStatus(historyId, 'error')
      toast.error('Connection to agent failed. Is the backend running?')
    }

    ws.onclose = () => {
      setConnected(false)
    }
  }, [toast])

  return { runTask }
}

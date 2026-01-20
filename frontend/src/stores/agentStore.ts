import { create } from 'zustand'
import type { AgentState, ToolCall, PlanStep } from '../types/agent'
import type { StagedChange } from '../types/changes'

interface TaskHistoryItem {
  id: string
  task: string
  status: 'running' | 'complete' | 'error'
  timestamp: Date
  repoUrl?: string | null
  prUrl?: string | null
}

interface PRResult {
  url: string
  number: number
}

interface AgentStore {
  // Current agent state
  agentState: AgentState
  stagedChanges: StagedChange[]
  isConnected: boolean
  
  // PR result after approval
  prResult: PRResult | null
  
  // Task history
  taskHistory: TaskHistoryItem[]
  currentTaskId: string | null
  
  // Actions
  setPhase: (phase: AgentState['phase']) => void
  setTask: (task: string) => void
  setSummary: (summary: string) => void
  setPlan: (plan: PlanStep[]) => void
  addToolCall: (toolCall: Omit<ToolCall, 'id'>) => void
  updateToolCall: (name: string, result: string) => void
  setStagedChanges: (changes: StagedChange[]) => void
  setError: (error: string) => void
  setConnected: (connected: boolean) => void
  setPRResult: (result: PRResult | null) => void
  
  // Task history actions
  addTaskToHistory: (task: string, repoUrl?: string | null) => string
  updateTaskStatus: (id: string, status: TaskHistoryItem['status'], prUrl?: string | null) => void
  setTaskHistory: (history: TaskHistoryItem[]) => void
  setCurrentTaskId: (id: string | null) => void
  
  // Reset
  reset: () => void
}

const initialAgentState: AgentState = {
  phase: 'idle',
  task: null,
  summary: null,
  plan: [],
  toolCalls: [],
  error: null,
}

let toolCallId = 0

export const useAgentStore = create<AgentStore>((set) => ({
  agentState: initialAgentState,
  stagedChanges: [],
  isConnected: false,
  prResult: null,
  taskHistory: [],
  currentTaskId: null,

  setPhase: (phase) =>
    set((state) => ({
      agentState: { ...state.agentState, phase },
    })),

  setTask: (task) =>
    set((state) => ({
      agentState: { ...state.agentState, task },
    })),

  setSummary: (summary) =>
    set((state) => ({
      agentState: { ...state.agentState, summary },
    })),

  setPlan: (plan) =>
    set((state) => ({
      agentState: { ...state.agentState, plan },
    })),

  addToolCall: (toolCall) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        toolCalls: [
          ...state.agentState.toolCalls,
          { ...toolCall, id: String(++toolCallId) },
        ],
      },
    })),

  updateToolCall: (name, result) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        toolCalls: state.agentState.toolCalls.map((tc) =>
          tc.name === name && tc.status === 'running'
            ? { ...tc, result, status: 'complete' as const }
            : tc
        ),
      },
    })),

  setStagedChanges: (changes) => set({ stagedChanges: changes }),

  setPRResult: (result) => set({ prResult: result }),

  setError: (error) =>
    set((state) => ({
      agentState: { ...state.agentState, phase: 'error', error },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  addTaskToHistory: (task, repoUrl) => {
    const id = crypto.randomUUID()
    const newItem: TaskHistoryItem = {
      id,
      task,
      status: 'running',
      timestamp: new Date(),
      repoUrl,
    }
    set((state) => ({
      taskHistory: [newItem, ...state.taskHistory].slice(0, 20), // Keep last 20
      currentTaskId: id,
    }))
    return id
  },

  updateTaskStatus: (id, status, prUrl) =>
    set((state) => ({
      taskHistory: state.taskHistory.map((t) =>
        t.id === id ? { ...t, status, prUrl: prUrl ?? t.prUrl } : t
      ),
    })),

  setTaskHistory: (history) => set({ taskHistory: history }),

  setCurrentTaskId: (id) => set({ currentTaskId: id }),

  reset: () => {
    toolCallId = 0
    set({
      agentState: initialAgentState,
      stagedChanges: [],
      isConnected: false,
      prResult: null,
      currentTaskId: null,
    })
  },
}))


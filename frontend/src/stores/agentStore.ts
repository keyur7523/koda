import { create } from 'zustand'
import type { AgentState, ToolCall, PlanStep } from '../types/agent'
import type { StagedChange } from '../types/changes'

interface TaskHistoryItem {
  id: string
  task: string
  status: 'running' | 'complete' | 'error'
  timestamp: Date
}

interface AgentStore {
  // Current agent state
  agentState: AgentState
  stagedChanges: StagedChange[]
  isConnected: boolean
  
  // Task history
  taskHistory: TaskHistoryItem[]
  
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
  
  // Task history actions
  addTaskToHistory: (task: string) => string
  updateTaskStatus: (id: string, status: TaskHistoryItem['status']) => void
  
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
  taskHistory: [],

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

  setError: (error) =>
    set((state) => ({
      agentState: { ...state.agentState, phase: 'error', error },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  addTaskToHistory: (task) => {
    const id = crypto.randomUUID()
    const newItem: TaskHistoryItem = {
      id,
      task,
      status: 'running',
      timestamp: new Date(),
    }
    set((state) => ({
      taskHistory: [newItem, ...state.taskHistory].slice(0, 20), // Keep last 20
    }))
    return id
  },

  updateTaskStatus: (id, status) =>
    set((state) => ({
      taskHistory: state.taskHistory.map((t) =>
        t.id === id ? { ...t, status } : t
      ),
    })),

  reset: () => {
    toolCallId = 0
    set({
      agentState: initialAgentState,
      stagedChanges: [],
      isConnected: false,
    })
  },
}))


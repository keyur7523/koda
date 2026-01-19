export type AgentPhase = 
  | 'idle'
  | 'understanding'
  | 'planning'
  | 'executing'
  | 'awaiting_approval'
  | 'complete'
  | 'error'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  status: 'pending' | 'running' | 'complete' | 'error'
}

export interface PlanStep {
  description: string
  tool: string | null
  status: 'pending' | 'running' | 'complete' | 'error'
}

export interface AgentState {
  phase: AgentPhase
  task: string | null
  summary: string | null
  plan: PlanStep[]
  toolCalls: ToolCall[]
  error: string | null
}


const API_BASE = 'http://localhost:8000/api'

export interface TaskResponse {
  phase: string
  task: string
  plan: Array<{ description: string; tool: string | null }>
  error: string | null
  changes: Array<{
    path: string
    changeType: 'create' | 'modify' | 'delete'
    newContent: string
    originalContent: string | null
  }>
}

export interface ApprovalResponse {
  success: boolean
  message: string
}

export async function runTask(task: string): Promise<TaskResponse> {
  const response = await fetch(`${API_BASE}/task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to run task')
  }
  
  return response.json()
}

export async function approveChanges(approved: boolean): Promise<ApprovalResponse> {
  const response = await fetch(`${API_BASE}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to process approval')
  }
  
  return response.json()
}


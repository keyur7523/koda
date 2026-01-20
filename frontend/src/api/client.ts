const API_BASE = 'http://localhost:8000/api'

// ============================================
// Error Types and Handling
// ============================================

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export type ErrorCode = 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

const ERROR_MESSAGES: Record<number, { code: ErrorCode; message: string }> = {
  401: { code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' },
  403: { code: 'FORBIDDEN', message: 'Access denied. You don\'t have permission.' },
  429: { code: 'RATE_LIMITED', message: 'Rate limited. Please try again later.' },
  500: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' },
  502: { code: 'SERVER_ERROR', message: 'Server unavailable. Please try again.' },
  503: { code: 'SERVER_ERROR', message: 'Service temporarily unavailable.' },
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json()
  }

  // Try to get error detail from response
  let detail = ''
  try {
    const errorBody = await response.json()
    detail = errorBody.detail || ''
  } catch {
    // Response may not be JSON
  }

  const errorInfo = ERROR_MESSAGES[response.status]
  
  if (errorInfo) {
    throw new ApiError(
      detail || errorInfo.message,
      response.status,
      errorInfo.code
    )
  }

  throw new ApiError(
    detail || `Request failed with status ${response.status}`,
    response.status,
    'UNKNOWN'
  )
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    return handleResponse<T>(response)
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }
    
    // Network error (no response received)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Connection failed. Check your internet connection.',
        0,
        'NETWORK_ERROR'
      )
    }

    // Unknown error
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      'UNKNOWN'
    )
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
  }
}

// ============================================
// Task Types and Functions
// ============================================

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
  pr_url?: string | null
  pr_number?: number | null
}

export interface ApprovalRequest {
  approved: boolean
  repo_url?: string
  branch?: string
  task_description?: string
}

export async function runTask(task: string): Promise<TaskResponse> {
  return apiFetch<TaskResponse>(`${API_BASE}/task`, {
    method: 'POST',
    body: JSON.stringify({ task }),
  })
}

export async function approveChanges(
  token: string,
  request: ApprovalRequest
): Promise<ApprovalResponse> {
  return apiFetch<ApprovalResponse>(`${API_BASE}/approve`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(request),
  })
}

// ============================================
// Auth Types and Functions
// ============================================

export interface AuthUser {
  id: number
  email: string
  username: string
  avatar_url: string | null
  has_anthropic_key: boolean
  has_openai_key: boolean
  tokens_used: number
  tokens_limit: number
  is_premium: boolean
  created_at: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface SaveApiKeyResponse {
  success: boolean
}

export async function register(
  email: string, 
  password: string, 
  username?: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  })
}

export async function loginWithEmail(
  email: string, 
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: authHeaders(token),
  })
}

export async function saveApiKey(
  token: string, 
  apiKey: string
): Promise<SaveApiKeyResponse> {
  return apiFetch<SaveApiKeyResponse>(`${API_BASE}/auth/api-key`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ api_key: apiKey }),
  })
}

export async function removeApiKey(
  token: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`${API_BASE}/auth/api-key`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
}

export async function deleteAccount(
  token: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`${API_BASE}/auth/account`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
}

// ============================================
// Utility: Check if error is specific type
// ============================================

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'UNAUTHORIZED'
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NETWORK_ERROR'
}

export function isRateLimitedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'RATE_LIMITED'
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// ============================================
// Task History Types and Functions
// ============================================

export interface TaskHistoryItem {
  id: string
  task: string
  repo_url: string | null
  status: 'running' | 'complete' | 'error'
  pr_url: string | null
  created_at: string
}

export interface TaskCreateRequest {
  task: string
  repo_url?: string | null
}

export interface TaskUpdateRequest {
  status?: 'running' | 'complete' | 'error'
  pr_url?: string | null
}

export async function fetchTaskHistory(token: string): Promise<TaskHistoryItem[]> {
  return apiFetch<TaskHistoryItem[]>(`${API_BASE}/tasks/`, {
    method: 'GET',
    headers: authHeaders(token),
  })
}

export async function createTask(
  token: string,
  data: TaskCreateRequest
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`${API_BASE}/tasks/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
}

export async function updateTask(
  token: string,
  taskId: string,
  data: TaskUpdateRequest
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`${API_BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
}

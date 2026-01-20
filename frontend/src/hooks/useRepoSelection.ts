import { useState, useEffect, useCallback } from 'react'

export interface SelectedRepo {
  url: string
  owner: string
  name: string
  branch: string
}

interface RepoHistory {
  repos: SelectedRepo[]
  maxItems: number
}

const STORAGE_KEY = 'koda-selected-repo'
const HISTORY_KEY = 'koda-repo-history'
const MAX_HISTORY = 5

// Regex to parse GitHub URLs
// Matches: https://github.com/owner/repo, https://github.com/owner/repo.git, 
// https://github.com/owner/repo/tree/branch
const GITHUB_URL_REGEX = /^https?:\/\/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?(?:\/tree\/([^\/]+))?/i

export function parseGitHubUrl(url: string): SelectedRepo | null {
  const trimmed = url.trim()
  const match = trimmed.match(GITHUB_URL_REGEX)
  
  if (!match) return null
  
  const [, owner, name, branch] = match
  
  return {
    url: `https://github.com/${owner}/${name}`,
    owner,
    name,
    branch: branch || 'main',
  }
}

export function validateGitHubUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: 'Please enter a repository URL' }
  }
  
  if (!url.includes('github.com')) {
    return { valid: false, error: 'Only GitHub repositories are supported' }
  }
  
  const parsed = parseGitHubUrl(url)
  if (!parsed) {
    return { valid: false, error: 'Invalid GitHub URL format. Use: https://github.com/owner/repo' }
  }
  
  return { valid: true }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage might be full or disabled
  }
}

export function useRepoSelection() {
  const [selectedRepo, setSelectedRepoState] = useState<SelectedRepo | null>(() => 
    loadFromStorage<SelectedRepo | null>(STORAGE_KEY, null)
  )
  
  const [repoHistory, setRepoHistory] = useState<SelectedRepo[]>(() => {
    const history = loadFromStorage<RepoHistory>(HISTORY_KEY, { repos: [], maxItems: MAX_HISTORY })
    return history.repos
  })
  
  const [isEditing, setIsEditing] = useState(!selectedRepo)

  // Persist selected repo
  useEffect(() => {
    saveToStorage(STORAGE_KEY, selectedRepo)
  }, [selectedRepo])

  // Persist history
  useEffect(() => {
    saveToStorage<RepoHistory>(HISTORY_KEY, { repos: repoHistory, maxItems: MAX_HISTORY })
  }, [repoHistory])

  const selectRepo = useCallback((repo: SelectedRepo) => {
    setSelectedRepoState(repo)
    setIsEditing(false)
    
    // Add to history (avoid duplicates, keep recent at top)
    setRepoHistory(prev => {
      const filtered = prev.filter(r => r.url !== repo.url)
      return [repo, ...filtered].slice(0, MAX_HISTORY)
    })
  }, [])

  const selectRepoFromUrl = useCallback((url: string): { success: boolean; error?: string } => {
    const validation = validateGitHubUrl(url)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }
    
    const parsed = parseGitHubUrl(url)
    if (!parsed) {
      return { success: false, error: 'Failed to parse URL' }
    }
    
    selectRepo(parsed)
    return { success: true }
  }, [selectRepo])

  const clearSelection = useCallback(() => {
    setSelectedRepoState(null)
    setIsEditing(true)
  }, [])

  const startEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  const cancelEditing = useCallback(() => {
    if (selectedRepo) {
      setIsEditing(false)
    }
  }, [selectedRepo])

  const removeFromHistory = useCallback((url: string) => {
    setRepoHistory(prev => prev.filter(r => r.url !== url))
  }, [])

  return {
    selectedRepo,
    repoHistory,
    isEditing,
    selectRepo,
    selectRepoFromUrl,
    clearSelection,
    startEditing,
    cancelEditing,
    removeFromHistory,
  }
}


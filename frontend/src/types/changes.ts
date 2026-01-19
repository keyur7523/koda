export type ChangeType = 'create' | 'modify' | 'delete'

export interface StagedChange {
  path: string
  changeType: ChangeType
  newContent: string
  originalContent: string | null
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  lineNumber: number | null
}


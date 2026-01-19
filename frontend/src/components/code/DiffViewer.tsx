import { useMemo } from 'react'
import type { StagedChange } from '../../types/changes'

interface DiffViewerProps {
  change: StagedChange
}

export function DiffViewer({ change }: DiffViewerProps) {
  const diffLines = useMemo(() => {
    const oldLines = change.originalContent?.split('\n') || []
    const newLines = change.newContent.split('\n')
    
    // Simple diff: show all old as removed, all new as added
    // In production, use a proper diff algorithm
    const lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }> = []
    
    if (change.changeType === 'create') {
      newLines.forEach(line => lines.push({ type: 'add', content: line }))
    } else if (change.changeType === 'delete') {
      oldLines.forEach(line => lines.push({ type: 'remove', content: line }))
    } else {
      oldLines.forEach(line => lines.push({ type: 'remove', content: line }))
      newLines.forEach(line => lines.push({ type: 'add', content: line }))
    }
    
    return lines
  }, [change])

  return (
    <div className="font-mono text-xs overflow-x-auto">
      {diffLines.map((line, i) => (
        <div
          key={i}
          className={`px-3 py-0.5 ${
            line.type === 'add' 
              ? 'bg-green-50 text-green-800' 
              : line.type === 'remove'
              ? 'bg-red-50 text-red-800'
              : 'bg-koda-bg text-koda-text'
          }`}
        >
          <span className="select-none mr-2 text-koda-text-muted">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          {line.content || ' '}
        </div>
      ))}
    </div>
  )
}


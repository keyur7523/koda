import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface TaskInputProps {
  onSubmit: (task: string) => void
  isLoading?: boolean
  disabled?: boolean
}

export function TaskInput({ onSubmit, isLoading = false, disabled = false }: TaskInputProps) {
  const [task, setTask] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [task])

  const handleSubmit = () => {
    if (task.trim() && !isLoading && !disabled) {
      onSubmit(task.trim())
      setTask('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="bg-koda-surface border border-koda-border rounded-xl shadow-sm
                    focus-within:ring-2 focus-within:ring-koda-accent focus-within:border-transparent
                    transition-shadow">
      <textarea
        ref={textareaRef}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to do... (Ctrl+Enter to send)"
        disabled={isLoading || disabled}
        rows={1}
        className="w-full px-4 py-3 bg-transparent resize-none outline-none
                   text-koda-text placeholder:text-koda-text-muted
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-sm md:text-base"
      />
      
      <div className="flex items-center justify-between px-4 py-2 border-t border-koda-border">
        <span className="text-xs text-koda-text-muted hidden sm:block">
          {isLoading ? 'Processing...' : 'Ctrl+Enter to send'}
        </span>
        
        <button
          onClick={handleSubmit}
          disabled={!task.trim() || isLoading || disabled}
          className="ml-auto flex items-center gap-2 px-4 py-2 
                     bg-koda-accent text-white rounded-lg font-medium text-sm
                     hover:bg-koda-accent-hover 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span className="hidden sm:inline">Running...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span className="hidden sm:inline">Run Task</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}


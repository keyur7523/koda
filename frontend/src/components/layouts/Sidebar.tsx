import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAgentStore } from '../../stores/agentStore'
import { TokenUsageIndicator } from '../ui/TokenUsageIndicator'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const taskHistory = useAgentStore((state) => state.taskHistory)

  const statusIcon = {
    running: <Loader2 size={14} className="animate-spin text-koda-accent" />,
    complete: <CheckCircle size={14} className="text-koda-accent" />,
    error: <AlertCircle size={14} className="text-red-500" />,
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-koda-surface border-r border-koda-border
          transform transition-transform duration-200 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:z-0
        `}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Mobile header */}
          <div className="flex justify-between items-center mb-6 md:hidden">
            <span className="font-semibold text-koda-accent">◆ Koda</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-koda-surface-hover rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Task history */}
          <div className="flex-1 overflow-auto">
            <h2 className="text-xs font-medium text-koda-text-muted uppercase tracking-wider mb-3">
              Recent Tasks
            </h2>
            
            {taskHistory.length === 0 ? (
              <p className="text-sm text-koda-text-muted italic">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {taskHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg hover:bg-koda-surface-hover cursor-pointer
                               transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      {statusIcon[item.status]}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-koda-text truncate">
                          {item.task}
                        </p>
                        <p className="text-xs text-koda-text-muted">
                          {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Token Usage Indicator */}
          <div className="border-t border-koda-border mt-auto pt-2">
            <TokenUsageIndicator />
          </div>
        </div>
      </aside>
    </>
  )
}

import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'

interface Shortcut {
  key: string
  description: string
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[]
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-koda-surface-hover text-koda-text-muted
                   transition-colors"
        title="Keyboard shortcuts"
      >
        <Keyboard size={18} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        bg-koda-surface border border-koda-border rounded-xl
                        shadow-xl z-50 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-koda-border">
              <h2 className="font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-koda-surface-hover rounded"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-sm text-koda-text-muted">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-koda-bg border border-koda-border rounded text-xs font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}


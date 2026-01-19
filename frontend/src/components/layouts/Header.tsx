import { Menu } from 'lucide-react'
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { shortcuts } = useKeyboardShortcuts()

  return (
    <header className="bg-koda-surface border-b border-koda-border px-4 py-3 
                       md:px-6 md:py-4 flex items-center gap-4">
      <button 
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-koda-surface-hover md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      
      <h1 className="text-lg md:text-xl font-semibold">
        <span className="text-koda-accent">◆</span> Koda
      </h1>
      
      <div className="flex-1" />
      
      <div className="text-xs text-koda-text-muted hidden sm:block">
        AI Coding Agent
      </div>
      
      <ThemeToggle />
      <KeyboardShortcutsHelp shortcuts={shortcuts} />
    </header>
  )
}

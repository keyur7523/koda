import { Link } from 'react-router-dom'
import { Menu, Settings } from 'lucide-react'
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  onMenuClick: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuClick, showMenuButton = true }: HeaderProps) {
  const { shortcuts } = useKeyboardShortcuts()
  const { isAuthenticated } = useAuth()

  return (
    <header className="bg-koda-surface border-b border-koda-border px-4 py-3 
                       md:px-6 md:py-4 flex items-center gap-4">
      {showMenuButton && (
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-koda-surface-hover md:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
      )}
      
      <Link to="/dashboard" className="text-lg md:text-xl font-semibold hover:opacity-80 transition-opacity">
        <span className="text-koda-accent">◆</span> Koda
      </Link>
      
      <div className="flex-1" />
      
      <div className="text-xs text-koda-text-muted hidden sm:block">
        AI Coding Agent
      </div>
      
      <ThemeToggle />
      <KeyboardShortcutsHelp shortcuts={shortcuts} />
      
      {isAuthenticated && (
        <Link
          to="/settings"
          className="p-2 rounded-lg hover:bg-koda-surface-hover transition-colors"
          title="Settings"
        >
          <Settings size={20} className="text-koda-text-muted" />
        </Link>
      )}
    </header>
  )
}

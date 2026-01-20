import { useHotkeys } from 'react-hotkeys-hook'

export function useKeyboardShortcuts() {

  // Cmd/Ctrl + K to focus task input
  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    const input = document.querySelector('textarea')
    input?.focus()
  }, { enableOnFormTags: true })

  // Escape to blur input
  useHotkeys('escape', () => {
    const active = document.activeElement as HTMLElement
    active?.blur()
  }, { enableOnFormTags: true })

  // Cmd/Ctrl + Enter handled in TaskInput already

  return {
    shortcuts: [
      { key: '⌘K', description: 'Focus task input' },
      { key: '⌘↵', description: 'Submit task' },
      { key: 'Esc', description: 'Unfocus input' },
    ]
  }
}


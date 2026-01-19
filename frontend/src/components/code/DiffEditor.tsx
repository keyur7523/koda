import { useState, useEffect } from 'react'
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react'
import { useThemeStore } from '../../stores/themeStore'

interface DiffEditorProps {
  original: string
  modified: string
  language?: string
  height?: string
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  return isMobile
}

export function DiffEditor({ 
  original, 
  modified, 
  language = 'typescript',
  height = '300px' 
}: DiffEditorProps) {
  const isMobile = useIsMobile()
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)

  return (
    <div className="border border-koda-border rounded-lg overflow-hidden">
      <MonacoDiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: isMobile ? 11 : 13,
          scrollBeyondLastLine: false,
          renderSideBySide: !isMobile,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  )
}

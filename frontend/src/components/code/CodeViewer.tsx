import Editor from '@monaco-editor/react'

interface CodeViewerProps {
  code: string
  language?: string
  height?: string
  readOnly?: boolean
}

export function CodeViewer({ 
  code, 
  language = 'typescript', 
  height = '300px',
  readOnly = true 
}: CodeViewerProps) {
  return (
    <div className="border border-koda-border rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={code}
        theme="vs-light"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
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


import { Sparkles, FileText, TestTube, Bug, GitBranch } from 'lucide-react'

interface EmptyStateProps {
  onExampleClick: (task: string) => void
  repoName?: string // e.g., "owner/repo"
}

const exampleTasks = [
  {
    icon: <FileText size={18} />,
    title: 'Add a README',
    task: 'Add a README.md file with project description, setup instructions, and usage examples',
  },
  {
    icon: <TestTube size={18} />,
    title: 'Add tests',
    task: 'Add unit tests for the main module with good coverage of edge cases',
  },
  {
    icon: <Bug size={18} />,
    title: 'Fix bugs',
    task: 'Find and fix any obvious bugs or issues in the codebase',
  },
]

export function EmptyState({ onExampleClick, repoName }: EmptyStateProps) {
  return (
    <div className="py-8 md:py-16">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 
                      bg-koda-accent-light rounded-2xl mb-4">
          <Sparkles className="text-koda-accent" size={32} />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold text-koda-text mb-2">
          What would you like to build?
        </h2>
        <p className="text-koda-text-muted max-w-md mx-auto">
          Describe a task in natural language. Koda will understand your codebase,
          create a plan, and make changes with your approval.
        </p>
      </div>

      {/* Example tasks */}
      <div className="max-w-lg mx-auto">
        {/* Show which repo we're working on */}
        {repoName && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-koda-text-muted">
            <GitBranch size={14} className="text-koda-accent" />
            <span>Working on: <span className="font-medium text-koda-text">{repoName}</span></span>
          </div>
        )}
        
        <p className="text-xs font-medium text-koda-text-muted uppercase tracking-wider mb-3">
          Try an example
        </p>
        <div className="space-y-2">
          {exampleTasks.map((example) => (
            <button
              key={example.title}
              onClick={() => onExampleClick(example.task)}
              className="w-full flex items-center gap-3 p-3 
                       bg-koda-surface border border-koda-border rounded-xl
                       hover:border-koda-accent hover:shadow-sm
                       transition-all text-left group"
            >
              <div className="p-2 bg-koda-bg rounded-lg text-koda-text-muted
                            group-hover:bg-koda-accent-light group-hover:text-koda-accent
                            transition-colors">
                {example.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-koda-text">{example.title}</p>
                <p className="text-xs text-koda-text-muted truncate">{example.task}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[
          { title: 'Safe', desc: 'Changes require your approval' },
          { title: 'Transparent', desc: 'See every step and tool call' },
          { title: 'Smart', desc: 'Understands code structure' },
        ].map((feature) => (
          <div key={feature.title} className="text-center p-4">
            <p className="font-medium text-koda-text">{feature.title}</p>
            <p className="text-xs text-koda-text-muted mt-1">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

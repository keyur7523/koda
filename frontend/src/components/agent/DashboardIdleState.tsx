import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, FileText, TestTube, Bug, GitBranch } from 'lucide-react'
import { RepoSelector } from './RepoSelector'
import { TaskInput } from './TaskInput'
import type { SelectedRepo } from '../../hooks/useRepoSelection'
import { useToast } from '../../hooks/useToast'

interface DashboardIdleStateProps {
  // Repo selection
  selectedRepo: SelectedRepo | null
  repoHistory: SelectedRepo[]
  isEditing: boolean
  onSelectFromUrl: (url: string) => { success: boolean; error?: string }
  onSelectFromHistory: (repo: SelectedRepo) => void
  onClear: () => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onRemoveFromHistory: (url: string) => void
  // Task input
  taskInputValue: string
  onTaskInputChange: (value: string) => void
  onTaskSubmit: (task: string) => void
  isLoading: boolean
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

export function DashboardIdleState({
  selectedRepo,
  repoHistory,
  isEditing,
  onSelectFromUrl,
  onSelectFromHistory,
  onClear,
  onStartEditing,
  onCancelEditing,
  onRemoveFromHistory,
  taskInputValue,
  onTaskInputChange,
  onTaskSubmit,
  isLoading,
}: DashboardIdleStateProps) {
  const toast = useToast()
  const repoSelectorRef = useRef<HTMLDivElement>(null)
  const isRepoSelected = selectedRepo !== null
  const repoName = selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : undefined

  const handleExampleClick = (task: string) => {
    if (!isRepoSelected) {
      // Focus repo input and show toast
      toast.info('Select a repository first')
      onStartEditing()
      repoSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // Populate TaskInput
    onTaskInputChange(task)
  }

  return (
    <div className="py-6 md:py-10 space-y-8">
      {/* 1. Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 
                      bg-koda-accent-light rounded-2xl mb-4">
          <Sparkles className="text-koda-accent" size={28} />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold text-koda-text mb-2">
          What would you like to build?
        </h2>
        <p className="text-koda-text-muted max-w-md mx-auto text-sm md:text-base">
          Describe a task in natural language. Koda will understand your codebase,
          create a plan, and make changes with your approval.
        </p>
      </motion.div>

      {/* 2. Example Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-lg mx-auto"
      >
        <p className="text-xs font-medium text-koda-text-muted uppercase tracking-wider mb-3 text-center">
          Try an example
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {exampleTasks.map((example, i) => (
            <motion.button
              key={example.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              onClick={() => handleExampleClick(example.task)}
              className="flex flex-col items-center gap-2 p-4 
                       bg-koda-surface border border-koda-border rounded-xl
                       hover:border-koda-accent hover:shadow-sm
                       transition-all text-center group"
            >
              <div className="p-2 bg-koda-bg rounded-lg text-koda-text-muted
                            group-hover:bg-koda-accent-light group-hover:text-koda-accent
                            transition-colors">
                {example.icon}
              </div>
              <p className="font-medium text-sm text-koda-text">{example.title}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* 3. Repo Selector + Task Input */}
      <motion.div 
        ref={repoSelectorRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl mx-auto space-y-4"
      >
        {/* Show repo name if selected */}
        {isRepoSelected && repoName && (
          <div className="flex items-center justify-center gap-2 text-sm text-koda-text-muted">
            <GitBranch size={14} className="text-koda-accent" />
            <span>Working on: <span className="font-medium text-koda-text">{repoName}</span></span>
          </div>
        )}

        <RepoSelector
          selectedRepo={selectedRepo}
          repoHistory={repoHistory}
          isEditing={isEditing}
          onSelectFromUrl={onSelectFromUrl}
          onSelectFromHistory={onSelectFromHistory}
          onClear={onClear}
          onStartEditing={onStartEditing}
          onCancelEditing={onCancelEditing}
          onRemoveFromHistory={onRemoveFromHistory}
        />

        {/* Task Input - show when repo selected or when there's a value */}
        {(isRepoSelected || taskInputValue) && (
          <TaskInput
            onSubmit={onTaskSubmit}
            isLoading={isLoading}
            disabled={!isRepoSelected}
            placeholder={
              isRepoSelected
                ? 'Describe what you want to do... (Ctrl+Enter to send)'
                : 'Select a repository first'
            }
            initialValue={taskInputValue}
            onValueChange={onTaskInputChange}
          />
        )}
      </motion.div>

      {/* 4. Features Row */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4"
      >
        {[
          { title: 'Safe', desc: 'Changes require your approval' },
          { title: 'Transparent', desc: 'See every step and tool call' },
          { title: 'Smart', desc: 'Understands code structure' },
        ].map((feature) => (
          <div key={feature.title} className="text-center">
            <p className="font-medium text-koda-text text-sm">{feature.title}</p>
            <p className="text-xs text-koda-text-muted mt-0.5">{feature.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}


import { Loader2, Brain, ListTodo, Play, CheckCircle, AlertCircle, Clock, GitBranch } from 'lucide-react'
import type { AgentPhase } from '../../types/agent'

interface PhaseIndicatorProps {
  phase: AgentPhase
}

const phaseConfig: Record<AgentPhase, { icon: React.ReactNode; label: string; color: string }> = {
  idle: { icon: <Clock size={16} />, label: 'Ready', color: 'text-koda-text-muted' },
  cloning: { icon: <GitBranch size={16} />, label: 'Cloning Repository', color: 'text-cyan-500' },
  understanding: { icon: <Brain size={16} />, label: 'Understanding', color: 'text-blue-500' },
  planning: { icon: <ListTodo size={16} />, label: 'Planning', color: 'text-purple-500' },
  executing: { icon: <Play size={16} />, label: 'Executing', color: 'text-koda-accent' },
  awaiting_approval: { icon: <Clock size={16} />, label: 'Awaiting Approval', color: 'text-amber-500' },
  complete: { icon: <CheckCircle size={16} />, label: 'Complete', color: 'text-koda-accent' },
  error: { icon: <AlertCircle size={16} />, label: 'Error', color: 'text-red-500' },
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const config = phaseConfig[phase]
  const isActive = !['idle', 'complete', 'error'].includes(phase)

  return (
    <div className={`flex items-center gap-2 ${config.color}`}>
      {isActive ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        config.icon
      )}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}


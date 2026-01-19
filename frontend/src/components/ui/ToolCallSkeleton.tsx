import { Skeleton } from './Skeleton'

export function ToolCallSkeleton() {
  return (
    <div className="flex items-center gap-2 p-3 bg-koda-surface border border-koda-border rounded-lg">
      <Skeleton className="w-4 h-4 rounded-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}


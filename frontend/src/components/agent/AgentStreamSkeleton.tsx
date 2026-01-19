import { Skeleton, SkeletonText } from '../ui/Skeleton'

export function AgentStreamSkeleton() {
  return (
    <div className="space-y-4">
      {/* Phase indicator skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Summary skeleton */}
      <div className="p-4 bg-koda-surface border border-koda-border rounded-lg">
        <Skeleton className="h-4 w-20 mb-3" />
        <SkeletonText lines={4} />
      </div>

      {/* Tool calls skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 mb-2" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-3 bg-koda-surface border border-koda-border rounded-lg"
          >
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1 max-w-[200px]" />
          </div>
        ))}
      </div>
    </div>
  )
}


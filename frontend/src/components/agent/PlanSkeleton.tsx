import { Skeleton } from '../ui/Skeleton'

export function PlanSkeleton() {
  return (
    <div className="p-4 bg-koda-surface border border-koda-border rounded-lg">
      <Skeleton className="h-4 w-16 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
            <Skeleton className="h-4 flex-1" style={{ width: `${85 - i * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}


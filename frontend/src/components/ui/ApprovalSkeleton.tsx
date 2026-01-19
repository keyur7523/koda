import { Skeleton } from './Skeleton'

export function ApprovalSkeleton() {
  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden 
                    dark:border-amber-800 dark:bg-amber-950">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-100 border-b border-amber-200 
                     dark:bg-amber-900 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-32 mb-2 bg-amber-200 dark:bg-amber-800" />
            <Skeleton className="h-4 w-24 bg-amber-200 dark:bg-amber-800" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg bg-amber-200 dark:bg-amber-800" />
            <Skeleton className="h-9 w-28 rounded-lg bg-amber-200 dark:bg-amber-800" />
          </div>
        </div>
      </div>

      {/* File list */}
      <div className="divide-y divide-amber-200 dark:divide-amber-800">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-koda-surface">
            <Skeleton className="w-8 h-8 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


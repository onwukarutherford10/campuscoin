interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Skeleton matching the financial summary card dimensions. */
export function SummarySkeleton() {
  return (
    <div className="rounded-2xl bg-white p-6" aria-label="Loading financial summary">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-9 w-48" />
      <div className="mt-6 flex gap-4">
        <Skeleton className="h-16 flex-1" />
        <Skeleton className="h-16 flex-1" />
        <Skeleton className="h-16 flex-1" />
      </div>
    </div>
  );
}

/** Skeleton for list-style sections such as transactions and budgets. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading section">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

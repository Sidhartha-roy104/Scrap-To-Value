export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton animate-pulse-subtle ${className}`} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card-base p-6">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

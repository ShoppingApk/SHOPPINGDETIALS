export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function LineSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

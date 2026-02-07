interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-surface ${className}`}
        />
    );
}

export function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
            <Skeleton className="mb-4 h-40 w-full rounded-xl" />
            <Skeleton className="mb-2 h-6 w-3/4" />
            <Skeleton className="mb-4 h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
    );
}

export function JobCardSkeleton() {
    return (
        <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6">
            <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="mb-2 h-5 w-2/3" />
                    <Skeleton className="mb-3 h-4 w-1/3" />
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                </div>
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
    );
}

export function ListingSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 border-b border-[var(--card-border)] px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
        </div>
    );
}

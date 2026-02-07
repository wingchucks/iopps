export default function DirectoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-surface h-72 mb-12 animate-pulse" />

      {/* Stats Bar */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-5 w-32 bg-surface rounded animate-pulse" />
        <div className="h-5 w-48 bg-surface rounded animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-surface h-72" />
        ))}
      </div>
    </div>
  );
}

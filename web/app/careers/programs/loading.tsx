export default function TrainingProgramsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 h-64 mb-12 animate-pulse" />

      {/* Stats Bar */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-5 w-32 bg-surface rounded animate-pulse" />
        <div className="h-5 w-48 bg-surface rounded animate-pulse" />
      </div>

      {/* Filters Skeleton */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="h-10 w-32 bg-surface rounded-full animate-pulse" />
        <div className="h-10 w-32 bg-surface rounded-full animate-pulse" />
        <div className="h-10 w-32 bg-surface rounded-full animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-surface h-72" />
        ))}
      </div>
    </div>
  );
}

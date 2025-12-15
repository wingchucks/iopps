export default function OrganizationsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 h-72 mb-12 animate-pulse" />

      {/* Filters */}
      <div className="mb-8 rounded-2xl bg-slate-800/50 p-6 animate-pulse">
        <div className="flex flex-wrap gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 w-24 bg-slate-700 rounded-full" />
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-72" />
        ))}
      </div>
    </div>
  );
}

export default function TrainingProgramDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link Skeleton */}
      <div className="h-5 w-48 bg-surface rounded animate-pulse mb-6" />

      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 h-72 mb-8 animate-pulse" />

      {/* Share Section Skeleton */}
      <div className="rounded-xl border border-[var(--card-border)] bg-surface h-16 mb-8 animate-pulse" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* About Section */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 sm:p-8 animate-pulse">
            <div className="h-6 w-48 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-700 rounded" />
              <div className="h-4 w-3/4 bg-slate-700 rounded" />
            </div>
          </div>

          {/* Skills Section */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 animate-pulse">
            <div className="h-6 w-40 bg-slate-700 rounded mb-4" />
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-24 bg-slate-700 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Details Card */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 animate-pulse">
            <div className="h-6 w-36 bg-slate-700 rounded mb-4" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 bg-slate-700 rounded" />
                  <div className="h-4 w-24 bg-slate-700 rounded" />
                </div>
              ))}
            </div>
            <div className="h-12 w-full bg-purple-500/20 rounded-full mt-6" />
          </div>

          {/* Provider Card */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 animate-pulse">
            <div className="h-6 w-36 bg-slate-700 rounded mb-4" />
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-slate-700 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-slate-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

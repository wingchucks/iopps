import { PageShell } from '@/components/PageShell';

export default function BusinessesLoading() {
  return (
    <PageShell>
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-800/50 px-6 py-16 sm:px-12 sm:py-24 mb-12 border border-slate-700 animate-pulse">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="h-12 bg-slate-700 rounded-lg w-3/4 mx-auto" />
          <div className="h-6 bg-slate-700 rounded-lg w-2/3 mx-auto" />
          <div className="h-12 bg-slate-700 rounded-full w-full max-w-md mx-auto" />
          <div className="flex justify-center gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-32 bg-slate-700 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-5 w-40 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl bg-slate-800/50 border border-slate-700 overflow-hidden"
          >
            <div className="h-28 bg-slate-700" />
            <div className="p-4 pt-9 space-y-3">
              <div className="h-6 bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-700 rounded-full" />
                <div className="h-6 w-20 bg-slate-700 rounded-full" />
              </div>
              <div className="pt-4 border-t border-slate-700">
                <div className="h-5 w-32 bg-slate-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

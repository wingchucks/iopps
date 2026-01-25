import { PageShell } from '@/components/PageShell';

export default function OrganizationProfileLoading() {
  return (
    <PageShell className="max-w-7xl">
      {/* Header Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-800/50 border border-slate-700 mb-8 animate-pulse">
        {/* Banner */}
        <div className="h-48 sm:h-64 bg-slate-700" />

        {/* Profile Info */}
        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
          {/* Logo */}
          <div className="absolute -top-16 sm:-top-20">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-slate-700 border-4 border-slate-900" />
          </div>

          {/* Name and Details */}
          <div className="pt-12 sm:pt-16 sm:ml-36 space-y-4">
            <div className="h-8 w-64 bg-slate-700 rounded" />
            <div className="h-5 w-96 bg-slate-700 rounded" />
            <div className="flex gap-4">
              <div className="h-5 w-32 bg-slate-700 rounded" />
              <div className="h-5 w-24 bg-slate-700 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-24 bg-slate-700 rounded-full" />
              <div className="h-8 w-20 bg-slate-700 rounded-full" />
              <div className="h-8 w-16 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="mb-8 flex items-center gap-2 pb-2 border-b border-slate-700/50">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-slate-700 rounded-full animate-pulse" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6 animate-pulse">
            <div className="h-5 w-24 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-3/4" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6 animate-pulse">
            <div className="h-5 w-24 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-700 rounded" />
                <div className="h-4 w-16 bg-slate-700 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-slate-700 rounded" />
                <div className="h-4 w-12 bg-slate-700 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

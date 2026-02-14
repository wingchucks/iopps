import { FeedLayout } from '@/components/opportunity-graph';

export default function OrganizationProfileLoading() {
  return (
    <FeedLayout activeNav="organizations" fullWidth>
      {/* Header Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] mb-8 animate-pulse">
        {/* Banner */}
        <div className="h-48 sm:h-64 bg-surface" />

        {/* Profile Info */}
        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
          {/* Logo */}
          <div className="absolute -top-16 sm:-top-20">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-surface border-4 border-white" />
          </div>

          {/* Name and Details */}
          <div className="pt-12 sm:pt-16 sm:ml-36 space-y-4">
            <div className="h-8 w-64 bg-surface rounded" />
            <div className="h-5 w-96 bg-surface rounded" />
            <div className="flex gap-4">
              <div className="h-5 w-32 bg-surface rounded" />
              <div className="h-5 w-24 bg-surface rounded" />
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-24 bg-surface rounded-full" />
              <div className="h-8 w-20 bg-surface rounded-full" />
              <div className="h-8 w-16 bg-surface rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="mb-8 flex items-center gap-2 pb-2 border-b border-[var(--border)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-surface rounded-full animate-pulse" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 animate-pulse">
            <div className="h-5 w-24 bg-surface rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-surface rounded w-full" />
              <div className="h-4 bg-surface rounded w-full" />
              <div className="h-4 bg-surface rounded w-3/4" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 animate-pulse">
            <div className="h-5 w-24 bg-surface rounded mb-4" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-surface rounded" />
                <div className="h-4 w-16 bg-surface rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-surface rounded" />
                <div className="h-4 w-12 bg-surface rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}

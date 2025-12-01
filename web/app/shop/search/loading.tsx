import { PageShell } from "@/components/PageShell";
import { VendorCardSkeleton } from "@/components/shop/VendorCard";

export default function SearchPageLoading() {
  return (
    <PageShell>
      {/* Header */}
      <header>
        {/* Breadcrumb Skeleton */}
        <nav className="flex items-center gap-2 text-sm">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
          <span className="text-slate-700">/</span>
          <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
        </nav>

        {/* Search Bar Skeleton */}
        <div className="mt-6">
          <div className="h-14 w-full animate-pulse rounded-full bg-slate-800" />
        </div>

        {/* Page Title Skeleton */}
        <div className="mt-8">
          <div className="h-9 w-64 animate-pulse rounded bg-slate-800" />
        </div>
      </header>

      {/* Active Filters Skeleton */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="h-4 w-12 animate-pulse rounded bg-slate-800" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-slate-800" />
        <div className="h-8 w-32 animate-pulse rounded-full bg-slate-800" />
      </div>

      {/* Main Content */}
      <div className="mt-8 flex gap-8">
        {/* Desktop Filter Sidebar Skeleton */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-14 animate-pulse rounded bg-slate-800" />
            </div>

            {/* Filter Sections */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-t border-slate-800 py-4">
                <div className="mb-3 h-4 w-20 animate-pulse rounded bg-slate-800" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-800" />
              </div>
            ))}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Toolbar Skeleton */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-800 lg:hidden" />
              <div className="h-10 w-36 animate-pulse rounded-lg bg-slate-800" />
            </div>
          </div>

          {/* Results Grid Skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <VendorCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

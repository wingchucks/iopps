import { PageShell } from "@/components/PageShell";
import { VendorCardSkeleton } from "@/components/shop/VendorCard";

export default function CategoryPageLoading() {
  return (
    <PageShell>
      {/* Breadcrumb Skeleton */}
      <nav className="flex items-center gap-2 text-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
        <span className="text-slate-700">/</span>
        <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
      </nav>

      {/* Header Skeleton */}
      <header className="mt-6">
        <div className="h-9 w-48 animate-pulse rounded bg-slate-800" />
        <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded bg-slate-800" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-slate-800" />
      </header>

      {/* Subcategory Pills Skeleton */}
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-full bg-slate-800"
            style={{ width: `${80 + Math.random() * 40}px` }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="mt-8 flex gap-8">
        {/* Desktop Filter Sidebar Skeleton */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <div className="mb-4 h-4 w-16 animate-pulse rounded bg-slate-800" />

            {/* Filter Sections */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-t border-slate-800 py-4">
                <div className="mb-3 h-4 w-24 animate-pulse rounded bg-slate-800" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-2"
                    >
                      <div className="h-4 w-4 animate-pulse rounded bg-slate-800" />
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {/* Toolbar Skeleton */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-800 md:hidden" />
              <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-800" />
            </div>
          </div>

          {/* Results Grid Skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <VendorCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

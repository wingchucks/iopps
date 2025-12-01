import { PageShell } from "@/components/PageShell";
import { FeaturedVendorSkeleton } from "@/components/shop/FeaturedVendor";
import { CategoryGridSkeleton } from "@/components/shop/CategoryCard";
import { VendorCardSkeleton } from "@/components/shop/VendorCard";

export default function ShopLoading() {
  return (
    <PageShell>
      {/* Hero Section Skeleton */}
      <section className="text-center">
        <div className="mx-auto h-4 w-28 animate-pulse rounded bg-slate-800" />
        <div className="mx-auto mt-3 h-10 w-full max-w-2xl animate-pulse rounded bg-slate-800 sm:h-12" />
        <div className="mx-auto mt-3 h-10 w-full max-w-xl animate-pulse rounded bg-slate-800 sm:h-12" />
        <div className="mx-auto mt-4 h-16 w-full max-w-2xl animate-pulse rounded bg-slate-800" />
        {/* Search Bar Skeleton */}
        <div className="mx-auto mt-8 h-14 w-full max-w-2xl animate-pulse rounded-full bg-slate-800" />
        <div className="mx-auto mt-3 flex justify-center gap-2">
          <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-12 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-14 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
        </div>
      </section>

      {/* Featured Vendor Section Skeleton */}
      <section className="mt-12">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-slate-800" />
        <FeaturedVendorSkeleton />
      </section>

      {/* Categories Section Skeleton */}
      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
        </div>
        <CategoryGridSkeleton />
      </section>

      {/* Region Section Skeleton */}
      <section className="mt-14">
        <div className="mb-4 h-5 w-36 animate-pulse rounded bg-slate-800" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 shrink-0 animate-pulse rounded-full bg-slate-800"
            />
          ))}
        </div>
      </section>

      {/* New Vendors Section Skeleton */}
      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-56 animate-pulse rounded bg-slate-800" />
          </div>
          <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <VendorCardSkeleton key={i} size="compact" />
          ))}
        </div>
      </section>

      {/* Popular Vendors Section Skeleton */}
      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-800" />
          </div>
          <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <VendorCardSkeleton key={i} size="compact" />
          ))}
        </div>
      </section>

      {/* CTA Section Skeleton */}
      <section className="mt-16 animate-pulse rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-40 rounded bg-slate-800" />
            <div className="h-6 w-64 rounded bg-slate-800" />
            <div className="h-4 w-96 max-w-full rounded bg-slate-800" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="h-10 w-40 rounded-full bg-slate-800" />
            <div className="h-10 w-28 rounded-full bg-slate-800" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

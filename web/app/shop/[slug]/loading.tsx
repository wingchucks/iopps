import { PageShell } from "@/components/PageShell";
import { VendorHeroSkeleton } from "@/components/shop/VendorHero";
import { VendorStorySkeleton } from "@/components/shop/VendorStory";
import { VendorGallerySkeleton } from "@/components/shop/VendorGallery";
import { VendorCardSkeleton } from "@/components/shop/VendorCard";

export default function VendorStorefrontLoading() {
  return (
    <PageShell className="pb-24 md:pb-10">
      {/* Back Link Skeleton */}
      <div className="h-4 w-36 animate-pulse rounded bg-slate-800" />

      {/* Hero Skeleton */}
      <div className="mt-6">
        <VendorHeroSkeleton />
      </div>

      {/* CTA Bar Skeleton */}
      <div className="mt-6 hidden gap-3 md:flex">
        <div className="h-12 w-48 animate-pulse rounded-full bg-slate-800" />
        <div className="h-12 w-28 animate-pulse rounded-full bg-slate-800" />
        <div className="h-12 w-28 animate-pulse rounded-full bg-slate-800" />
        <div className="h-12 w-24 animate-pulse rounded-full bg-slate-800" />
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Story Section Skeleton */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <VendorStorySkeleton />
          </div>

          {/* Gallery Section Skeleton */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <div className="mb-4 h-7 w-20 animate-pulse rounded bg-slate-800" />
            <VendorGallerySkeleton />
          </div>
        </div>

        {/* Right Column - Sidebar Skeleton */}
        <div className="space-y-6">
          {/* Details Card Skeleton */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <div className="h-6 w-16 animate-pulse rounded bg-slate-800" />
            <div className="mt-4 space-y-4">
              <div>
                <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="h-7 w-20 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-7 w-16 animate-pulse rounded-full bg-slate-800" />
                </div>
              </div>
              <div>
                <div className="h-3 w-20 animate-pulse rounded bg-slate-800" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-800" />
                </div>
              </div>
              <div>
                <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
                <div className="mt-1 h-7 w-8 animate-pulse rounded bg-slate-800" />
              </div>
            </div>
          </div>

          {/* Social Links Skeleton */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-800" />
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-800" />
              <div className="h-10 w-28 animate-pulse rounded-lg bg-slate-800" />
            </div>
          </div>

          {/* Contact Card Skeleton */}
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <div className="h-6 w-20 animate-pulse rounded bg-slate-800" />
            <div className="mt-4 space-y-3">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-800" />
              <div className="h-5 w-36 animate-pulse rounded bg-slate-800" />
              <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Related Vendors Skeleton */}
      <section className="mt-12 border-t border-slate-800 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <VendorCardSkeleton key={i} size="compact" />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

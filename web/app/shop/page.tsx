import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import {
  FeaturedVendor,
  FeaturedVendorSkeleton,
} from "@/components/shop/FeaturedVendor";
import {
  CategoryGrid,
  CategoryGridSkeleton,
} from "@/components/shop/CategoryCard";
import { HeroSearchBar } from "@/components/shop/SearchBar";
import { RegionChips } from "@/components/shop/RegionChips";
import { getCategories } from "@/lib/firebase/categories";
import {
  getFeaturedVendor,
  getNewVendors,
  getPopularVendors,
} from "@/lib/firebase/vendors";

export const metadata: Metadata = {
  title: "Shop Indigenous | Discover Authentic Indigenous Artisans & Businesses",
  description:
    "Discover and support Indigenous artisans, artists, and businesses across Turtle Island. Shop authentic handcrafted jewelry, art, textiles, food, and more from verified Indigenous vendors.",
  openGraph: {
    title: "Shop Indigenous | IOPPS",
    description:
      "Discover and support Indigenous artisans, artists, and businesses across Turtle Island.",
    type: "website",
  },
};

// Revalidate the page every 5 minutes
export const revalidate = 300;

/**
 * Featured Vendor Section (async server component)
 */
async function FeaturedVendorSection() {
  const vendor = await getFeaturedVendor();

  if (!vendor) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Business of the Day
        </h2>
      </div>
      <FeaturedVendor vendor={vendor} />
    </section>
  );
}

/**
 * Categories Section (async server component)
 */
async function CategoriesSection() {
  const categories = await getCategories();

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          Browse by Category
        </h2>
        <Link
          href="/shop/categories"
          className="text-sm text-[#14B8A6] hover:underline"
        >
          View all
        </Link>
      </div>
      <CategoryGrid categories={categories} />
    </section>
  );
}

/**
 * Region Section
 */
function RegionSection() {
  return (
    <section className="mt-14">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          Browse by Region
        </h2>
      </div>
      <RegionChips />
    </section>
  );
}

/**
 * New Vendors Section (async server component)
 */
async function NewVendorsSection() {
  const vendors = await getNewVendors(6);

  if (vendors.length === 0) {
    return null;
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Recently Joined
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Welcome our newest vendors to Shop Indigenous
          </p>
        </div>
        <Link
          href="/shop?sort=newest"
          className="text-sm text-[#14B8A6] hover:underline"
        >
          View all new vendors
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {vendors.slice(0, 4).map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} size="compact" />
        ))}
      </div>
    </section>
  );
}

/**
 * Popular Vendors Section (async server component)
 */
async function PopularVendorsSection() {
  const vendors = await getPopularVendors(6);

  if (vendors.length === 0) {
    return null;
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Community Favorites
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Popular vendors loved by our community
          </p>
        </div>
        <Link
          href="/shop?sort=popular"
          className="text-sm text-[#14B8A6] hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {vendors.slice(0, 4).map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} size="compact" />
        ))}
      </div>
    </section>
  );
}

/**
 * Vendor CTA Section
 */
function VendorCTASection() {
  return (
    <section className="mt-16 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#08090C] to-slate-900/50 p-6 sm:p-8 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
            For Indigenous entrepreneurs
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-50">
            List your Indigenous-owned business on IOPPS
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            Reach community members across Turtle Island with your products,
            services, or cultural experiences. Join our growing marketplace of
            Indigenous makers and entrepreneurs.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/organization/shop/setup"
            className="rounded-full bg-[#14B8A6] px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
          >
            Set up vendor profile
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-slate-700 px-5 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Skeleton loaders for sections
 */
function FeaturedVendorSectionSkeleton() {
  return (
    <section className="mt-12">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-slate-800" />
      <FeaturedVendorSkeleton />
    </section>
  );
}

function VendorGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <VendorCardSkeleton key={i} size="compact" />
      ))}
    </div>
  );
}

function NewVendorsSectionSkeleton() {
  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
      <VendorGridSkeleton count={4} />
    </section>
  );
}

function PopularVendorsSectionSkeleton() {
  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
      <VendorGridSkeleton count={4} />
    </section>
  );
}

/**
 * Main Shop Indigenous Page
 */
export default function ShopPage() {
  return (
    <PageShell>
      {/* Hero Section */}
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
          Shop Indigenous
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Discover authentic Indigenous artisans,
          <br className="hidden sm:block" /> artists, and businesses
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
          Every purchase strengthens Indigenous economies, preserves cultural
          traditions, and builds pathways to economic reconciliation. Discover
          artisan goods, traditional services, cultural experiences, and
          community enterprises created by Indigenous makers and entrepreneurs.
        </p>

        {/* Search Bar */}
        <div className="mt-8">
          <HeroSearchBar />
        </div>
      </section>

      {/* Featured Vendor (Business of the Day) */}
      <Suspense fallback={<FeaturedVendorSectionSkeleton />}>
        <FeaturedVendorSection />
      </Suspense>

      {/* Browse by Category */}
      <Suspense
        fallback={
          <section className="mt-14">
            <div className="mb-6 h-5 w-40 animate-pulse rounded bg-slate-800" />
            <CategoryGridSkeleton />
          </section>
        }
      >
        <CategoriesSection />
      </Suspense>

      {/* Browse by Region */}
      <RegionSection />

      {/* New Vendors */}
      <Suspense fallback={<NewVendorsSectionSkeleton />}>
        <NewVendorsSection />
      </Suspense>

      {/* Popular Vendors */}
      <Suspense fallback={<PopularVendorsSectionSkeleton />}>
        <PopularVendorsSection />
      </Suspense>

      {/* Vendor CTA */}
      <VendorCTASection />
    </PageShell>
  );
}

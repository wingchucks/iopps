"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { VendorCard } from "@/components/shop";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { getFeaturedVendors, getActiveVendors } from "@/lib/firebase/shop";
import type { Vendor } from "@/lib/types";
import { MagnifyingGlassIcon, CheckBadgeIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

// Business categories with icons and colors
const CATEGORIES = [
  { icon: "🎨", label: "Arts & Crafts", value: "art", color: "from-pink-500/20 to-rose-500/20", count: 0 },
  { icon: "💎", label: "Jewelry", value: "jewelry", color: "from-cyan-500/20 to-blue-500/20", count: 0 },
  { icon: "👕", label: "Apparel", value: "clothing", color: "from-purple-500/20 to-violet-500/20", count: 0 },
  { icon: "🍞", label: "Food & Beverage", value: "food", color: "from-amber-500/20 to-orange-500/20", count: 0 },
  { icon: "🏗️", label: "Construction", value: "construction", color: "from-slate-500/20 to-gray-500/20", count: 0 },
  { icon: "💼", label: "Professional Services", value: "professional", color: "from-blue-500/20 to-indigo-500/20", count: 0 },
  { icon: "🌿", label: "Health & Wellness", value: "health", color: "from-emerald-500/20 to-teal-500/20", count: 0 },
  { icon: "📸", label: "Media & Creative", value: "media", color: "from-fuchsia-500/20 to-pink-500/20", count: 0 },
  { icon: "🛠️", label: "Trades & Services", value: "trades", color: "from-orange-500/20 to-red-500/20", count: 0 },
  { icon: "🎁", label: "Retail & Gifts", value: "retail", color: "from-teal-500/20 to-cyan-500/20", count: 0 },
];

export default function BusinessPage() {
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const [totalBusinesses, setTotalBusinesses] = useState(0);

  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!search.trim()) return allVendors;
    const searchLower = search.toLowerCase();
    return allVendors.filter(
      (v) =>
        v.businessName?.toLowerCase().includes(searchLower) ||
        v.tagline?.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower) ||
        v.location?.toLowerCase().includes(searchLower) ||
        v.nation?.toLowerCase().includes(searchLower) ||
        v.category?.toLowerCase().includes(searchLower)
    );
  }, [allVendors, search]);

  const isSearching = search.trim().length > 0;
  const spotlightBusiness = featuredVendors[0];

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const [featured, all] = await Promise.all([
          getFeaturedVendors(6),
          getActiveVendors(),
        ]);
        setFeaturedVendors(featured);
        setAllVendors(all);
        setTotalBusinesses(all.length);
      } catch (err) {
        console.error("Failed to load vendors:", err);
        setError(err instanceof Error ? err : new Error("Failed to load data"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 pt-20">
        <PageShell>
          <ErrorState
            title="Unable to load businesses"
            description="We encountered a problem loading the business directory. Please try again."
            onRetry={() => window.location.reload()}
          />
        </PageShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏪</span>
            <p className="text-sm font-bold uppercase tracking-wider text-white/90">
              Shop Indigenous
            </p>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Support Indigenous Businesses
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-white/80 max-w-2xl mb-6">
            Discover authentic Indigenous-owned businesses across Turtle Island. 
            Every purchase supports Indigenous entrepreneurs and communities.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <span className="text-lg">🏢</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalBusinesses}+</p>
                <p className="text-xs text-white/70">Businesses Listed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <CheckBadgeIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">100%</p>
                <p className="text-xs text-white/70">Indigenous-Owned</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <MapPinIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Canada-wide</p>
                <p className="text-xs text-white/70">Coast to Coast</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, category, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-white py-3.5 pl-12 pr-4 text-slate-900 placeholder-slate-500 shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30"
              />
            </div>
          </div>
        </div>
      </section>

      <PageShell>
        {loading ? (
          // Loading skeleton
          <div className="space-y-8 py-8">
            <div className="h-48 bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : allVendors.length === 0 ? (
          // Empty state
          <div className="py-12">
            <EmptyState
              icon="shop"
              title="No businesses listed yet"
              description="Be the first to showcase your Indigenous-owned business on IOPPS."
              ctaLabel="List Your Business FREE"
              ctaHref="/organization/shop/setup"
            />
          </div>
        ) : isSearching && filteredVendors.length === 0 ? (
          // No search results
          <div className="py-12">
            <EmptyState
              icon="search"
              title="No results found"
              description={`No businesses match "${search}". Try a different search term.`}
              ctaLabel="Clear Search"
              onCta={() => setSearch("")}
            />
          </div>
        ) : (
          // Main content
          <div className="py-8 space-y-12">
            
            {/* Featured Business Spotlight - only show when not searching */}
            {!isSearching && spotlightBusiness && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <StarIcon className="h-5 w-5 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                    Featured Business
                  </h2>
                </div>
                
                <Link 
                  href={`/business/${spotlightBusiness.slug}`}
                  className="block group"
                >
                  <div className="relative rounded-2xl overflow-hidden border border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900">
                    {/* Cover image area */}
                    <div className="h-32 bg-gradient-to-r from-teal-600 to-cyan-600 relative">
                      {spotlightBusiness.coverImageUrl && (
                        <Image
                          src={spotlightBusiness.coverImageUrl}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                    </div>
                    
                    {/* Content */}
                    <div className="relative px-6 pb-6 -mt-10">
                      <div className="flex items-end gap-4">
                        {/* Logo */}
                        <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 border-4 border-slate-900 flex items-center justify-center text-3xl shadow-lg group-hover:scale-105 transition-transform">
                          {spotlightBusiness.logoUrl ? (
                            <Image
                              src={spotlightBusiness.logoUrl}
                              alt={spotlightBusiness.businessName}
                              width={80}
                              height={80}
                              className="rounded-lg object-cover"
                            />
                          ) : (
                            "🏪"
                          )}
                        </div>
                        
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-bold text-white group-hover:text-teal-400 transition-colors">
                              {spotlightBusiness.businessName}
                            </h3>
                            {spotlightBusiness.verified && (
                              <CheckBadgeIcon className="h-6 w-6 text-teal-400" />
                            )}
                          </div>
                          <p className="text-slate-400">
                            {spotlightBusiness.tagline || spotlightBusiness.category}
                          </p>
                        </div>

                        <div className="hidden sm:flex gap-3 pb-1">
                          <span className="px-4 py-2 rounded-full bg-teal-500/20 text-teal-400 text-sm font-semibold">
                            Visit Profile →
                          </span>
                        </div>
                      </div>
                      
                      {/* Details */}
                      <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        {spotlightBusiness.nation && (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <span>🪶</span> {spotlightBusiness.nation}
                          </span>
                        )}
                        {spotlightBusiness.location && (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <MapPinIcon className="h-4 w-4" /> {spotlightBusiness.location}
                          </span>
                        )}
                        {spotlightBusiness.category && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs">
                            {spotlightBusiness.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Categories Grid - only show when not searching */}
            {!isSearching && (
              <section>
                <h2 className="text-lg font-bold text-white mb-4">
                  Browse by Category
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.value}
                      href={`/business/directory?category=${cat.value}`}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-teal-500/50 hover:bg-slate-800/50 hover:-translate-y-1"
                    >
                      <div
                        className={`h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}
                      >
                        {cat.icon}
                      </div>
                      <span className="text-sm text-slate-300 font-medium text-center">
                        {cat.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Business Directory */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {isSearching ? `Results for "${search}"` : "All Businesses"}
                </h2>
                {isSearching ? (
                  <span className="text-sm text-slate-400">
                    {filteredVendors.length} {filteredVendors.length === 1 ? "result" : "results"}
                  </span>
                ) : (
                  <Link
                    href="/business/directory"
                    className="text-sm font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    View All →
                  </Link>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(isSearching ? filteredVendors : allVendors.slice(0, 9)).map((vendor) => (
                  <VendorCard 
                    key={vendor.id} 
                    vendor={vendor} 
                    featured={vendor.featured} 
                  />
                ))}
              </div>

              {!isSearching && allVendors.length > 9 && (
                <div className="mt-8 text-center">
                  <Link
                    href="/business/directory"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-slate-700 bg-slate-800/50 text-white font-semibold hover:bg-slate-800 hover:border-slate-600 transition-all"
                  >
                    View All {allVendors.length} Businesses →
                  </Link>
                </div>
              )}
            </section>

            {/* For Vendors CTA */}
            <section className="rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8 sm:p-12">
                <div className="max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Own an Indigenous Business?
                  </h2>
                  <p className="text-white/80 mb-6">
                    List your business on IOPPS for FREE and connect with customers 
                    across Canada who want to support Indigenous entrepreneurs.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      href="/organization/shop/setup"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-teal-700 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      List Your Business FREE
                    </Link>
                    <Link
                      href="/pricing#vendors"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
                    >
                      View Pricing Options
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </PageShell>
    </div>
  );
}

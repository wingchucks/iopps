"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { VendorCard } from "@/components/shop";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { getFeaturedVendors } from "@/lib/firebase/shop";
import type { Vendor } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type BusinessTab = "shop" | "grants" | "services";

// Tab configuration for dynamic content
const TAB_CONFIG = {
  shop: {
    searchPlaceholder: "Search businesses...",
    ctaLabel: "List Your Business",
    ctaHref: "/organization/shop",
  },
  services: {
    searchPlaceholder: "Search services...",
    ctaLabel: "Add a Service",
    ctaHref: "/organization/services/new",
  },
  grants: {
    searchPlaceholder: "Search grants...",
    ctaLabel: "Submit a Grant",
    ctaHref: "/admin/grants/new", // or appropriate route
  },
} as const;

export default function MarketplacePage() {
  const { user, role } = useAuth();
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<BusinessTab>("shop");
  const [search, setSearch] = useState("");

  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!search.trim()) return featuredVendors;
    const searchLower = search.toLowerCase();
    return featuredVendors.filter(
      (v) =>
        v.businessName?.toLowerCase().includes(searchLower) ||
        v.tagline?.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower) ||
        v.location?.toLowerCase().includes(searchLower) ||
        v.nation?.toLowerCase().includes(searchLower)
    );
  }, [featuredVendors, search]);

  // Determine empty state type for Shop tab
  const hasBusinesses = featuredVendors.length > 0;
  const hasSearchResults = filteredVendors.length > 0;
  const isSearching = search.trim().length > 0;

  // Only show business listing CTAs to employers/admins (not community members)
  const canListBusiness = role === "employer" || role === "admin";
  const isAuthenticated = !!user;

  // Get current tab config
  const currentTabConfig = TAB_CONFIG[activeTab];

  // Clear search when switching tabs
  const handleTabChange = (tab: BusinessTab) => {
    setSearch("");
    setActiveTab(tab);
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const featured = await getFeaturedVendors(6);
        setFeaturedVendors(featured);
      } catch (err) {
        console.error("Failed to load featured vendors:", err);
        setError(err instanceof Error ? err : new Error("Failed to load data"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Render Shop Tab Content
  const renderShopTab = () => {
    // Show error state if there was an error loading
    if (error) {
      return (
        <ErrorState
          title="Unable to load businesses"
          description="We encountered a problem loading the business directory. Please try again."
          onRetry={() => window.location.reload()}
          testId="shop-error-state"
        />
      );
    }

    // Show loading skeletons
    if (loading) {
      return (
        <>
          {/* Business of the Day skeleton */}
          <section className="mb-8">
            <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900 p-6">
              <div className="animate-pulse h-20 bg-slate-800/50 rounded-lg" />
            </div>
          </section>

          {/* Categories skeleton */}
          <section className="mb-8">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl bg-slate-800/50 h-20"
                />
              ))}
            </div>
          </section>

          {/* Featured businesses skeleton */}
          <section className="mb-12">
            <div className="h-6 w-48 bg-slate-800 rounded animate-pulse mb-6" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-slate-800/50 h-64"
                />
              ))}
            </div>
          </section>
        </>
      );
    }

    // No businesses exist at all (new platform)
    if (!hasBusinesses) {
      return (
        <EmptyState
          icon="shop"
          title="No businesses listed yet"
          description="Be the first to showcase your business on IOPPS."
          ctaLabel="List Your Business"
          ctaHref="/organization/shop"
          testId="shop-empty-no-businesses"
        />
      );
    }

    // Businesses exist but search yields no results
    if (isSearching && !hasSearchResults) {
      return (
        <EmptyState
          icon="search"
          title="No results found"
          description="Try adjusting your search or filters."
          ctaLabel="Clear filters"
          onCta={() => setSearch("")}
          testId="shop-empty-no-results"
        />
      );
    }

    // Normal state with data
    return (
      <>
        {/* Business of the Day Showcase */}
        <section className="mb-8">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900 border border-teal-500/20 p-6">
            {/* Badge */}
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-3">
              <span>⭐</span>
              Business of the Day
            </div>

            {featuredVendors[0] && (
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-2xl shrink-0">
                  🎨
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white">
                    {featuredVendors[0].businessName}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-1">
                    {featuredVendors[0].tagline ||
                      featuredVendors[0].description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {featuredVendors[0].nation && (
                      <span className="text-xs text-teal-400">
                        🪶 {featuredVendors[0].nation}
                      </span>
                    )}
                    <span className="text-xs text-amber-400">⭐ 4.9</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Browse Categories - always show when we have businesses */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 mb-4">
            Browse Categories
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                icon: "💎",
                label: "Jewelry",
                color: "from-cyan-500/20 to-blue-500/20",
              },
              {
                icon: "🎨",
                label: "Art",
                color: "from-pink-500/20 to-rose-500/20",
              },
              {
                icon: "👕",
                label: "Apparel",
                color: "from-emerald-500/20 to-teal-500/20",
              },
              {
                icon: "🍞",
                label: "Food",
                color: "from-amber-500/20 to-orange-500/20",
              },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={`/business/products?category=${cat.label}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:-translate-y-0.5"
              >
                <div
                  className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl`}
                >
                  {cat.icon}
                </div>
                <span className="text-xs text-slate-300 font-medium">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Vendors your connections support - only show when authenticated and not searching */}
        {isAuthenticated && !isSearching && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 mb-4">
              Vendors your connections support
            </h2>

            <div className="space-y-3">
              {featuredVendors.slice(0, 3).map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/business/${vendor.slug}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-xl shrink-0">
                      🧵
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white">
                        {vendor.businessName}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-1">
                        {vendor.tagline}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {vendor.nation && (
                          <span className="text-xs text-teal-400">
                            🪶 {vendor.nation}
                          </span>
                        )}
                        <span className="text-xs text-amber-400">⭐ 4.8</span>
                      </div>
                    </div>
                  </div>

                  {/* Connection Signal */}
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-800/50 p-2">
                    <div className="flex -space-x-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`inline-block h-5 w-5 rounded-full ring-2 ring-slate-900 ${
                            ["bg-orange-400", "bg-blue-400", "bg-purple-400"][
                              i % 3
                            ]
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-teal-400 font-medium">
                      6 connections purchased from here
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Businesses / Search Results Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {isSearching ? "Search Results" : "Featured Businesses"}
            </h2>
            {!isSearching && (
              <Link
                href="/business/directory"
                className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
              >
                View All →
              </Link>
            )}
            {isSearching && (
              <span className="text-sm text-slate-400">
                {filteredVendors.length}{" "}
                {filteredVendors.length === 1 ? "result" : "results"}
              </span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(isSearching ? filteredVendors : featuredVendors.slice(0, 3)).map(
              (vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} featured />
              )
            )}
          </div>
        </section>
      </>
    );
  };

  // Render Services Tab Content
  const renderServicesTab = () => {
    // Services feature is not live yet
    return (
      <EmptyState
        icon="services"
        title="Services directory coming soon"
        description="Indigenous-owned services will be discoverable here."
        ctaLabel="Add a Service"
        ctaHref="/organization/services/new"
        testId="services-empty-coming-soon"
      />
    );
  };

  // Render Grants Tab Content
  const renderGrantsTab = () => {
    // Grants feature - showing placeholder for now
    return (
      <EmptyState
        icon="grants"
        title="Funding opportunities will appear here"
        description="We're building a directory of grants supporting Indigenous businesses."
        ctaLabel="Submit a Grant"
        ctaHref="/contact"
        testId="grants-empty-coming-soon"
      />
    );
  };

  return (
    <div className="min-h-screen text-slate-100">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-500 to-blue-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
          {/* Eyebrow */}
          <p className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-2">
            Shop Indigenous
          </p>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Support Indigenous Businesses
          </h1>

          {/* Subtitle */}
          <p className="text-white/80 max-w-2xl mb-6">
            Discover authentic Indigenous-owned businesses, artisans, and
            service providers across Turtle Island.
          </p>

          {/* Tab Pills */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleTabChange("shop")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === "shop"
                  ? "bg-white text-teal-700 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              Shop
            </button>
            <button
              onClick={() => handleTabChange("services")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === "services"
                  ? "bg-white text-teal-700 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => handleTabChange("grants")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === "grants"
                  ? "bg-white text-teal-700 shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              Grants
            </button>
          </div>

          {/* Search Bar - only show for Shop tab (since others don't have searchable content yet) */}
          {activeTab === "shop" && (
            <div className="flex gap-3 max-w-xl">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  placeholder={currentTabConfig.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <PageShell>
        {/* Tab Content */}
        {activeTab === "shop" && renderShopTab()}
        {activeTab === "services" && renderServicesTab()}
        {activeTab === "grants" && renderGrantsTab()}
      </PageShell>

      {/* CTA Section - Context-aware by active tab (only for employers/admins) */}
      {canListBusiness && (
        <section className="relative overflow-hidden">
          <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
            <div className="bg-gradient-to-b from-white/5 to-transparent">
              <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
                <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                  Own an Indigenous Business?
                </h2>
                <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                  Join our growing community of Indigenous entrepreneurs. List
                  your business and connect with customers across North America.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={currentTabConfig.ctaHref}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    {currentTabConfig.ctaLabel}
                  </Link>
                  {activeTab === "shop" && (
                    <Link
                      href="/organization/services/new"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      Add a Service
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

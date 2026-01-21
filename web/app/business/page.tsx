"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { VendorCard } from "@/components/shop";
import { getFeaturedVendors } from "@/lib/firebase/shop";
import type { Vendor } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type BusinessTab = 'shop' | 'grants' | 'services';

export default function MarketplacePage() {
  const { user, role } = useAuth();
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BusinessTab>('shop');
  const [search, setSearch] = useState("");

  // Filter vendors based on search
  const filteredVendors = useMemo(() => {
    if (!search.trim()) return featuredVendors;
    const searchLower = search.toLowerCase();
    return featuredVendors.filter(v =>
      v.businessName?.toLowerCase().includes(searchLower) ||
      v.tagline?.toLowerCase().includes(searchLower) ||
      v.description?.toLowerCase().includes(searchLower) ||
      v.location?.toLowerCase().includes(searchLower) ||
      v.nation?.toLowerCase().includes(searchLower)
    );
  }, [featuredVendors, search]);

  // Only show business listing CTAs to employers/admins (not community members)
  const canListBusiness = role === "employer" || role === "admin";
  const isAuthenticated = !!user;

  useEffect(() => {
    (async () => {
      try {
        const featured = await getFeaturedVendors(6);
        setFeaturedVendors(featured);
      } catch (error) {
        console.error("Failed to load featured vendors:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
            Discover authentic Indigenous-owned businesses, artisans, and service providers across Turtle Island.
          </p>

          {/* Tab Pills */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'shop'
                  ? 'bg-white text-teal-700 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              Shop
            </button>
            <button
              onClick={() => setActiveTab('grants')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'grants'
                  ? 'bg-white text-teal-700 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              Grants
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'services'
                  ? 'bg-white text-teal-700 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              Services
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search businesses, products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </section>

      <PageShell>
        {/* Tab Content */}
        {activeTab === 'shop' ? (
          <>
            {/* Business of the Day Showcase */}
            {(featuredVendors.length > 0 || loading) && (
          <section className="mb-8">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500/10 via-slate-900 to-slate-900 border border-teal-500/20 p-6">
              {/* Badge */}
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-3">
                <span>⭐</span>
                Business of the Day
              </div>

              {loading ? (
                <div className="animate-pulse h-20 bg-slate-800/50 rounded-lg" />
              ) : featuredVendors[0] && (
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-2xl shrink-0">
                    🎨
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white">{featuredVendors[0].businessName}</h3>
                    <p className="text-sm text-slate-400 line-clamp-1">{featuredVendors[0].tagline || featuredVendors[0].description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {featuredVendors[0].nation && (
                        <span className="text-xs text-teal-400">🪶 {featuredVendors[0].nation}</span>
                      )}
                      <span className="text-xs text-amber-400">⭐ 4.9</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Browse Categories */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 mb-4">Browse Categories</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "💎", label: "Jewelry", color: "from-cyan-500/20 to-blue-500/20" },
              { icon: "🎨", label: "Art", color: "from-pink-500/20 to-rose-500/20" },
              { icon: "👕", label: "Apparel", color: "from-emerald-500/20 to-teal-500/20" },
              { icon: "🍞", label: "Food", color: "from-amber-500/20 to-orange-500/20" },
            ].map((cat) => (
              <Link
                key={cat.label}
                href={`/business/products?category=${cat.label}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:-translate-y-0.5"
              >
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl`}>
                  {cat.icon}
                </div>
                <span className="text-xs text-slate-300 font-medium">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Vendors your connections support - only show when authenticated */}
        {isAuthenticated && featuredVendors.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 mb-4">Vendors your connections support</h2>

            {loading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-24" />
                ))}
              </div>
            ) : (
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
                        <h3 className="font-bold text-white">{vendor.businessName}</h3>
                        <p className="text-sm text-slate-400 line-clamp-1">{vendor.tagline}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {vendor.nation && (
                            <span className="text-xs text-teal-400">🪶 {vendor.nation}</span>
                          )}
                          <span className="text-xs text-amber-400">⭐ 4.8</span>
                        </div>
                      </div>
                    </div>

                    {/* Connection Signal */}
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-800/50 p-2">
                      <div className="flex -space-x-1.5">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className={`inline-block h-5 w-5 rounded-full ring-2 ring-slate-900 ${['bg-orange-400', 'bg-blue-400', 'bg-purple-400'][i % 3]
                            }`} />
                        ))}
                      </div>
                      <span className="text-xs text-teal-400 font-medium">6 connections purchased from here</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Featured Businesses Section */}
        {(featuredVendors.length > 0 || loading) && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {search ? "Search Results" : "Featured Businesses"}
              </h2>
              {!search && (
                <Link
                  href="/business/directory"
                  className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
                >
                  View All →
                </Link>
              )}
              {search && (
                <span className="text-sm text-slate-400">
                  {filteredVendors.length} {filteredVendors.length === 1 ? "result" : "results"}
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
                ))}
              </div>
            ) : filteredVendors.length === 0 && search ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-slate-400 mb-2">No businesses found for "{search}"</p>
                <button
                  onClick={() => setSearch("")}
                  className="text-sm text-[#14B8A6] hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(search ? filteredVendors : featuredVendors.slice(0, 3)).map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} featured />
                ))}
              </div>
            )}
          </section>
        )}
          </>
        ) : activeTab === 'grants' ? (
          // Grants Tab Content
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Grants & Funding</h2>
              <p className="text-slate-400">Discover funding opportunities for Indigenous businesses</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-slate-400 mb-4">Grants and funding opportunities coming soon!</p>
              <p className="text-sm text-slate-500">We're working on connecting Indigenous businesses with funding resources.</p>
            </div>
          </section>
        ) : (
          // Services Tab Content
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Professional Services</h2>
              <p className="text-slate-400">Find Indigenous-owned service providers</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <div className="text-4xl mb-4">🛠️</div>
              <p className="text-slate-400 mb-4">Services directory coming soon!</p>
              <p className="text-sm text-slate-500">Browse professional services from Indigenous business owners.</p>
            </div>
          </section>
        )}

      </PageShell>

      {/* CTA Section - Ocean Wave Style (only for employers/admins) */}
      {canListBusiness && (
        <section className="relative overflow-hidden">
          <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
            <div className="bg-gradient-to-b from-white/5 to-transparent">
              <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
                <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                  Own an Indigenous Business?
                </h2>
                <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                  Join our growing community of Indigenous entrepreneurs. List your business and connect with customers across North America.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/organization/shop"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    List Your Business
                  </Link>
                  <Link
                    href="/organization/services/new"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Add a Service
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

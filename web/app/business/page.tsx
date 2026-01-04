"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { VendorCard } from "@/components/shop";
import { getFeaturedVendors } from "@/lib/firebase/shop";
import type { Vendor } from "@/lib/types";
import OceanWaveHero from "@/components/OceanWaveHero";
import { useAuth } from "@/components/AuthProvider";

export default function MarketplacePage() {
  const { role } = useAuth();
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Only show business listing CTAs to employers/admins (not community members)
  const canListBusiness = role === "employer" || role === "admin";

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
      {/* Header with Tabs */}
      <div className="bg-slate-950 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* Tab Pills */}
          <div className="flex gap-2 mb-4">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">
              Shop
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">
              Grants
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">
              Services
            </button>
          </div>
        </div>
      </div>

      <PageShell>
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

        {/* Vendors your connections support */}
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

        {/* Featured Businesses Section */}
        {(featuredVendors.length > 0 || loading) && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Featured Businesses</h2>
              <Link
                href="/business/directory"
                className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
              >
                View All →
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredVendors.slice(0, 3).map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} featured />
                ))}
              </div>
            )}
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

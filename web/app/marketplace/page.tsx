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
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Indigenous Marketplace"
        title={
          <>
            Discover & Support
            <br />
            Indigenous Businesses
          </>
        }
        subtitle="Buy authentic Indigenous products, hire Indigenous services, and connect with Indigenous-owned businesses across Canada."
        size="md"
      >
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/marketplace/products"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Shop Products
          </Link>
          <Link
            href="/marketplace/services"
            className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Find Services
          </Link>
        </div>
      </OceanWaveHero>

      <PageShell>

      {/* Two Cards Section - Products & Services */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Browse Products Card */}
        <Link
          href="/marketplace/products"
          className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
            <span className="text-2xl">🛍️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Shop Products</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Shop authentic Indigenous-made goods — art, clothing, jewelry, food, and more.
          </p>
          <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
            Browse Products →
          </span>
        </Link>

        {/* Hire Services Card */}
        <Link
          href="/marketplace/services"
          className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <span className="text-2xl">💼</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Hire Services</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Find Indigenous professionals — legal, accounting, construction, tech, and more.
          </p>
          <span className="text-sm font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Find Professionals →
          </span>
        </Link>
      </div>

      {/* Secondary Link to Directory */}
      <div className="text-center mb-12">
        <Link
          href="/marketplace/directory"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
        >
          <span>Looking for all businesses?</span>
          <span className="font-semibold">View Full Directory →</span>
        </Link>
      </div>

      {/* Featured Businesses Section */}
      {(featuredVendors.length > 0 || loading) && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Featured Businesses</h2>
            <Link
              href="/marketplace/directory"
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

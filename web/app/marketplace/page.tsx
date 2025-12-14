"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { VendorCard } from "@/components/shop";
import { getFeaturedVendors } from "@/lib/firebase/shop";
import type { Vendor } from "@/lib/types";

export default function MarketplacePage() {
  const [featuredVendors, setFeaturedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Sample featured products for display
  const featuredProducts = [
    {
      id: "1",
      title: "Métis Floral Beaded Earrings",
      price: "$65",
      vendor: "Sarah's Beadwork",
      category: "Jewelry",
      image: "💎",
    },
    {
      id: "2",
      title: "Hand-Carved Cedar Box",
      price: "$180",
      vendor: "West Coast Carvings",
      category: "Home Goods",
      image: "📦",
    },
    {
      id: "3",
      title: "Traditional Ribbon Skirt",
      price: "$220",
      vendor: "Morning Star Designs",
      category: "Clothing",
      image: "👗",
    },
    {
      id: "4",
      title: "Wild Rice - 2lb Bag",
      price: "$28",
      vendor: "Northern Harvest Co.",
      category: "Food",
      image: "🌾",
    },
  ];

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <span className="text-white">Indigenous Marketplace</span>
      </nav>

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
          Indigenous Marketplace
        </p>
        <h1 className="mt-4 text-4xl font-bold italic tracking-tight text-white sm:text-5xl lg:text-6xl">
          Discover & Support
          <br />
          Indigenous Businesses
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Buy authentic Indigenous products, hire Indigenous services, and connect
          with Indigenous-owned businesses across Canada.
        </p>
      </div>

      {/* Three Cards Section */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        {/* Browse Products Card */}
        <Link
          href="/marketplace/products"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
            <span className="text-2xl">🛍️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Browse Products</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Shop authentic Indigenous-made goods — art, clothing, jewelry, food, and more.
          </p>
          <span className="text-sm font-semibold text-[#14B8A6] group-hover:translate-x-1 inline-block transition-transform">
            Shop Now →
          </span>
        </Link>

        {/* Browse Services Card */}
        <Link
          href="/marketplace/services"
          className="group rounded-2xl border border-sky-500/30 bg-slate-900/50 p-8 text-left transition-all hover:border-sky-500/50 hover:-translate-y-1"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/40">
            <span className="text-2xl">💼</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Browse Services</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Find Indigenous professionals — legal, accounting, construction, tech, and more.
          </p>
          <span className="text-sm font-semibold text-sky-400 group-hover:translate-x-1 inline-block transition-transform">
            Find Services →
          </span>
        </Link>

        {/* Business Directory Card */}
        <Link
          href="/marketplace/directory"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:border-amber-500/50 hover:-translate-y-1"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40">
            <span className="text-2xl">🏢</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Business Directory</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Explore all Indigenous-owned businesses. Find partners and suppliers.
          </p>
          <span className="text-sm font-semibold text-amber-400 group-hover:translate-x-1 inline-block transition-transform">
            Explore →
          </span>
        </Link>
      </div>

      {/* Featured Products Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Products</h2>
          <Link
            href="/marketplace/products"
            className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
          >
            View All →
          </Link>
        </div>
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/marketplace/products/${product.id}`}
              className="group rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-all hover:border-slate-700"
            >
              <div className="h-40 bg-gradient-to-br from-[#14B8A6]/15 to-sky-500/10 flex items-center justify-center">
                <span className="text-5xl">{product.image}</span>
              </div>
              <div className="p-4">
                <div className="text-xs font-semibold text-[#14B8A6] uppercase mb-1.5">
                  {product.category}
                </div>
                <h3 className="font-semibold text-white mb-2 leading-tight line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
                  {product.title}
                </h3>
                <div className="text-xs text-slate-400 mb-3">by {product.vendor}</div>
                <div className="text-lg font-bold text-[#14B8A6]">{product.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

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

      {/* Empty State for Businesses */}
      {!loading && featuredVendors.length === 0 && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Featured Businesses</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Sample business cards */}
            {[
              {
                name: "Sarah's Beadwork",
                industry: "Arts & Crafts",
                location: "Winnipeg, MB",
                nation: "Métis",
                icon: "🎨",
                description: "Traditional Métis floral beadwork and contemporary designs",
                hasProducts: true,
                productCount: 24,
              },
              {
                name: "Turtle Island Legal",
                industry: "Legal",
                location: "Toronto, ON",
                nation: "Anishinaabe",
                icon: "⚖️",
                description: "Indigenous law firm specializing in band governance and treaty rights",
                hasJobs: true,
                jobCount: 2,
              },
              {
                name: "Eagle Builders Inc.",
                industry: "Construction",
                location: "Thunder Bay, ON",
                nation: "Ojibwe",
                icon: "🏗️",
                description: "Commercial and residential construction, Indigenous workforce development",
                hasJobs: true,
                hasTraining: true,
                jobCount: 5,
              },
            ].map((biz, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40 mb-4">
                  <span className="text-xl">{biz.icon}</span>
                </div>
                <div className="text-xs font-semibold text-[#14B8A6] uppercase mb-1.5">
                  {biz.industry}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{biz.name}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-3 line-clamp-2">
                  {biz.description}
                </p>
                <div className="text-xs text-slate-500 mb-4">
                  📍 {biz.location} • 🪶 {biz.nation}
                </div>
                <div className="flex flex-wrap gap-2">
                  {biz.hasProducts && (
                    <span className="rounded-md bg-[#14B8A6]/15 border border-[#14B8A6]/30 px-2.5 py-1 text-xs font-semibold text-[#14B8A6]">
                      🛒 {biz.productCount} Products
                    </span>
                  )}
                  {biz.hasJobs && (
                    <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-400">
                      💼 {biz.jobCount} Jobs
                    </span>
                  )}
                  {biz.hasTraining && (
                    <span className="rounded-md bg-sky-500/15 border border-sky-500/30 px-2.5 py-1 text-xs font-semibold text-sky-400">
                      📚 Training
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Own an Indigenous Business?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Join our growing community of Indigenous entrepreneurs. List your business and connect with customers across North America.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/organization/shop"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-all hover:bg-[#0d9488]"
          >
            List Your Business
          </Link>
          <Link
            href="/organization/services/new"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 px-6 py-3 font-semibold text-white transition-all hover:border-slate-500 hover:bg-slate-800"
          >
            Add a Service
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

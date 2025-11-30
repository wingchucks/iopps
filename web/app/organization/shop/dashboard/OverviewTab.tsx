"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getVendorProfile,
  listVendorShopListings,
} from "@/lib/firestore";
import type { VendorProfile, ProductServiceListing } from "@/lib/types";

export default function OverviewTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [products, setProducts] = useState<ProductServiceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profileData, productsData] = await Promise.all([
          getVendorProfile(user.uid),
          listVendorShopListings(user.uid),
        ]);
        setProfile(profileData);
        setProducts(productsData);
      } catch (err) {
        console.error("Error loading vendor data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products]
  );

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.businessName,
      profile.category,
      profile.location,
      profile.about,
      profile.offerings,
      profile.contactEmail,
      profile.websiteUrl,
      profile.logoUrl,
    ];
    const filled = fields.filter((f) => f && f.toString().trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  if (loading) {
    return (
      <div className="text-center text-slate-400">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">
          Welcome back{profile?.businessName ? `, ${profile.businessName}` : ""}!
        </h2>
        <p className="mt-2 text-slate-400">
          Here's an overview of your shop and products.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6 shadow-xl shadow-emerald-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Active Products
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {activeProducts.length}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {products.length - activeProducts.length} inactive
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-6 shadow-xl shadow-blue-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Profile Complete
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {profileCompleteness}%
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {profileCompleteness === 100 ? "All set!" : "Keep building"}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-indigo-500/10 p-6 shadow-xl shadow-purple-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Category
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {profile?.category || "Not set"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {profile?.isIndigenousOwned ? "Indigenous-owned" : "Business"}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <h3 className="mb-6 text-xl font-semibold text-white">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => {
              const event = new CustomEvent("switchTab", {
                detail: { tab: "products" },
              });
              window.dispatchEvent(event);
            }}
            className="group rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
          >
            <div className="mb-2 text-2xl">➕</div>
            <h4 className="font-semibold text-white group-hover:text-emerald-400">
              Add Product/Service
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              List new products or services in your shop
            </p>
          </button>

          <button
            onClick={() => {
              const event = new CustomEvent("switchTab", {
                detail: { tab: "profile" },
              });
              window.dispatchEvent(event);
            }}
            className="group rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 text-left transition-all hover:border-blue-500/50 hover:bg-blue-500/20"
          >
            <div className="mb-2 text-2xl">✏️</div>
            <h4 className="font-semibold text-white group-hover:text-blue-400">
              Update Profile
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Keep your shop information current
            </p>
          </button>

          <Link
            href="/shop"
            className="group rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
          >
            <div className="mb-2 text-2xl">🏪</div>
            <h4 className="font-semibold text-white group-hover:text-purple-400">
              View Public Shop
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              See how your shop appears to visitors
            </p>
          </Link>
        </div>
      </div>

      {/* Recent Products */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Recent Products
          </h3>
          <button
            onClick={() => {
              const event = new CustomEvent("switchTab", {
                detail: { tab: "products" },
              });
              window.dispatchEvent(event);
            }}
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            View all →
          </button>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">No products yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Start by adding your first product or service
            </p>
            <button
              onClick={() => {
                const event = new CustomEvent("switchTab", {
                  detail: { tab: "products" },
                });
                window.dispatchEvent(event);
              }}
              className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-3 h-32 w-full rounded-lg object-cover"
                  />
                )}
                <h4 className="font-semibold text-white">{product.name}</h4>
                <p className="mt-1 text-xs text-emerald-400">
                  {product.category}
                </p>
                {product.price && (
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    {product.price}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-400">
                  {product.description.slice(0, 80)}
                  {product.description.length > 80 ? "..." : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Completion Nudge */}
      {profileCompleteness < 100 && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 shadow-xl shadow-amber-900/20">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-300">
                Complete Your Vendor Profile
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Your vendor profile is {profileCompleteness}% complete. Add more details
                about your business to help customers find and connect with you.
              </p>
              <button
                onClick={() => {
                  const event = new CustomEvent("switchTab", {
                    detail: { tab: "profile" },
                  });
                  window.dispatchEvent(event);
                }}
                className="mt-4 inline-flex rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-500/30"
              >
                Complete profile →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

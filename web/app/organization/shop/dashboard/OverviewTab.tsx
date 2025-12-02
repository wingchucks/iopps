"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getVendorProfile,
  listVendorShopListings,
  updateVendorShopStatus,
} from "@/lib/firestore";
import type { VendorProfile, ProductServiceListing } from "@/lib/types";

export default function OverviewTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [products, setProducts] = useState<ProductServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
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
  };

  useEffect(() => {
    loadData();
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

  // Check if shop is published (active status)
  const isPublished = profile?.status === "active";
  const canPublish = profile?.businessName && profile?.slug && profile?.approvalStatus !== "rejected" && profile?.approvalStatus !== "pending_review";

  // Check if profile setup is incomplete (no business name = needs setup)
  const needsSetup = !profile?.businessName;

  const handleTogglePublish = async () => {
    if (!user || !profile) return;

    setStatusUpdating(true);
    setStatusError(null);

    try {
      const result = await updateVendorShopStatus(user.uid, user.uid, !isPublished);

      if (!result.success) {
        setStatusError(result.error || "Failed to update shop status");
        return;
      }

      // Reload data to get updated status
      await loadData();
    } catch (err) {
      console.error("Error updating shop status:", err);
      setStatusError("An error occurred. Please try again.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-slate-400">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Setup Required Banner */}
      {needsSetup && (
        <div className="rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/10 p-8 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-amber-500/20 p-3">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-200">Complete Your Shop Setup</h2>
                <p className="mt-1 text-slate-300">
                  Your subscription is active! Set up your vendor profile to get your shop URL and start attracting customers.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent("switchTab", {
                  detail: { tab: "profile" },
                });
                window.dispatchEvent(event);
              }}
              className="shrink-0 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-all hover:bg-amber-400"
            >
              Set Up Profile
            </button>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Welcome back{profile?.businessName ? `, ${profile.businessName}` : ""}!
            </h2>
            <p className="mt-2 text-slate-400">
              Here&apos;s an overview of your shop and products.
            </p>
          </div>

          {/* Shop Status Badge & Toggle */}
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Shop Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  isPublished
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-700/50 text-slate-400"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isPublished ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
                {isPublished ? "Published" : "Draft"}
              </span>
            </div>

            <button
              onClick={handleTogglePublish}
              disabled={statusUpdating || !canPublish}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isPublished
                  ? "border border-slate-600 text-slate-300 hover:border-red-500/50 hover:text-red-300"
                  : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
              }`}
            >
              {statusUpdating
                ? "Updating..."
                : isPublished
                ? "Unpublish Shop"
                : "Publish Shop"}
            </button>

            {!canPublish && !isPublished && (
              <p className="text-xs text-amber-400">
                {profile?.approvalStatus === "pending_review"
                  ? "Pending review"
                  : profile?.approvalStatus === "rejected"
                  ? "Profile not approved"
                  : "Complete your profile first"}
              </p>
            )}

            {statusError && (
              <p className="text-xs text-red-400">{statusError}</p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            Profile Views
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {profile?.profileViews || 0}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Total page views
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-6 shadow-xl shadow-amber-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Website Clicks
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {profile?.websiteClicks || 0}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Clicks to your website
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
            <div className="mb-2 text-2xl">+</div>
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
            <div className="mb-2 text-2xl">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h4 className="font-semibold text-white group-hover:text-blue-400">
              Update Profile
            </h4>
            <p className="mt-1 text-sm text-slate-400">
              Keep your shop information current
            </p>
          </button>

          {/* View Shop Link - use slug if available, otherwise use user ID as fallback */}
          {(profile?.slug || user?.uid) && profile?.businessName ? (
            <Link
              href={`/shop/${profile.slug || user?.uid}`}
              target="_blank"
              className="group rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
            >
              <div className="mb-2 text-2xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <h4 className="font-semibold text-white group-hover:text-purple-400">
                View Your Shop
              </h4>
              <p className="mt-1 text-sm text-slate-400">
                {isPublished
                  ? "See how your shop appears to visitors"
                  : "Preview your shop (not visible to public)"}
              </p>
            </Link>
          ) : (
            <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-6">
              <div className="mb-2 text-2xl opacity-50">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-500">
                View Your Shop
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Complete your profile to get your shop URL
              </p>
            </div>
          )}
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
            View all
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
            <div className="rounded-full bg-amber-500/20 p-2">
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
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
                Complete profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

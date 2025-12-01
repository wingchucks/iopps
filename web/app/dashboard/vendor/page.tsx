"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getVendorByOwnerId, type Vendor } from "@/lib/firebase/vendors";
import { getVendorFollowerCount } from "@/lib/firebase/follows";

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        const vendorData = await getVendorByOwnerId(user.uid);
        setVendor(vendorData);

        if (vendorData) {
          const followers = await getVendorFollowerCount(vendorData.id);
          setFollowerCount(followers);
        }
      } catch (error) {
        console.error("Error loading vendor data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (isLoading || !vendor) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Profile Views",
      value: vendor.profileViews || 0,
      change: "+12%",
      changeType: "positive",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: "Website Clicks",
      value: vendor.websiteClicks || 0,
      change: "+8%",
      changeType: "positive",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
    },
    {
      label: "Favorites",
      value: vendor.favorites || 0,
      change: "+5%",
      changeType: "positive",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      label: "Followers",
      value: followerCount,
      change: "+3%",
      changeType: "positive",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      title: "Edit Profile",
      description: "Update your business info and story",
      href: "/dashboard/vendor/profile",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      title: "Manage Gallery",
      description: "Add or edit product photos",
      href: "/dashboard/vendor/gallery",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: "View Analytics",
      description: "See how your store is performing",
      href: "/dashboard/vendor/analytics",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: "View Storefront",
      description: "See how visitors see your store",
      href: `/shop/${vendor.slug}`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const completenessItems = [
    { label: "Profile photo", completed: !!vendor.profileImage },
    { label: "Cover image", completed: !!vendor.coverImage },
    { label: "Business description", completed: vendor.description?.length > 100 },
    { label: "Gallery images", completed: vendor.gallery?.length >= 3 },
    { label: "Contact info", completed: !!(vendor.email && vendor.phone) },
    { label: "Social links", completed: Object.values(vendor.socialLinks || {}).some(Boolean) },
  ];

  const completedItems = completenessItems.filter((item) => item.completed).length;
  const completenessPercentage = Math.round(
    (completedItems / completenessItems.length) * 100
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-slate-400">
          Welcome back! Here&apos;s how your storefront is performing.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-800 bg-[#08090C] p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{stat.icon}</span>
              <span
                className={`text-xs font-medium ${
                  stat.changeType === "positive"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-100">
              {stat.value.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Completeness */}
        <div className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Profile Completeness
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Complete your profile to improve visibility
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{completenessPercentage}% Complete</span>
              <span className="text-slate-400">
                {completedItems}/{completenessItems.length} items
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-[#14B8A6] transition-all"
                style={{ width: `${completenessPercentage}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <ul className="mt-4 space-y-2">
            {completenessItems.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 text-sm"
              >
                {item.completed ? (
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  </svg>
                )}
                <span className={item.completed ? "text-slate-400" : "text-slate-300"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Common tasks for managing your storefront
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition hover:border-[#14B8A6]/50 hover:bg-slate-800/50"
              >
                <span className="text-slate-400 group-hover:text-[#14B8A6]">
                  {action.icon}
                </span>
                <div>
                  <p className="font-medium text-slate-200 group-hover:text-[#14B8A6]">
                    {action.title}
                  </p>
                  <p className="text-xs text-slate-400">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {vendor.status !== "active" && (
        <div
          className={`rounded-xl border p-4 ${
            vendor.status === "draft"
              ? "border-yellow-500/30 bg-yellow-500/10"
              : vendor.status === "paused"
              ? "border-orange-500/30 bg-orange-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            <svg
              className={`h-5 w-5 mt-0.5 ${
                vendor.status === "draft"
                  ? "text-yellow-400"
                  : vendor.status === "paused"
                  ? "text-orange-400"
                  : "text-red-400"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3
                className={`font-semibold ${
                  vendor.status === "draft"
                    ? "text-yellow-200"
                    : vendor.status === "paused"
                    ? "text-orange-200"
                    : "text-red-200"
                }`}
              >
                {vendor.status === "draft"
                  ? "Your storefront is in draft mode"
                  : vendor.status === "paused"
                  ? "Your storefront is paused"
                  : "Your storefront is suspended"}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  vendor.status === "draft"
                    ? "text-yellow-300/70"
                    : vendor.status === "paused"
                    ? "text-orange-300/70"
                    : "text-red-300/70"
                }`}
              >
                {vendor.status === "draft"
                  ? "Complete your profile and submit for review to go live."
                  : vendor.status === "paused"
                  ? "Your storefront is temporarily hidden from visitors."
                  : "Please contact support for more information."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Status */}
      {vendor.verificationStatus === "pending" && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 mt-0.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-200">
                Verification pending
              </h3>
              <p className="mt-1 text-sm text-blue-300/70">
                Your verification documents are being reviewed. This typically takes
                2-3 business days.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

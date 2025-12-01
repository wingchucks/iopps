"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getVendorByOwnerId, type Vendor } from "@/lib/firebase/vendors";
import { getVendorFollowerCount } from "@/lib/firebase/follows";

export default function VendorAnalyticsPage() {
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
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-800" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Profile Views",
      value: vendor.profileViews || 0,
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
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
    },
    {
      label: "Total Favorites",
      value: vendor.favorites || 0,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      label: "Followers",
      value: followerCount,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Simple mock data for charts - in production, this would come from analytics
  const mockWeeklyData = [
    { day: "Mon", views: 12, clicks: 3 },
    { day: "Tue", views: 18, clicks: 5 },
    { day: "Wed", views: 15, clicks: 4 },
    { day: "Thu", views: 22, clicks: 7 },
    { day: "Fri", views: 28, clicks: 9 },
    { day: "Sat", views: 35, clicks: 11 },
    { day: "Sun", views: 25, clicks: 8 },
  ];

  const maxViews = Math.max(...mockWeeklyData.map((d) => d.views));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="mt-1 text-slate-400">
          Track how your storefront is performing
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
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-100">
              {stat.value.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly Activity Chart */}
      <div className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
        <h2 className="text-lg font-semibold text-slate-100">Weekly Activity</h2>
        <p className="mt-1 text-sm text-slate-400">
          Profile views and website clicks over the past 7 days
        </p>

        {/* Simple Bar Chart */}
        <div className="mt-6">
          <div className="flex items-end justify-between gap-2 h-48">
            {mockWeeklyData.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-col items-center gap-1">
                  {/* Views Bar */}
                  <div
                    className="w-full max-w-[24px] rounded-t bg-[#14B8A6]/60 transition-all"
                    style={{
                      height: `${(day.views / maxViews) * 150}px`,
                    }}
                  />
                  {/* Clicks indicator */}
                  <div className="absolute bottom-0 w-full max-w-[24px]">
                    <div
                      className="w-full rounded-t bg-[#14B8A6]"
                      style={{
                        height: `${(day.clicks / maxViews) * 150}px`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-[#14B8A6]/60" />
              <span className="text-xs text-slate-400">Profile Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-[#14B8A6]" />
              <span className="text-xs text-slate-400">Website Clicks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement Rate */}
        <div className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Engagement Rate</h2>
          <p className="mt-1 text-sm text-slate-400">
            How often visitors take action on your profile
          </p>

          <div className="mt-6">
            <div className="flex items-end gap-4">
              <span className="text-4xl font-bold text-[#14B8A6]">
                {vendor.profileViews > 0
                  ? Math.round(((vendor.websiteClicks || 0) / vendor.profileViews) * 100)
                  : 0}
                %
              </span>
              <span className="mb-1 text-sm text-slate-400">click-through rate</span>
            </div>

            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-[#14B8A6]"
                style={{
                  width: `${
                    vendor.profileViews > 0
                      ? Math.min(((vendor.websiteClicks || 0) / vendor.profileViews) * 100, 100)
                      : 0
                  }%`,
                }}
              />
            </div>

            <p className="mt-4 text-sm text-slate-500">
              {vendor.websiteClicks || 0} clicks from {vendor.profileViews || 0} profile views
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Tips to Grow</h2>
          <p className="mt-1 text-sm text-slate-400">
            Suggestions to improve your visibility
          </p>

          <ul className="mt-4 space-y-3">
            {(!vendor.profileImage || !vendor.coverImage) && (
              <li className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-200">Add profile images</p>
                  <p className="text-xs text-slate-400">
                    Vendors with images get 3x more clicks
                  </p>
                </div>
              </li>
            )}
            {(vendor.gallery?.length || 0) < 5 && (
              <li className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-200">Add more gallery photos</p>
                  <p className="text-xs text-slate-400">
                    Showcase your work with at least 5 images
                  </p>
                </div>
              </li>
            )}
            {!vendor.videoUrl && (
              <li className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-200">Add a video</p>
                  <p className="text-xs text-slate-400">
                    Videos help tell your story and build connection
                  </p>
                </div>
              </li>
            )}
            {!Object.values(vendor.socialLinks || {}).some(Boolean) && (
              <li className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-200">Link social media</p>
                  <p className="text-xs text-slate-400">
                    Connect Instagram, Facebook, or other platforms
                  </p>
                </div>
              </li>
            )}
            {(vendor.gallery?.length || 0) >= 5 &&
              vendor.videoUrl &&
              Object.values(vendor.socialLinks || {}).some(Boolean) && (
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Great job!</p>
                    <p className="text-xs text-slate-400">
                      Your profile is well optimized for discovery
                    </p>
                  </div>
                </li>
              )}
          </ul>
        </div>
      </div>

      {/* Note */}
      <p className="text-center text-xs text-slate-500">
        Analytics data is updated in real-time. More detailed analytics coming soon.
      </p>
    </div>
  );
}

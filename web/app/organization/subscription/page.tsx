"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore";
import type { EmployerProfile } from "@/lib/types";

interface ProgressBarProps {
  used: number;
  total: number;
  label: string;
}

function ProgressBar({ used, total, label }: ProgressBarProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm text-slate-400">
          {used} / {total}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#14B8A6] transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xl mt-1">{icon}</span>
      <div>
        <h4 className="font-medium text-slate-100">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const tierLabels: Record<string, { label: string; color: string }> = {
    TIER1: { label: "Basic", color: "bg-slate-700/50 border-slate-600 text-slate-200" },
    TIER2: { label: "Unlimited + Shop", color: "bg-[#14B8A6]/20 border-[#14B8A6]/40 text-[#14B8A6]" },
  };

  const tierInfo = tierLabels[tier as keyof typeof tierLabels] || tierLabels.TIER1;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tierInfo.color}`}
    >
      {tierInfo.label}
    </span>
  );
}

function formatDate(date: any): string {
  if (!date) return "N/A";

  // Handle Firestore Timestamp
  if (date.toDate && typeof date.toDate === "function") {
    return new Date(date.toDate()).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Handle Date object or string
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SubscriptionPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "employer") {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const employerProfile = await getEmployerProfile(user.uid);
        setProfile(employerProfile);
        setError(null);
      } catch (err) {
        console.error("Error loading subscription:", err);
        setError("Failed to load subscription information");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, role]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-8 text-center shadow-lg shadow-black/30">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-8 w-48 bg-slate-700 rounded"></div>
              <div className="h-4 w-72 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
              Please sign in
            </h1>
            <p className="text-sm text-slate-400">
              Sign in with your employer account to view your subscription details.
            </p>
            <Link
              href="/register?role=employer"
              className="inline-flex items-center rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
            >
              Create employer account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not employer
  if (role !== "employer") {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
              Employer access only
            </h1>
            <p className="text-sm text-slate-400">
              Switch to your employer account to view subscription information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            <p className="font-medium">Error loading subscription</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const subscription = profile?.subscription;
  const hasActiveSubscription = subscription?.active;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
        {/* Page Header */}
        <div className="mb-12 space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
            Subscription Management
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-slate-50">
            Your Subscription
          </h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base max-w-2xl">
            Manage your IOPPS employer subscription, view credit usage, and explore upgrade options.
          </p>
        </div>

        {/* No Subscription State */}
        {!hasActiveSubscription && (
          <div className="mb-12 rounded-2xl border border-slate-800/80 bg-[#08090C] p-8 shadow-lg shadow-black/30">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-50">
                  No active subscription
                </h2>
                <p className="mt-2 text-slate-400">
                  Get started with an IOPPS employer subscription to post jobs, access job credits, and reach Indigenous talent across Canada.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
                >
                  View Pricing & Plans
                </Link>
                <Link
                  href="/organization/jobs/new"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
                >
                  Post a Job
                </Link>
              </div>
            </div>
          </div>
        )}

        {hasActiveSubscription && subscription && (
          <div className="space-y-8">
            {/* Subscription Status Card */}
            <div className="rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-6 sm:p-8 shadow-lg shadow-black/30">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Plan
                  </p>
                  <div className="flex items-center gap-3">
                    <TierBadge tier={subscription.tier} />
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-200">
                      Active
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Purchased
                  </p>
                  <p className="text-sm font-medium text-slate-200">
                    {formatDate(subscription.purchasedAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Expires
                  </p>
                  <p className="text-sm font-medium text-slate-200">
                    {formatDate(subscription.expiresAt)}
                  </p>
                </div>
              </div>

              {subscription.amountPaid && (
                <div className="mt-6 pt-6 border-t border-[#14B8A6]/20">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    Amount Paid
                  </p>
                  <p className="text-2xl font-bold text-[#14B8A6]">
                    ${(subscription.amountPaid / 100).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Credits Dashboard */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Job Credits Card */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50">
                      Job Credits
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Used to post job listings
                    </p>
                  </div>
                  <span className="text-2xl">💼</span>
                </div>

                <div className="space-y-4">
                  <ProgressBar
                    used={subscription.jobCreditsUsed || 0}
                    total={subscription.jobCredits || 0}
                    label="Job postings"
                  />

                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">
                      {subscription.jobCreditsUsed || 0} of {subscription.jobCredits || 0} credits used
                    </p>
                    <p className="text-sm font-medium text-[#14B8A6]">
                      {subscription.jobCredits - (subscription.jobCreditsUsed || 0)} remaining
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                    Quick actions
                  </p>
                  <Link
                    href="/organization/jobs/new"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
                  >
                    Post a Job
                  </Link>
                </div>
              </div>

              {/* Featured Job Credits Card */}
              <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50">
                      Featured Job Credits
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Premium visibility for job postings
                    </p>
                  </div>
                  <span className="text-2xl">⭐</span>
                </div>

                <div className="space-y-4">
                  <ProgressBar
                    used={subscription.featuredJobCreditsUsed || 0}
                    total={subscription.featuredJobCredits || 0}
                    label="Featured listings"
                  />

                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-2">
                      {subscription.featuredJobCreditsUsed || 0} of {subscription.featuredJobCredits || 0} credits used
                    </p>
                    <p className="text-sm font-medium text-[#14B8A6]">
                      {subscription.featuredJobCredits - (subscription.featuredJobCreditsUsed || 0)} remaining
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                    Quick actions
                  </p>
                  <Link
                    href="/organization/jobs/new?featured=true"
                    className="block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
                  >
                    Post Featured Job
                  </Link>
                </div>
              </div>
            </div>

            {/* Unlimited Posts Badge */}
            {subscription.unlimitedPosts && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 shadow-lg shadow-black/30">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-300">
                      Unlimited Job Postings
                    </h3>
                    <p className="text-sm text-emerald-200/80 mt-1">
                      Post unlimited job listings on the IOPPS platform. No credit limitations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tier Benefits */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
              <h2 className="text-xl font-semibold text-slate-50 mb-6">
                Your Subscription Benefits
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                {subscription.tier === "TIER1" && (
                  <>
                    <FeatureItem
                      icon="📋"
                      title="Job Posting Credits"
                      description="5 job postings per year to reach talent"
                    />
                    <FeatureItem
                      icon="📊"
                      title="Basic Analytics"
                      description="Track views and application metrics"
                    />
                    <FeatureItem
                      icon="🏢"
                      title="Employer Profile"
                      description="Custom company profile page"
                    />
                    <FeatureItem
                      icon="💬"
                      title="Messaging"
                      description="Direct communication with applicants"
                    />
                  </>
                )}

                {subscription.tier === "TIER2" && (
                  <>
                    <FeatureItem
                      icon="🚀"
                      title="Unlimited Job Posts"
                      description="Post as many jobs as you need"
                    />
                    <FeatureItem
                      icon="⭐"
                      title="Rotating Featured Listings"
                      description="Premium visibility for top positions"
                    />
                    <FeatureItem
                      icon="📊"
                      title="Advanced Analytics"
                      description="Detailed insights and reporting"
                    />
                    <FeatureItem
                      icon="🛍️"
                      title="Shop Indigenous Listing"
                      description="Your business in the Shop Indigenous marketplace"
                    />
                    <FeatureItem
                      icon="🏢"
                      title="Organization Branding"
                      description="Logo and branding on all postings"
                    />
                    <FeatureItem
                      icon="💬"
                      title="Direct Messaging"
                      description="Full messaging suite with applicants"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
                <h3 className="font-semibold text-slate-50 mb-2">
                  View Your Jobs
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Manage all your active and past job postings
                </p>
                <Link
                  href="/organization/jobs"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
                >
                  View Jobs
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
                <h3 className="font-semibold text-slate-50 mb-2">
                  Manage Billing
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Update payment method and billing information
                </p>
                <button
                  disabled
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-semibold text-slate-500 cursor-not-allowed opacity-50"
                >
                  Coming Soon
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
                <h3 className="font-semibold text-slate-50 mb-2">
                  View Pricing
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  See all available plans and upgrade options
                </p>
                <Link
                  href="/pricing"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
                >
                  View Pricing
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
                <h3 className="font-semibold text-slate-50 mb-2">
                  View Your Profile
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Edit organization information and branding
                </p>
                <Link
                  href="/organization/profile"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
                >
                  View Profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

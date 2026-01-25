"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";
import {
  JOB_POSTING_PRODUCTS,
  SUBSCRIPTION_PRODUCTS,
} from "@/lib/stripe";

export default function EmployersPanel() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCommunityMember = role === "community";

  const handleSubscriptionCheckout = async (tier: "TIER1" | "TIER2") => {
    if (!user) {
      router.push("/register?redirect=/pricing&role=employer");
      return;
    }

    if (role === "community") {
      setError("Subscriptions are for employers only. Please create an employer account to post jobs and hire.");
      return;
    }

    setLoadingTier(tier);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/stripe/checkout-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ productType: tier }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingTier(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-50">For Employers & Recruiters</h2>
        <p className="mt-2 text-slate-400">
          Connect with Indigenous talent through job postings or annual hiring plans.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Single Job Post - Starter option */}
        <PricingCard
          title="Single Job Post"
          price={`$${JOB_POSTING_PRODUCTS.SINGLE.price / 100}`}
          features={[
            `Live for ${JOB_POSTING_PRODUCTS.SINGLE.duration} days`,
            "Standard placement on job board",
            "Basic employer profile",
            "Easy online posting",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Post a Job"}
          buttonHref={isCommunityMember ? undefined : "/organization/jobs/new"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to post jobs." : undefined}
        />

        {/* Featured Job Ad - Visibility Upgrade */}
        <PricingCard
          title="Featured Job Ad"
          price={`$${JOB_POSTING_PRODUCTS.FEATURED.price / 100}`}
          badge="POPULAR"
          features={[
            `Live for ${JOB_POSTING_PRODUCTS.FEATURED.duration} days`,
            "Featured spotlight on job board",
            "Top positioning in search results",
            "Employer logo & branding",
            "7 days Talent Pool access",
            "Posting analytics",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Post Featured Job"}
          buttonHref={isCommunityMember ? undefined : "/organization/jobs/new?tier=featured"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to post jobs." : undefined}
        />

        {/* Growth Plan - $1,250/year */}
        <PricingCard
          title={SUBSCRIPTION_PRODUCTS.TIER1.name}
          price={`$${(SUBSCRIPTION_PRODUCTS.TIER1.price / 100).toLocaleString()}`}
          period="/ year"
          features={SUBSCRIPTION_PRODUCTS.TIER1.features}
          buttonText={
            role === "community"
              ? "Employer Account Required"
              : loadingTier === "TIER1"
              ? "Processing..."
              : "Subscribe Now"
          }
          buttonAction={role === "community" ? undefined : () => handleSubscriptionCheckout("TIER1")}
          loading={loadingTier === "TIER1"}
          requiresAuth
          disabled={role === "community"}
          helperText={
            role === "community"
              ? "Need to hire? Create an employer account."
              : undefined
          }
        />

        {/* Unlimited Plan - $2,500/year - Recommended */}
        <PricingCard
          title={SUBSCRIPTION_PRODUCTS.TIER2.name}
          price={`$${(SUBSCRIPTION_PRODUCTS.TIER2.price / 100).toLocaleString()}`}
          period="/ year"
          badge="BEST VALUE"
          highlighted={true}
          features={SUBSCRIPTION_PRODUCTS.TIER2.features}
          buttonText={
            role === "community"
              ? "Employer Account Required"
              : loadingTier === "TIER2"
              ? "Processing..."
              : "Subscribe Now"
          }
          buttonAction={role === "community" ? undefined : () => handleSubscriptionCheckout("TIER2")}
          loading={loadingTier === "TIER2"}
          requiresAuth
          disabled={role === "community"}
          helperText={
            role === "community"
              ? "Need to hire? Create an employer account."
              : undefined
          }
        />
      </div>

      {/* Talk to us CTA */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
          Need a custom package or have questions about hiring?
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-flex items-center gap-2 text-[#14B8A6] hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Talk to IOPPS
        </Link>
      </div>
    </div>
  );
}

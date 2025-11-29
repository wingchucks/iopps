"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/components/AuthProvider";
import {
  JOB_POSTING_PRODUCTS,
  SUBSCRIPTION_PRODUCTS,
  CONFERENCE_PRODUCTS,
  VENDOR_PRODUCTS,
} from "@/lib/stripe";

type PricingCardProps = {
  title: string;
  price: string;
  period?: string;
  features: readonly string[];
  badge?: string;
  highlighted?: boolean;
  buttonText?: string;
  buttonAction?: () => void;
  buttonHref?: string;
  loading?: boolean;
  requiresAuth?: boolean;
};

function PricingCard({
  title,
  price,
  period,
  features,
  badge,
  highlighted = false,
  buttonText = "Get Started",
  buttonAction,
  buttonHref,
  loading = false,
  requiresAuth = false,
}: PricingCardProps) {
  const { user } = useAuth();

  const handleClick = () => {
    if (requiresAuth && !user) {
      window.location.href = "/register?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }
    if (buttonAction) buttonAction();
  };

  return (
    <article
      className={`flex flex-col rounded-2xl border p-6 shadow-lg shadow-black/30 transition-all ${
        highlighted
          ? "border-[#14B8A6] bg-[#14B8A6]/5"
          : "border-slate-800/80 bg-[#08090C]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-50">{title}</h3>
        {badge && (
          <span className="inline-flex items-center rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold text-[#14B8A6]">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-[#14B8A6]">{price}</span>
        {period && <span className="text-sm text-slate-400">{period}</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-slate-300">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#14B8A6]"
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
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {buttonHref ? (
          <Link
            href={buttonHref}
            className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all ${
              highlighted
                ? "bg-[#14B8A6] text-slate-900 hover:bg-[#16cdb8]"
                : "border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-[#14B8A6] hover:bg-slate-800"
            }`}
          >
            {buttonText}
          </Link>
        ) : (
          <button
            onClick={handleClick}
            disabled={loading}
            className={`block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all disabled:opacity-50 ${
              highlighted
                ? "bg-[#14B8A6] text-slate-900 hover:bg-[#16cdb8]"
                : "border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-[#14B8A6] hover:bg-slate-800"
            }`}
          >
            {loading ? "Processing..." : buttonText}
          </button>
        )}
      </div>
    </article>
  );
}

export default function PricingPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hide "Create employer account" for employers, admins, and moderators
  const shouldHideEmployerButton = user && role && role !== "community";

  const handleSubscriptionCheckout = async (tier: "TIER1" | "TIER2" | "TIER3") => {
    if (!user) {
      router.push("/register?redirect=/pricing&role=employer");
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
    <PageShell>
      <SectionHeader
        eyebrow="Pricing & Plans"
        title="Partner with IOPPS to hire, promote, and grow"
        subtitle="Choose flexible options for single job posts, annual hiring plans, conferences, and Shop Indigenous vendors across Turtle Island."
      />

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* CTA Section - Top */}
      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              Ready to connect with Indigenous talent?
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Talk to our team about custom packages or get started with an employer account.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
            >
              Talk to IOPPS about pricing
            </Link>
            {!shouldHideEmployerButton && (
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
              >
                Create employer account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Section 1: Single Job Posts */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">Single Job Posts</h2>
          <p className="mt-2 text-sm text-slate-400">
            Post individual jobs with flexible visibility options.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <PricingCard
            title="Single Job Post"
            price={`$${JOB_POSTING_PRODUCTS.SINGLE.price / 100}`}
            features={[
              `Live for ${JOB_POSTING_PRODUCTS.SINGLE.duration} days`,
              "Standard placement on the IOPPS job board",
              "Basic employer profile",
            ]}
            buttonText="Post a Job"
            buttonHref="/employer/jobs/new"
          />
          <PricingCard
            title="Featured Job Ad"
            price={`$${JOB_POSTING_PRODUCTS.FEATURED.price / 100}`}
            badge="Featured"
            features={[
              `Posted for ${JOB_POSTING_PRODUCTS.FEATURED.duration} days`,
              '"Featured" spotlight placement',
              "Employer logo + branding on listing",
              "Analytics (views & clicks)",
            ]}
            buttonText="Post a Featured Job"
            buttonHref="/employer/jobs/new?featured=true"
          />
        </div>
      </section>

      {/* Section 2: Employer Subscription Tiers */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">Employer Subscription Tiers</h2>
          <p className="mt-2 text-sm text-slate-400">
            Annual plans for ongoing hiring and visibility. Purchase now and start posting immediately.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <PricingCard
            title={SUBSCRIPTION_PRODUCTS.TIER1.name}
            price={`$${(SUBSCRIPTION_PRODUCTS.TIER1.price / 100).toLocaleString()}`}
            period="/ year"
            features={SUBSCRIPTION_PRODUCTS.TIER1.features}
            buttonText={loadingTier === "TIER1" ? "Processing..." : "Subscribe Now"}
            buttonAction={() => handleSubscriptionCheckout("TIER1")}
            loading={loadingTier === "TIER1"}
            requiresAuth
          />
          <PricingCard
            title={SUBSCRIPTION_PRODUCTS.TIER2.name}
            price={`$${(SUBSCRIPTION_PRODUCTS.TIER2.price / 100).toLocaleString()}`}
            period="/ year"
            badge="Popular"
            features={SUBSCRIPTION_PRODUCTS.TIER2.features}
            buttonText={loadingTier === "TIER2" ? "Processing..." : "Subscribe Now"}
            buttonAction={() => handleSubscriptionCheckout("TIER2")}
            loading={loadingTier === "TIER2"}
            requiresAuth
          />
          <PricingCard
            title={SUBSCRIPTION_PRODUCTS.TIER3.name}
            price={`$${(SUBSCRIPTION_PRODUCTS.TIER3.price / 100).toLocaleString()}`}
            period="/ year"
            badge="Best Value"
            highlighted={true}
            features={[...SUBSCRIPTION_PRODUCTS.TIER3.features, "Ultimate package for visibility & engagement"]}
            buttonText={loadingTier === "TIER3" ? "Processing..." : "Subscribe Now"}
            buttonAction={() => handleSubscriptionCheckout("TIER3")}
            loading={loadingTier === "TIER3"}
            requiresAuth
          />
        </div>
      </section>

      {/* Section 3: Conference & Event Uploads */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">Conference & Event Uploads</h2>
          <p className="mt-2 text-sm text-slate-400">
            Promote your conferences, summits, gatherings, and training events.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <PricingCard
            title={CONFERENCE_PRODUCTS.STANDARD.name}
            price={`$${CONFERENCE_PRODUCTS.STANDARD.price / 100}`}
            period="per event"
            features={[
              "Upload any conference, summit, gathering, hiring event, or training",
              'Listed under the IOPPS "Conferences & Events" pillar',
              "Includes banner image, description, registration link",
              "Social promo formatting",
            ]}
            buttonText="Post an Event"
            buttonHref="/employer/conferences/new"
          />
          <PricingCard
            title={CONFERENCE_PRODUCTS.FEATURED.name}
            price={`$${CONFERENCE_PRODUCTS.FEATURED.price / 100}`}
            period="per event"
            badge="Featured"
            features={[
              "All standard features included",
              "Featured badge and top positioning",
              `Live for ${CONFERENCE_PRODUCTS.FEATURED.duration} days`,
              "Priority visibility on homepage",
            ]}
            buttonText="Post a Featured Event"
            buttonHref="/employer/conferences/new?featured=true"
          />
        </div>
      </section>

      {/* Section 4: Shop Indigenous Vendor Pricing */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">Shop Indigenous Vendor Pricing</h2>
          <p className="mt-2 text-sm text-slate-400">
            Showcase your Indigenous-owned business in our marketplace.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <PricingCard
            title={VENDOR_PRODUCTS.MONTHLY.name}
            price={`$${VENDOR_PRODUCTS.MONTHLY.price / 100}`}
            period="/ month"
            badge="First month FREE"
            features={VENDOR_PRODUCTS.MONTHLY.features}
            buttonText="List Your Business"
            buttonHref="/vendor/register"
          />
          <PricingCard
            title={VENDOR_PRODUCTS.ANNUAL.name}
            price={`$${VENDOR_PRODUCTS.ANNUAL.price / 100}`}
            period="/ year"
            badge="Save $200"
            features={VENDOR_PRODUCTS.ANNUAL.features}
            buttonText="Get Annual Plan"
            buttonHref="/vendor/register?plan=annual"
          />
        </div>
      </section>

      {/* Section 5: Live Streaming Services */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">Live Streaming Services</h2>
          <p className="mt-2 text-sm text-slate-400">
            Professional live stream coverage for your events.
          </p>
        </div>
        <div className="rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/20">
              <svg className="h-6 w-6 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-50">
                Custom Live Streaming Solutions
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                We provide professional live streaming coverage for pow wows, tournaments, conferences, cultural events, and community gatherings. Each event has unique technical and coverage requirements.
              </p>
              <p className="mt-3 text-sm text-slate-300">
                <span className="font-semibold text-[#14B8A6]">Email us to discuss:</span> Coverage options, technical requirements, event specifics, and custom packages tailored to your needs.
              </p>
              <div className="mt-4">
                <a
                  href="mailto:nathan.arias@iopps.ca"
                  className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email about live streaming
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Everything in One Clean List */}
      <section className="mt-12">
        <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 shadow-lg shadow-black/30">
          <h2 className="text-xl font-bold text-slate-50">Everything in One Clean List</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Single Job Post</span>
              <span className="font-semibold text-[#14B8A6]">$125</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Featured Job Ad</span>
              <span className="font-semibold text-[#14B8A6]">$300</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Tier 1 (Basic)</span>
              <span className="font-semibold text-[#14B8A6]">$1,250/yr</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Tier 2 (Unlimited Basic)</span>
              <span className="font-semibold text-[#14B8A6]">$2,500/yr</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Tier 3 (Unlimited Pro)</span>
              <span className="font-semibold text-[#14B8A6]">$3,750/yr</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Conference/Event</span>
              <span className="font-semibold text-[#14B8A6]">$250</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Shop Vendor (Monthly)</span>
              <span className="font-semibold text-[#14B8A6]">$50/mo</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
              <span className="text-sm text-slate-300">Shop Vendor (Annual)</span>
              <span className="font-semibold text-[#14B8A6]">$400/yr</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Bottom */}
      <section className="mt-12 rounded-2xl border border-slate-800/80 bg-[#08090C] p-8 text-center shadow-lg shadow-black/30">
        <h2 className="text-2xl font-bold text-slate-50">Ready to get started?</h2>
        <p className="mt-3 text-sm text-slate-400">
          Join employers, Nations, and partners building Indigenous workforce connections across Canada.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14B8A6] px-8 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
          >
            Talk to IOPPS about pricing
          </Link>
          {!shouldHideEmployerButton && (
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-8 py-3 text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
            >
              Create employer account
            </Link>
          )}
        </div>
      </section>
    </PageShell>
  );
}

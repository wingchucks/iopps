"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";

type PricingCardProps = {
  title: string;
  price: string;
  period?: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
};

function PricingCard({
  title,
  price,
  period,
  features,
  badge,
  highlighted = false,
}: PricingCardProps) {
  return (
    <article
      className={`rounded-2xl border p-6 shadow-lg shadow-black/30 transition-all ${
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
      <ul className="mt-6 space-y-3">
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
    </article>
  );
}

export default function PricingPage() {
  return (
    <PageShell>
      <SectionHeader
        eyebrow="Pricing & Plans"
        title="Partner with IOPPS to hire, promote, and grow"
        subtitle="Choose flexible options for single job posts, annual hiring plans, conferences, and Shop Indigenous vendors across Turtle Island."
      />

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
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
            >
              Create employer account
            </Link>
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
            price="$125"
            features={[
              "1 job posting live for 30 days",
              "Standard placement on the IOPPS job board",
              "Basic employer profile",
            ]}
          />
          <PricingCard
            title="Featured Job Ad"
            price="$300"
            badge="Featured"
            features={[
              "Posted for 45 days",
              '"Featured" spotlight placement',
              "Employer logo + branding on listing",
              "Analytics (views & clicks)",
            ]}
          />
        </div>
      </section>

      {/* Section 2: Employer Subscription Tiers */}
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">Employer Subscription Tiers</h2>
          <p className="mt-2 text-sm text-slate-400">
            Annual plans for ongoing hiring and visibility.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <PricingCard
            title="Tier 1 – Basic Visibility"
            price="$1,250"
            period="/ year"
            features={[
              "15 job postings per year",
              "Standard placement",
              "Basic employer profile page",
              "Access to posting analytics",
              "15 Featured Job Listings included",
            ]}
          />
          <PricingCard
            title="Tier 2 – Unlimited Basic"
            price="$2,500"
            period="/ year"
            badge="Popular"
            features={[
              "Unlimited job postings for 12 months",
              "Employer branding on postings",
              "Rotating featured listings on homepage & job board",
              "Candidate engagement analytics",
              "Standard customer support",
              "Rotating Featured Jobs included",
            ]}
          />
          <PricingCard
            title="Tier 3 – Unlimited Pro"
            price="$3,750"
            period="/ year"
            badge="Best Value"
            highlighted={true}
            features={[
              "Unlimited job postings (12 months)",
              "Featured Employer status across IOPPS.ca",
              "Premium branding + credibility boosts",
              "Priority customer support",
              "Full access to the candidate database",
              "Rotating Featured Jobs",
              "Monthly Podcast Feature (live or pre-recorded)",
              "💡 Ultimate package for visibility & engagement",
            ]}
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
        <div className="max-w-2xl">
          <PricingCard
            title="Conference / Event Posting"
            price="$250"
            period="per event"
            features={[
              "Upload any conference, summit, gathering, hiring event, or training",
              'Listed under the IOPPS "Conferences & Events" pillar',
              "Includes banner image, description, registration link",
              "Social promo formatting",
            ]}
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
            title="Monthly Vendor Listing"
            price="$50"
            period="/ month"
            badge="First month FREE"
            features={[
              "Your Indigenous-owned business listed in Shop Indigenous",
              "Products, services, images, descriptions",
              "Direct contact links & social links",
              "FIRST MONTH FREE",
              "Renews monthly at $50/month",
            ]}
          />
          <PricingCard
            title="Annual Vendor Plan"
            price="$400"
            period="/ year"
            badge="Save $200"
            features={[
              "Save $200 vs monthly",
              "Includes all features above",
              "Priority placement inside the Shop Indigenous marketplace",
              "Annual discounted rate",
            ]}
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
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-8 py-3 text-sm font-semibold text-slate-100 transition-all hover:border-[#14B8A6] hover:bg-slate-800"
          >
            Create employer account
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

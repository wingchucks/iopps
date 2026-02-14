"use client";

import Link from "next/link";
import PricingCard from "./PricingCard";

export default function VendorsPanel() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">For Indigenous-Owned Businesses</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Showcase your Indigenous-owned business in our marketplace and connect with customers across Turtle Island.
        </p>
      </div>

      {/* FREE Listing Callout */}
      <div className="max-w-3xl rounded-xl border border-green-500/20 bg-green-500/5 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Business Listing is FREE for Indigenous-Owned Businesses</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              We support Indigenous entrepreneurs. List your business at no cost – forever. Optional upgrades available for increased visibility.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {/* Free Listing */}
        <PricingCard
          title="Free Business Listing"
          price="FREE"
          period=""
          badge="INDIGENOUS-OWNED"
          features={[
            "Full business profile",
            "Products & services listings",
            "Photos & descriptions",
            "Contact info & social links",
            "Listed in Shop Indigenous directory",
            "Customer inquiries",
            "Free forever",
          ]}
          buttonText="List Your Business"
          buttonHref="/organization/shop/setup"
        />

        {/* Featured Business */}
        <PricingCard
          title="Featured Business"
          price="$25"
          period="/ month"
          highlighted={true}
          badge="BOOST VISIBILITY"
          features={[
            "Everything in Free",
            "Featured badge on listing",
            "Priority placement in directory",
            "Highlighted in search results",
          ]}
          buttonText="Get Featured"
          buttonHref="/organization/shop/setup?plan=featured"
        />

      </div>

      {/* Benefits highlight */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-3xl">
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-5 text-center">
          <div className="text-2xl mb-2">🏪</div>
          <h3 className="font-semibold text-foreground">Full Business Profile</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Logo, description, photos & contact info</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-5 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold text-foreground">Search Visibility</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Found by customers looking for Indigenous businesses</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-surface p-5 text-center">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-semibold text-foreground">Analytics</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Track views and engagement</p>
        </div>
      </div>

      {/* Talk to us CTA */}
      <div className="mt-8 rounded-xl border border-[var(--card-border)] bg-surface p-6 text-center max-w-3xl">
        <p className="text-[var(--text-secondary)]">
          Have questions about listing your business or need help getting set up?
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

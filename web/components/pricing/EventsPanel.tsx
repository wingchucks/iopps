"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";
import { CONFERENCE_PRODUCTS } from "@/lib/stripe";

export default function EventsPanel() {
  const { role } = useAuth();
  const isCommunityMember = role === "community";

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">For Event Organizers</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Post conferences, summits, pow wows, and gatherings for free. Pay only for featured visibility.
        </p>
      </div>

      {/* Free Posting Callout */}
      <div className="max-w-3xl rounded-2xl border border-accent/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
            <span className="text-2xl">🎉</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-foreground">Posting Is Always Free</h3>
              <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                Free
              </span>
            </div>
            <p className="mt-2 text-[var(--text-secondary)]">
              All conferences, summits, pow wows, and community events can be posted at no cost. Free listings receive standard visibility for 45 days. Feature your event to extend visibility.
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-[var(--text-muted)]">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Listed in Conferences section
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Banner image & description
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Registration link included
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Agenda & speaker profiles
              </li>
            </ul>
            <div className="mt-5">
              {isCommunityMember ? (
                <Link
                  href="/register?role=employer"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent transition-colors"
                >
                  Create Organization Account
                </Link>
              ) : (
                <Link
                  href="/organization/conferences/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent transition-colors"
                >
                  Post Your Event Free
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Visibility Options */}
      <h3 className="text-lg font-semibold text-foreground mb-4">Boost Your Visibility</h3>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Want more exposure? Feature your conference for premium placement and increased reach. Featured = priority placement + extended visibility.
      </p>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {/* Featured 90 Days */}
        <PricingCard
          title={CONFERENCE_PRODUCTS.FEATURED_90.name}
          price={`$${CONFERENCE_PRODUCTS.FEATURED_90.price / 100}`}
          features={[
            "Featured for 90 days",
            "Featured badge on listing",
            "Priority placement in directory",
            "Highlighted in conference listings",
            "All free posting features included",
          ]}
          buttonText={isCommunityMember ? "Organization Account Required" : "Feature for 90 Days"}
          buttonHref={isCommunityMember ? undefined : "/organization/conferences/new?featured=90"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an organization account to feature conferences." : undefined}
        />

        {/* Featured 365 Days - Best Value */}
        <PricingCard
          title={CONFERENCE_PRODUCTS.FEATURED_365.name}
          price={`$${CONFERENCE_PRODUCTS.FEATURED_365.price / 100}`}
          badge="BEST VALUE"
          highlighted={true}
          features={[
            "Featured for 365 days",
            "Featured badge on listing",
            "Homepage spotlight placement",
            "Top positioning in all listings",
            "Maximum visibility for recurring events",
            "All free posting features included",
          ]}
          buttonText={isCommunityMember ? "Organization Account Required" : "Feature for 1 Year"}
          buttonHref={isCommunityMember ? undefined : "/organization/conferences/new?featured=365"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an organization account to feature conferences." : undefined}
        />
      </div>

      {/* Contact CTA */}
      <div className="mt-8 rounded-xl border border-[var(--card-border)] bg-surface p-6 text-center">
        <p className="text-[var(--text-secondary)]">
          Have questions about posting events or need help with your listing?
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-flex items-center gap-2 text-[#14B8A6] hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Contact IOPPS
        </Link>
      </div>
    </div>
  );
}

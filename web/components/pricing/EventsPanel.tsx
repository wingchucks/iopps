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
        <h2 className="text-2xl font-bold text-slate-50">For Event Organizers</h2>
        <p className="mt-2 text-slate-400">
          Promote your conferences, summits, and professional gatherings to the IOPPS community.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {/* Standard Conference */}
        <PricingCard
          title={CONFERENCE_PRODUCTS.STANDARD.name}
          price={`$${CONFERENCE_PRODUCTS.STANDARD.price / 100}`}
          period="per event"
          features={[
            `Live for ${CONFERENCE_PRODUCTS.STANDARD.duration} days`,
            "Listed in Conferences section",
            "Banner image & description",
            "Registration link included",
            "Social promo formatting",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Post Your Event"}
          buttonHref={isCommunityMember ? undefined : "/organization/conferences/new"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to post events." : undefined}
        />

        {/* Featured Conference - Recommended */}
        <PricingCard
          title={CONFERENCE_PRODUCTS.FEATURED.name}
          price={`$${CONFERENCE_PRODUCTS.FEATURED.price / 100}`}
          period="per event"
          badge="RECOMMENDED"
          highlighted={true}
          features={[
            `Extended visibility for ${CONFERENCE_PRODUCTS.FEATURED.duration} days`,
            "All standard features included",
            "Featured badge & top positioning",
            "Priority homepage visibility",
            "Best for major events",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Feature Your Event"}
          buttonHref={isCommunityMember ? undefined : "/organization/conferences/new?featured=true"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to post events." : undefined}
        />
      </div>

      {/* Info box for pow wows */}
      <div className="mt-8 rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
            <span className="text-xl">🪶</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Pow Wows & Community Events</h3>
            <p className="mt-1 text-sm text-slate-400">
              Pow wows and community cultural events can be listed for free in our Events section. Conference pricing applies to professional/business gatherings.
            </p>
            <Link
              href="/events/submit"
              className="mt-2 inline-flex text-sm text-purple-400 hover:underline"
            >
              Submit a free pow wow listing →
            </Link>
          </div>
        </div>
      </div>

      {/* Talk to us CTA */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
          Planning a large conference or multi-day event? We offer custom packages.
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

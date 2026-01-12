"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";
import { TRAINING_PRODUCTS } from "@/lib/stripe";

export default function EducationPanel() {
  const { role } = useAuth();
  const isCommunityMember = role === "community";

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-50">For Education & Training Providers</h2>
        <p className="mt-2 text-slate-400">
          Boost visibility for your training programs with premium spotlight placement.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {/* 60-day Featured */}
        <PricingCard
          title={TRAINING_PRODUCTS.FEATURED.name}
          price={`$${TRAINING_PRODUCTS.FEATURED.price / 100}`}
          period="per program"
          features={[
            `Premium spotlight for ${TRAINING_PRODUCTS.FEATURED.duration} days`,
            "Featured badge on listing",
            "Top positioning in directory",
            "Increased visibility to job seekers",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Feature Your Program"}
          buttonHref={isCommunityMember ? undefined : "/organization/training"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to feature programs." : undefined}
        />

        {/* 90-day Featured - Recommended */}
        <PricingCard
          title={TRAINING_PRODUCTS.FEATURED_90.name}
          price={`$${TRAINING_PRODUCTS.FEATURED_90.price / 100}`}
          period="per program"
          badge="RECOMMENDED"
          highlighted={true}
          features={[
            `Extended spotlight for ${TRAINING_PRODUCTS.FEATURED_90.duration} days`,
            "Featured badge on listing",
            "Top positioning in directory",
            "Best value for longer campaigns",
            "Save 25% vs monthly renewal",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Feature Your Program"}
          buttonHref={isCommunityMember ? undefined : "/organization/training"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to feature programs." : undefined}
        />
      </div>

      {/* Info box */}
      <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Free Basic Listings Available</h3>
            <p className="mt-1 text-sm text-slate-400">
              All training programs can be listed for free with standard placement. Featured listings provide premium visibility and priority positioning.
            </p>
          </div>
        </div>
      </div>

      {/* Talk to us CTA */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
          Have a school or certification program? Let&apos;s discuss partnership options.
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

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
          List your training programs for free. Pay only for featured visibility and premium placement.
        </p>
      </div>

      {/* Free Listing Info - FIRST */}
      <div className="max-w-3xl rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Listing Is Always Free</h3>
            <p className="mt-1 text-sm text-slate-400">
              All training programs can be listed at no cost with standard placement. Featured options below provide premium visibility and priority positioning in the directory.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Options */}
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Boost Your Visibility</h3>
      <p className="text-sm text-slate-400 mb-6">
        Get more enrollments with featured placement and increased exposure to job seekers.
      </p>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {/* 60-day Featured */}
        <PricingCard
          title={TRAINING_PRODUCTS.FEATURED_60.name}
          price={`$${TRAINING_PRODUCTS.FEATURED_60.price / 100}`}
          features={[
            "Featured badge on listing",
            "Priority placement in directory",
            "Highlighted to job seekers",
            "Increased visibility for 60 days",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Feature for 60 Days"}
          buttonHref={isCommunityMember ? undefined : "/organization/training?featured=60"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to feature programs." : undefined}
        />

        {/* 90-day Featured - Recommended */}
        <PricingCard
          title={TRAINING_PRODUCTS.FEATURED_90.name}
          price={`$${TRAINING_PRODUCTS.FEATURED_90.price / 100}`}
          badge="RECOMMENDED"
          highlighted={true}
          features={[
            "Featured badge on listing",
            "Top positioning in directory",
            "Maximum visibility for 90 days",
            "Best value for longer campaigns",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Feature for 90 Days"}
          buttonHref={isCommunityMember ? undefined : "/organization/training?featured=90"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an employer account to feature programs." : undefined}
        />
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

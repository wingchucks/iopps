"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";
import { TRAINING_PRODUCTS, SCHOOL_PRODUCTS, SCHOOL_ADDON_PRODUCTS } from "@/lib/stripe";

export default function EducationPanel() {
  const { role } = useAuth();
  const isCommunityMember = role === "community";

  return (
    <div>
      {/* Schools Section */}
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">For Schools & Education Institutions</h2>
          <p className="mt-2 text-slate-400">
            List your school, programs, scholarships, and jobs. Basic listing is always free.
          </p>
        </div>

        {/* Free Listing Callout */}
        <div className="max-w-4xl rounded-xl border border-green-500/20 bg-green-500/5 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Basic School Profile is FREE</h3>
              <p className="mt-1 text-sm text-slate-400">
                Get started with a school profile, 3 programs, and 1 scholarship at no cost. Upgrade anytime for more features.
              </p>
            </div>
          </div>
        </div>

        {/* School Pricing Tiers */}
        <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2">
          {/* Basic - FREE */}
          <PricingCard
            title={SCHOOL_PRODUCTS.BASIC.name}
            price="FREE"
            period=""
            features={SCHOOL_PRODUCTS.BASIC.features}
            buttonText={isCommunityMember ? "Create Account" : "Get Started Free"}
            buttonHref={isCommunityMember ? "/register" : "/organization/education/setup"}
          />

          {/* Standard */}
          <PricingCard
            title={SCHOOL_PRODUCTS.STANDARD.name}
            price={`$${SCHOOL_PRODUCTS.STANDARD.price / 100}`}
            period="/ year"
            features={SCHOOL_PRODUCTS.STANDARD.features}
            buttonText={isCommunityMember ? "Create Account" : "Choose Standard"}
            buttonHref={isCommunityMember ? "/register" : "/organization/education/setup?plan=standard"}
          />

          {/* Premium - Highlighted */}
          <PricingCard
            title={SCHOOL_PRODUCTS.PREMIUM.name}
            price={`$${SCHOOL_PRODUCTS.PREMIUM.price / 100}`}
            period="/ year"
            badge="POPULAR"
            highlighted={true}
            features={SCHOOL_PRODUCTS.PREMIUM.features}
            buttonText={isCommunityMember ? "Create Account" : "Choose Premium"}
            buttonHref={isCommunityMember ? "/register" : "/organization/education/setup?plan=premium"}
          />

          {/* Enterprise */}
          <PricingCard
            title={SCHOOL_PRODUCTS.ENTERPRISE.name}
            price={`$${SCHOOL_PRODUCTS.ENTERPRISE.price / 100}`}
            period="/ year"
            badge="BEST VALUE"
            features={SCHOOL_PRODUCTS.ENTERPRISE.features}
            buttonText="Contact Us"
            buttonHref="/contact"
          />
        </div>

        {/* Add-ons Section */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">À La Carte Add-ons</h3>
          <p className="text-sm text-slate-400 mb-6">
            Need something extra? Purchase individual items anytime.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-4xl">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="font-semibold text-slate-100">Single Job Post</h4>
              <p className="text-[#14B8A6] font-bold text-lg">${SCHOOL_ADDON_PRODUCTS.SINGLE_JOB.price / 100}</p>
              <p className="text-xs text-slate-400 mt-1">School rate (save $25)</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="font-semibold text-slate-100">Featured Program</h4>
              <p className="text-[#14B8A6] font-bold text-lg">${SCHOOL_ADDON_PRODUCTS.FEATURED_PROGRAM.price / 100}</p>
              <p className="text-xs text-slate-400 mt-1">60 days visibility</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="font-semibold text-slate-100">Extra Scholarship</h4>
              <p className="text-[#14B8A6] font-bold text-lg">${SCHOOL_ADDON_PRODUCTS.ADDITIONAL_SCHOLARSHIP.price / 100}</p>
              <p className="text-xs text-slate-400 mt-1">Per listing</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="font-semibold text-slate-100">Recruitment Event</h4>
              <p className="text-[#14B8A6] font-bold text-lg">${SCHOOL_ADDON_PRODUCTS.RECRUITMENT_EVENT.price / 100}</p>
              <p className="text-xs text-slate-400 mt-1">90 days listing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-slate-800 my-12" />

      {/* Training Programs Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-50">For Training Providers</h2>
          <p className="mt-2 text-slate-400">
            List your training programs for free. Pay only for featured visibility and premium placement.
          </p>
        </div>

        {/* Free Listing Info */}
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
                All training programs can be listed at no cost with standard placement. Featured options below provide premium visibility.
              </p>
            </div>
          </div>
        </div>

        {/* Featured Options */}
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Boost Your Visibility</h3>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
          <PricingCard
            title={TRAINING_PRODUCTS.FEATURED_60.name}
            price={`$${TRAINING_PRODUCTS.FEATURED_60.price / 100}`}
            features={[
              "Featured badge on listing",
              "Priority placement in directory",
              "Highlighted to job seekers",
              "Increased visibility for 60 days",
            ]}
            buttonText={isCommunityMember ? "Create Account" : "Feature for 60 Days"}
            buttonHref={isCommunityMember ? "/register" : "/organization/training?featured=60"}
          />

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
            buttonText={isCommunityMember ? "Create Account" : "Feature for 90 Days"}
            buttonHref={isCommunityMember ? "/register" : "/organization/training?featured=90"}
          />
        </div>
      </div>

      {/* Talk to us CTA */}
      <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
          Need a custom solution or have questions about our education packages?
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

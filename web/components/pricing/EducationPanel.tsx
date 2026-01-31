"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";
import { TRAINING_PRODUCTS, SCHOOL_PRODUCTS } from "@/lib/stripe";

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
            Partner with IOPPS to showcase your school, programs, scholarships, and job opportunities to Indigenous learners across Canada.
          </p>
        </div>

        {/* School Partner Plan */}
        <div className="max-w-2xl">
          <PricingCard
            title={SCHOOL_PRODUCTS.PARTNER.name}
            price="Contact Us"
            period=""
            badge="UNLIMITED EVERYTHING"
            highlighted={true}
            features={SCHOOL_PRODUCTS.PARTNER.features}
            buttonText="Contact IOPPS"
            buttonHref="/contact"
          />
        </div>

        {/* 3 Month Trial Callout */}
        <div className="mt-8 max-w-2xl rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/20">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">3-Month Trial Available</h3>
              <p className="mt-1 text-sm text-slate-400">
                Want to try before you commit? Contact us to discuss a 3-month trial period for your institution.
              </p>
              <Link 
                href="/contact" 
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14B8A6]/80 transition"
              >
                Request Trial
              </Link>
            </div>
          </div>
        </div>

        {/* What's Included Grid */}
        <div className="mt-10 max-w-3xl">
          <h3 className="text-lg font-semibold text-slate-200 mb-6">Everything You Need</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <div className="text-2xl mb-2">💼</div>
              <h4 className="font-semibold text-slate-100">Unlimited Jobs</h4>
              <p className="text-xs text-slate-400 mt-1">Post as many positions as you need</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <div className="text-2xl mb-2">📚</div>
              <h4 className="font-semibold text-slate-100">Unlimited Programs</h4>
              <p className="text-xs text-slate-400 mt-1">Showcase all your courses & certifications</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <div className="text-2xl mb-2">🎁</div>
              <h4 className="font-semibold text-slate-100">Unlimited Scholarships</h4>
              <p className="text-xs text-slate-400 mt-1">List all awards & financial aid</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <div className="text-2xl mb-2">🎓</div>
              <h4 className="font-semibold text-slate-100">School Profile</h4>
              <p className="text-xs text-slate-400 mt-1">Full branded presence on IOPPS</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <h4 className="font-semibold text-slate-100">Featured Placement</h4>
              <p className="text-xs text-slate-400 mt-1">Priority visibility in directory</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-semibold text-slate-100">Analytics</h4>
              <p className="text-xs text-slate-400 mt-1">Track engagement & inquiries</p>
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
            List your short-term training programs for free. Longer programs (3+ months) require a listing fee.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="max-w-3xl space-y-4 mb-8">
          {/* Free Tier */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-100">Programs Under 3 Months</h3>
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">FREE</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Workshops, short courses, certifications, and training programs under 3 months can be listed at no cost.
                </p>
              </div>
            </div>
          </div>

          {/* Paid Tier */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-100">Programs 3+ Months</h3>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">PAID</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Longer programs, diplomas, certificates, and multi-month training require a listing fee.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Listing Options for 3+ Month Programs */}
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Listing Options for 3+ Month Programs</h3>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
          <PricingCard
            title="60-Day Listing"
            price={`$${TRAINING_PRODUCTS.FEATURED_60.price / 100}`}
            features={[
              "Full program listing on IOPPS",
              "Featured badge on listing",
              "Priority placement in search",
              "Visible for 60 days",
            ]}
            buttonText={isCommunityMember ? "Create Account" : "List Your Program"}
            buttonHref={isCommunityMember ? "/register" : "/organization/training/new"}
          />

          <PricingCard
            title="90-Day Listing"
            price={`$${TRAINING_PRODUCTS.FEATURED_90.price / 100}`}
            badge="BEST VALUE"
            highlighted={true}
            features={[
              "Full program listing on IOPPS",
              "Featured badge on listing",
              "Top placement in search results",
              "Extended visibility for 90 days",
            ]}
            buttonText={isCommunityMember ? "Create Account" : "List Your Program"}
            buttonHref={isCommunityMember ? "/register" : "/organization/training/new"}
          />
        </div>
      </div>

      {/* Talk to us CTA */}
      <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
          Questions about school partnerships or training programs?
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

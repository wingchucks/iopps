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

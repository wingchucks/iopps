"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";
import { VENDOR_PRODUCTS } from "@/lib/stripe";

export default function VendorsPanel() {
  const { role } = useAuth();
  const isCommunityMember = role === "community";

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-50">For Shop Indigenous Vendors</h2>
        <p className="mt-2 text-slate-400">
          Showcase your Indigenous-owned business in our marketplace and connect with customers across Turtle Island.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {/* Monthly */}
        <PricingCard
          title={VENDOR_PRODUCTS.MONTHLY.name}
          price={`$${VENDOR_PRODUCTS.MONTHLY.price / 100}`}
          period="/ month"
          badge="First Month FREE"
          features={VENDOR_PRODUCTS.MONTHLY.features}
          buttonText={isCommunityMember ? "Employer Account Required" : "Start Free Trial"}
          buttonHref={isCommunityMember ? undefined : "/organization/shop/setup"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an account to list your business." : "No credit card required to start"}
        />

        {/* Annual - Recommended */}
        <PricingCard
          title={VENDOR_PRODUCTS.ANNUAL.name}
          price={`$${VENDOR_PRODUCTS.ANNUAL.price / 100}`}
          period="/ year"
          badge="RECOMMENDED"
          highlighted={true}
          features={[
            ...VENDOR_PRODUCTS.ANNUAL.features,
            "Save $200 vs monthly billing",
          ]}
          buttonText={isCommunityMember ? "Employer Account Required" : "Get Annual Plan"}
          buttonHref={isCommunityMember ? undefined : "/organization/shop/setup?plan=annual"}
          disabled={isCommunityMember}
          helperText={isCommunityMember ? "Create an account to list your business." : undefined}
        />
      </div>

      {/* Benefits highlight */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-center">
          <div className="text-2xl mb-2">🏪</div>
          <h3 className="font-semibold text-slate-100">Full Business Profile</h3>
          <p className="mt-1 text-sm text-slate-400">Logo, description, photos & contact info</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold text-slate-100">Search Visibility</h3>
          <p className="mt-1 text-sm text-slate-400">Found by customers looking for Indigenous businesses</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-center">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-semibold text-slate-100">Analytics</h3>
          <p className="mt-1 text-sm text-slate-400">Track views and engagement</p>
        </div>
      </div>

      {/* Talk to us CTA */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
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

"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";

export default function VendorsPanel() {
  const { role } = useAuth();
  const isCommunityMember = role === "community";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-50">For Indigenous-Owned Businesses</h2>
        <p className="mt-2 text-slate-400">
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
            <h3 className="font-semibold text-slate-100">Business Listing is FREE for Indigenous-Owned Businesses</h3>
            <p className="mt-1 text-sm text-slate-400">
              We support Indigenous entrepreneurs. List your business at no cost – forever. Optional upgrades available for increased visibility.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-4xl">
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
          buttonText={isCommunityMember ? "Create Account" : "List Your Business"}
          buttonHref={isCommunityMember ? "/register" : "/organization/shop/setup"}
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
            "Homepage carousel rotation",
            "Monthly performance insights",
          ]}
          buttonText={isCommunityMember ? "Create Account" : "Get Featured"}
          buttonHref={isCommunityMember ? "/register" : "/organization/shop/setup?plan=featured"}
        />

        {/* Business + Jobs Bundle */}
        <PricingCard
          title="Business + Jobs Bundle"
          price="$200"
          period="/ year"
          badge="BEST VALUE"
          features={[
            "Featured Business included",
            "3 job posting credits",
            "Priority support",
            "Analytics dashboard",
            "Save $100 vs separate",
            "Perfect for growing businesses",
          ]}
          buttonText={isCommunityMember ? "Create Account" : "Get Bundle"}
          buttonHref={isCommunityMember ? "/register" : "/organization/shop/setup?plan=bundle"}
        />
      </div>

      {/* Job Posting Note */}
      <div className="mt-8 max-w-3xl rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Need to Post Jobs?</h3>
            <p className="mt-1 text-sm text-slate-400">
              Job postings are available separately. Indigenous businesses get a discounted rate of <strong className="text-amber-300">$100/job</strong> (regular $125).
              Or get the Bundle above for even better savings.
            </p>
            <Link href="/pricing#employers" className="mt-2 inline-block text-sm text-[#14B8A6] hover:underline">
              View job posting options →
            </Link>
          </div>
        </div>
      </div>

      {/* Benefits highlight */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-3xl">
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
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center max-w-3xl">
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

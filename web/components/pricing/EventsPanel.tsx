"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import PricingCard from "./PricingCard";

export default function EventsPanel() {
  const { role } = useAuth();
  const isCommunityMember = role === "community";

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-50">For Event Organizers</h2>
        <p className="mt-2 text-slate-400">
          Share your conferences, pow wows, and gatherings with the IOPPS community — completely free.
        </p>
      </div>

      {/* Free Events Box */}
      <div className="max-w-2xl rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <span className="text-2xl">🎉</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-100">All Events Are Free to Post</h3>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Free
              </span>
            </div>
            <p className="mt-2 text-slate-300">
              Post conferences, summits, pow wows, and community gatherings at no cost. Reach thousands of Indigenous professionals and community members across Canada.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Listed in Events & Conferences sections
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Banner image & full description
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Registration link included
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Social media preview cards
              </li>
            </ul>
            <div className="mt-6">
              {isCommunityMember ? (
                <div>
                  <p className="text-sm text-slate-400 mb-3">Create an employer account to post events.</p>
                  <Link
                    href="/organization/register"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors"
                  >
                    Register as Organization
                  </Link>
                </div>
              ) : (
                <Link
                  href="/organization/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  Post Your Event
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
        <p className="text-slate-300">
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

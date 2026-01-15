"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { incrementGrantViews } from "@/lib/firestore";
import type { BusinessGrant } from "@/lib/types";

interface GrantDetailClientProps {
  grant: BusinessGrant | null;
  error?: string;
}

export default function GrantDetailClient({ grant, error }: GrantDetailClientProps) {
  useEffect(() => {
    if (grant) {
      // Track view (non-critical, log errors but don't fail)
      incrementGrantViews(grant.id).catch((err) => {
        console.warn("Failed to track grant view:", err);
      });
    }
  }, [grant]);

  if (error || !grant) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Grant not found"}
          </h1>
          <Link
            href="/business/funding"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Back to Funding
          </Link>
        </div>
      </PageShell>
    );
  }

  const formatDeadline = (deadline: BusinessGrant["deadline"]) => {
    if (!deadline) return null;
    try {
      let date: Date;
      if (typeof deadline === "object" && "_seconds" in deadline) {
        date = new Date((deadline as { _seconds: number })._seconds * 1000);
      } else if (typeof deadline === "object" && "toDate" in deadline) {
        date = (deadline as { toDate: () => Date }).toDate();
      } else {
        date = new Date(deadline as string | Date);
      }
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof deadline === "string" ? deadline : null;
    }
  };

  const getStatusBadge = (status: BusinessGrant["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-sm font-semibold text-emerald-400">
            Currently Open
          </span>
        );
      case "upcoming":
        return (
          <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-sm font-semibold text-amber-400">
            Coming Soon
          </span>
        );
      case "closed":
        return (
          <span className="rounded-md bg-slate-500/20 border border-slate-500/40 px-3 py-1 text-sm font-semibold text-slate-400">
            Applications Closed
          </span>
        );
    }
  };

  const deadline = formatDeadline(grant.deadline);

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span className="mx-2">&rarr;</span>
          <Link href="/business" className="hover:text-white transition-colors">
            Business
          </Link>
          <span className="mx-2">&rarr;</span>
          <Link href="/business/funding" className="hover:text-white transition-colors">
            Funding
          </Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-white">{grant.title}</span>
        </nav>

        {/* Grant Header */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {getStatusBadge(grant.status)}
            <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300 capitalize">
              {grant.grantType?.replace("_", " ")}
            </span>
            {grant.featured && (
              <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-400">
                Featured
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-50">{grant.title}</h1>

          <div className="mt-3 flex items-center gap-2 text-base">
            <div className="flex items-center gap-2 text-slate-300">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-semibold">{grant.provider}</span>
            </div>
          </div>

          {/* Amount and Deadline */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {grant.amount?.display && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-base font-semibold text-emerald-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {grant.amount.display}
              </span>
            )}
            {deadline && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-base font-medium text-amber-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Deadline: {deadline}
              </span>
            )}
          </div>

          {/* Apply Button */}
          {grant.applicationUrl && grant.status === "active" && (
            <div className="mt-6">
              <a
                href={grant.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
              >
                Apply Now
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <ShareButtons
              item={{
                id: grant.id,
                title: `${grant.title} - ${grant.provider}`,
                description: grant.shortDescription || grant.description.substring(0, 150) + "...",
                type: "grant",
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">About This Grant</h2>
          <div className="mt-4 space-y-4 text-slate-300">
            {grant.description.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Eligibility */}
        {grant.eligibility && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">Eligibility Requirements</h2>
            <div className="mt-4 space-y-4">
              {grant.eligibility.indigenousOwned && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">Indigenous-owned business (priority or required)</span>
                </div>
              )}
              {grant.eligibility.womenOwned && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">Women-owned business eligible</span>
                </div>
              )}
              {grant.eligibility.youthOwned && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">Youth entrepreneur eligible</span>
                </div>
              )}
              {grant.eligibility.minYearsInBusiness && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">
                    Minimum {grant.eligibility.minYearsInBusiness} year(s) in business
                  </span>
                </div>
              )}
              {grant.eligibility.businessTypes && grant.eligibility.businessTypes.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">
                    Business types: {grant.eligibility.businessTypes.join(", ")}
                  </span>
                </div>
              )}
              {grant.eligibility.industries && grant.eligibility.industries.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">
                    Industries: {grant.eligibility.industries.join(", ")}
                  </span>
                </div>
              )}
              {grant.eligibility.provinces && grant.eligibility.provinces.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-[#14B8A6]">✓</span>
                  <span className="text-slate-300">
                    Regions: {grant.eligibility.provinces.join(", ")}
                  </span>
                </div>
              )}
              {grant.eligibility.requirements && grant.eligibility.requirements.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Additional Requirements
                  </h3>
                  <ul className="space-y-2">
                    {grant.eligibility.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Application Process */}
        {grant.applicationProcess && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">How to Apply</h2>
            <div className="mt-4 text-slate-300 whitespace-pre-wrap">
              {grant.applicationProcess}
            </div>
          </div>
        )}

        {/* Contact Information */}
        {(grant.contactEmail || grant.contactPhone || grant.providerWebsite) && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contact Information
            </h3>
            <div className="mt-4 space-y-2">
              {grant.contactEmail && (
                <p className="text-slate-300">
                  <span className="text-slate-500">Email:</span>{" "}
                  <a href={`mailto:${grant.contactEmail}`} className="text-[#14B8A6] hover:underline">
                    {grant.contactEmail}
                  </a>
                </p>
              )}
              {grant.contactPhone && (
                <p className="text-slate-300">
                  <span className="text-slate-500">Phone:</span> {grant.contactPhone}
                </p>
              )}
              {grant.providerWebsite && (
                <p className="text-slate-300">
                  <span className="text-slate-500">Website:</span>{" "}
                  <a
                    href={grant.providerWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#14B8A6] hover:underline"
                  >
                    {grant.providerWebsite}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/business/funding"
            className="inline-flex items-center gap-2 text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all funding opportunities
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

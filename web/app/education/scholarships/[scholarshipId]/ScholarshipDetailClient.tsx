"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FeedLayout } from "@/components/opportunity-graph";
import ShareButtons from "@/components/ShareButtons";
import { useAuth } from "@/components/AuthProvider";
import { createScholarshipApplication, getMemberProfile } from "@/lib/firestore";
import {
  trackScholarshipApplyClick,
  isScholarshipExpired,
  getOrCreateSessionId,
  generateFingerprintHash,
} from "@/lib/firestore/scholarship-analytics";
import type { Scholarship, MemberProfile } from "@/lib/types";

interface ScholarshipDetailClientProps {
  scholarship: Scholarship;
}

export default function ScholarshipDetailClient({ scholarship }: ScholarshipDetailClientProps) {
  const router = useRouter();
  const { user, role } = useAuth();

  // Check if user is a community member (not employer/admin/moderator)
  const isCommunityMember = role !== null && role !== "employer" && role !== "admin" && role !== "moderator";

  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [education, setEducation] = useState("");
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if scholarship is expired
  const isExpired = isScholarshipExpired(scholarship);

  // Track apply button clicks with rate limiting
  const handleApplyClick = useCallback(async () => {
    if (!scholarship.applicationUrl || isExpired) return;

    // Track the click (with built-in rate limiting and bot protection)
    const sessionId = getOrCreateSessionId();
    const fingerprintHash = generateFingerprintHash();

    await trackScholarshipApplyClick(scholarship.id, scholarship.employerId, {
      source: "web",
      userId: user?.uid,
      sessionId,
      fingerprintHash,
    });

    // Open the application URL in a new tab
    window.open(scholarship.applicationUrl, "_blank", "noopener,noreferrer");
  }, [scholarship.id, scholarship.employerId, scholarship.applicationUrl, isExpired, user?.uid]);

  // Load member profile for community members
  useEffect(() => {
    const loadProfile = async () => {
      if (user && isCommunityMember) {
        try {
          const profile = await getMemberProfile(user.uid);
          if (profile) {
            setMemberProfile(profile);
          }
        } catch (err) {
          console.error("Failed to load member profile", err);
        }
      }
    };
    loadProfile();
  }, [user, isCommunityMember]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !isCommunityMember || !scholarship) return;

    setSubmitting(true);
    setError(null);

    try {
      await createScholarshipApplication({
        scholarshipId: scholarship.id,
        employerId: scholarship.employerId,
        memberId: user.uid,
        memberEmail: user.email || "",
        memberDisplayName: user.displayName || "",
        education,
        essay,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/member/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Failed to submit application", err);
      setError("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDeadline = (value: Scholarship["deadline"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : new Date(typeof value === 'object' && value && '_seconds' in value ? (value as any)._seconds * 1000 : value as string | number);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const deadline = formatDeadline(scholarship.deadline);

  return (
    <FeedLayout activeNav="education" fullWidth>
      <div className="mx-auto max-w-4xl py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span className="mx-2">→</span>
          <Link href="/education" className="hover:text-slate-900 transition-colors">
            Education
          </Link>
          <span className="mx-2">→</span>
          <Link href="/education/scholarships" className="hover:text-slate-900 transition-colors">
            Scholarships
          </Link>
          <span className="mx-2">→</span>
          <span className="text-slate-900">{scholarship.title}</span>
        </nav>

        {/* Scholarship Header */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#14B8A6]">
              {scholarship.type}
            </span>
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {scholarship.level}
            </span>
            {scholarship.region && (
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {scholarship.region}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">{scholarship.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-semibold">{scholarship.provider}</span>
            </div>
          </div>

          {/* Amount and Deadline */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {scholarship.amount && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-base font-semibold text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {scholarship.amount}
              </span>
            )}
            {/* Recurring Schedule Badge */}
            {scholarship.isRecurring && scholarship.recurringSchedule && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-base font-medium text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recurring Deadlines: {scholarship.recurringSchedule}
              </span>
            )}
            {/* Single Deadline - only show if not recurring with schedule */}
            {deadline && !(scholarship.isRecurring && scholarship.recurringSchedule) && (
              <span className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-base font-medium ${
                isExpired
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-amber-300 bg-amber-50 text-amber-600"
              }`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isExpired ? "Deadline Passed" : `Deadline: ${deadline}`}
              </span>
            )}
            {isExpired && !(scholarship.isRecurring && scholarship.recurringSchedule) && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-base font-semibold text-red-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Expired
              </span>
            )}
          </div>

          {/* Apply CTA Button for External Links */}
          {scholarship.applicationMethod === "external_link" && scholarship.applicationUrl && (
            <div className="mt-6">
              {isExpired ? (
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-6 py-3 text-base font-semibold text-slate-500 cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Application Closed
                </button>
              ) : (
                <button
                  onClick={handleApplyClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Apply for this Scholarship
                </button>
              )}
            </div>
          )}

          {/* Email Application CTA */}
          {scholarship.applicationMethod === "email" && scholarship.applicationEmail && !isExpired && (
            <div className="mt-6">
              <a
                href={`mailto:${scholarship.applicationEmail}?subject=Scholarship Application: ${encodeURIComponent(scholarship.title)}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Application
              </a>
            </div>
          )}

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <ShareButtons
              item={{
                id: scholarship.id,
                title: `${scholarship.title} - ${scholarship.provider}`,
                description: scholarship.description.substring(0, 150) + '...',
                type: 'scholarship'
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-bold text-slate-800">About This {scholarship.type}</h2>
          <div className="mt-4 space-y-4 text-slate-600">
            {scholarship.description.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Application Instructions for Institution Portal */}
        {scholarship.applicationMethod === "institution_portal" && scholarship.applicationInstructions && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-xl font-bold text-slate-800">How to Apply</h2>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {scholarship.applicationInstructions}
              </p>
            </div>
          </div>
        )}

        {/* Application Section - Only show internal form if no external method is set */}
        {!scholarship.applicationMethod || scholarship.applicationMethod === "instructions_provided" ? (
          isCommunityMember && user ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8">
              <h2 className="text-xl font-bold text-slate-800">
                Apply for this {scholarship.type}
              </h2>

              {isExpired ? (
                <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-6 text-center">
                  <p className="text-lg font-semibold text-red-600">
                    Application period has ended
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    The deadline for this scholarship has passed.
                  </p>
                </div>
              ) : success ? (
                <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-6 text-center">
                  <p className="text-lg font-semibold text-green-600">
                    Application submitted successfully!
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Redirecting to your applications...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-800">
                      Education Background <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      required
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      rows={4}
                      placeholder="Describe your current education status, institution, program, year of study, GPA, etc."
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800">
                      Personal Statement / Essay <span className="text-red-600">*</span>
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      Share your goals, achievements, community involvement, and why you should be selected for this {scholarship.type.toLowerCase()}.
                    </p>
                    <textarea
                      required
                      value={essay}
                      onChange={(e) => setEssay(e.target.value)}
                      rows={10}
                      placeholder="Write your personal statement here..."
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-[#14B8A6] focus:outline-none"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </form>
              )}
            </div>
          ) : !user ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <h3 className="text-lg font-bold text-slate-800">
                Sign in to apply
              </h3>
              <p className="mt-2 text-slate-500">
                Create a community member account to apply for this {scholarship.type.toLowerCase()}.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/login"
                  className="rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-800 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500">
                Switch to a community member account to apply for scholarships.
              </p>
            </div>
          )
        ) : null}

        {/* Provider Information */}
        {scholarship.employerName && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Provided By
            </h3>
            <p className="mt-2 text-lg font-semibold text-slate-800">
              {scholarship.employerName}
            </p>
          </div>
        )}
      </div>
    </FeedLayout>
  );
}

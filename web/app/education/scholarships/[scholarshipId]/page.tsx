"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { useAuth } from "@/components/AuthProvider";
import { getScholarship, createScholarshipApplication, getMemberProfile } from "@/lib/firestore";
import type { Scholarship, MemberProfile } from "@/lib/types";

export default function ScholarshipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scholarshipId = params.scholarshipId as string;
  const { user, role } = useAuth();

  // Check if user is a community member (not employer/admin/moderator)
  const isCommunityMember = role !== null && role !== "employer" && role !== "admin" && role !== "moderator";

  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Application form state
  const [education, setEducation] = useState("");
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadScholarship = async () => {
      try {
        const data = await getScholarship(scholarshipId);
        if (data) {
          setScholarship(data);
        } else {
          setError("Scholarship not found");
        }
      } catch (err) {
        console.error("Failed to load scholarship", err);
        setError("Failed to load scholarship details");
      } finally {
        setLoading(false);
      }
    };
    loadScholarship();
  }, [scholarshipId]);

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

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <p className="text-slate-400">Loading scholarship details...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !scholarship) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Scholarship not found"}
          </h1>
          <Link
            href="/education/scholarships"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Back to Scholarships
          </Link>
        </div>
      </PageShell>
    );
  }

  const formatDeadline = (value: Scholarship["deadline"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value);
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
    <PageShell>
      <div className="mx-auto max-w-4xl py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span className="mx-2">→</span>
          <Link href="/education" className="hover:text-white transition-colors">
            Education
          </Link>
          <span className="mx-2">→</span>
          <Link href="/education/scholarships" className="hover:text-white transition-colors">
            Scholarships
          </Link>
          <span className="mx-2">→</span>
          <span className="text-white">{scholarship.title}</span>
        </nav>

        {/* Scholarship Header */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#14B8A6]">
              {scholarship.type}
            </span>
            <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300">
              {scholarship.level}
            </span>
            {scholarship.region && (
              <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300">
                {scholarship.region}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-50">{scholarship.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
            <div className="flex items-center gap-2 text-slate-300">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-semibold">{scholarship.provider}</span>
            </div>
          </div>

          {/* Amount and Deadline */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {scholarship.amount && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-base font-semibold text-emerald-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {scholarship.amount}
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

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-800">
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
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">About This {scholarship.type}</h2>
          <div className="mt-4 space-y-4 text-slate-300">
            {scholarship.description.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Application Section */}
        {isCommunityMember && user ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">
              Apply for this {scholarship.type}
            </h2>

            {success ? (
              <div className="mt-6 rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                <p className="text-lg font-semibold text-green-400">
                  Application submitted successfully!
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Redirecting to your applications...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Education Background <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    rows={4}
                    placeholder="Describe your current education status, institution, program, year of study, GPA, etc."
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Personal Statement / Essay <span className="text-red-400">*</span>
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    Share your goals, achievements, community involvement, and why you should be selected for this {scholarship.type.toLowerCase()}.
                  </p>
                  <textarea
                    required
                    value={essay}
                    onChange={(e) => setEssay(e.target.value)}
                    rows={10}
                    placeholder="Write your personal statement here..."
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8 text-center">
            <h3 className="text-lg font-bold text-slate-200">
              Sign in to apply
            </h3>
            <p className="mt-2 text-slate-400">
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
                className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8 text-center">
            <p className="text-slate-400">
              Switch to a community member account to apply for scholarships.
            </p>
          </div>
        )}

        {/* Provider Information */}
        {scholarship.employerName && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Provided By
            </h3>
            <p className="mt-2 text-lg font-semibold text-slate-200">
              {scholarship.employerName}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

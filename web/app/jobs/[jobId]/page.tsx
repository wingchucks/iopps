"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";
import ShareButtons from "@/components/ShareButtons";
import { getJobPosting, createJobApplication, getMemberProfile, getEmployerProfile } from "@/lib/firestore";
import type { JobPosting, MemberProfile, EmployerProfile } from "@/lib/types";
import QuickApplyButton from "@/components/QuickApplyButton";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const { user, role } = useAuth();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Application form state
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [useProfileCoverLetter, setUseProfileCoverLetter] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      try {
        const data = await getJobPosting(jobId);
        if (data) {
          setJob(data);
          // Load employer profile to show interview if available
          if (data.employerId) {
            try {
              const employer = await getEmployerProfile(data.employerId);
              if (employer) {
                setEmployerProfile(employer);
              }
            } catch (err) {
              console.error("Failed to load employer profile", err);
              // Don't set error - employer interview is optional
            }
          }
        } else {
          setError("Job not found");
        }
      } catch (err) {
        console.error("Failed to load job", err);
        setError("Failed to load job posting");
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [jobId]);

  // Load member profile for community members
  useEffect(() => {
    const loadProfile = async () => {
      if (user && role === "community") {
        try {
          const profile = await getMemberProfile(user.uid);
          if (profile) {
            setMemberProfile(profile);
            // Auto-populate resume if they have one saved
            if (profile.resumeUrl) {
              setResumeUrl(profile.resumeUrl);
              setUseProfileResume(true);
            }
            // Auto-populate cover letter if they have one saved
            if (profile.coverLetterTemplate) {
              setCoverLetter(profile.coverLetterTemplate);
              setUseProfileCoverLetter(true);
            }
          }
        } catch (err) {
          console.error("Failed to load member profile", err);
        }
      }
    };
    loadProfile();
  }, [user, role]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || role !== "community" || !job) return;

    setSubmitting(true);
    setError(null);

    try {
      await createJobApplication({
        jobId: job.id,
        employerId: job.employerId,
        memberId: user.uid,
        memberEmail: user.email || "",
        resumeUrl,
        coverLetter,
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
          <p className="text-slate-400">Loading job details...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !job) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Job not found"}
          </h1>
          <Link
            href="/jobs"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Back to Jobs
          </Link>
        </div>
      </PageShell>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return null;
    try {
      const date =
        timestamp.toDate?.() instanceof Date
          ? timestamp.toDate()
          : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const deadline = formatDate(job.closingDate);

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl py-8">
        {/* Back button */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#14B8A6]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to all jobs
        </Link>

        {/* Job Header */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h1 className="text-3xl font-bold text-slate-50">{job.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
            {job.employerName && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#14B8A6]/20 to-blue-500/20 text-sm font-bold text-[#14B8A6]">
                  {job.employerName.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-slate-300">
                  {job.employerName}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{job.location}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-sm font-semibold text-slate-300">
              {job.employmentType || "Job type"}
            </span>
            {job.remoteFlag && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-300">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Remote
              </span>
            )}
            {job.indigenousPreference && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1.5 text-sm font-medium text-[#14B8A6]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Indigenous preference
              </span>
            )}
            {job.salaryRange && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-1.5 text-sm font-medium text-slate-300">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {job.salaryRange}
              </span>
            )}
            {deadline && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Closes {deadline}
              </span>
            )}
          </div>

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <ShareButtons
              title={`${job.title} at ${job.employerName || 'IOPPS'}`}
              description={job.description?.substring(0, 150) + '...' || 'Check out this job opportunity on IOPPS'}
            />
          </div>
        </div>

        {/* Job Description */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">Job Description</h2>
          <div className="mt-4 space-y-4 text-slate-300">
            {job.description?.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {job.requirements && (
            <>
              <h3 className="mt-6 text-lg font-bold text-slate-200">
                Requirements
              </h3>
              <div className="mt-3 space-y-2 text-slate-300">
                {job.requirements.split("\n").map((req, i) => (
                  <p key={i} className="leading-relaxed">
                    {req}
                  </p>
                ))}
              </div>
            </>
          )}

          {job.benefits && (
            <>
              <h3 className="mt-6 text-lg font-bold text-slate-200">
                Benefits
              </h3>
              <div className="mt-3 space-y-2 text-slate-300">
                {job.benefits.split("\n").map((benefit, i) => (
                  <p key={i} className="leading-relaxed">
                    {benefit}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Employer Interview Section */}
        {employerProfile && (
          <div className="mt-6">
            <EmployerInterviewSection employer={employerProfile} />
          </div>
        )}

        {/* Application Section */}
        {role === "community" && user ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
            <h2 className="text-xl font-bold text-slate-200">
              Apply for this position
            </h2>

            {job.quickApplyEnabled && memberProfile && (
              <div className="mt-6 mb-8">
                <div className="flex flex-col items-center justify-center rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-6 text-center">
                  <h3 className="mb-2 text-lg font-semibold text-slate-200">
                    Fast Track Your Application
                  </h3>
                  <p className="mb-4 text-sm text-slate-400">
                    Use your profile to apply in seconds.
                  </p>
                  <QuickApplyButton job={job} memberProfile={memberProfile} />
                </div>
                <div className="relative mt-8">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#08090C] px-2 text-sm text-slate-500">
                      Or apply manually
                    </span>
                  </div>
                </div>
              </div>
            )}

            {success ? (
              <div className="mt-6 rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                <p className="text-lg font-semibold text-green-400">
                  ✓ Application submitted successfully!
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Redirecting to your applications...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-200">
                      Resume/CV <span className="text-red-400">*</span>
                    </label>
                    {memberProfile?.resumeUrl && !useProfileResume && (
                      <button
                        type="button"
                        onClick={() => {
                          setResumeUrl(memberProfile.resumeUrl!);
                          setUseProfileResume(true);
                        }}
                        className="text-xs text-[#14B8A6] hover:underline"
                      >
                        Use my profile resume
                      </button>
                    )}
                  </div>

                  {useProfileResume && memberProfile?.resumeUrl ? (
                    <div className="mt-2 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#14B8A6]">
                            Using resume from your profile
                          </p>
                          <a
                            href={memberProfile.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-xs text-slate-300 hover:text-[#14B8A6] hover:underline truncate"
                          >
                            {memberProfile.resumeUrl}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeUrl("");
                            setUseProfileResume(false);
                          }}
                          className="ml-4 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Use different resume
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="url"
                        required
                        value={resumeUrl}
                        onChange={(e) => {
                          setResumeUrl(e.target.value);
                          setUseProfileResume(false);
                        }}
                        placeholder="https://docs.google.com/document/... or https://drive.google.com/..."
                        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Provide a link to your resume (Google Drive, Dropbox, personal website, etc.)
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-200">
                      Cover Letter / Message <span className="text-red-400">*</span>
                    </label>
                    {memberProfile?.coverLetterTemplate && !useProfileCoverLetter && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverLetter(memberProfile.coverLetterTemplate!);
                          setUseProfileCoverLetter(true);
                        }}
                        className="text-xs text-[#14B8A6] hover:underline"
                      >
                        Use my profile cover letter
                      </button>
                    )}
                  </div>

                  {useProfileCoverLetter && memberProfile?.coverLetterTemplate ? (
                    <div className="mt-2 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#14B8A6]">
                            Using cover letter from your profile
                          </p>
                          <p className="mt-2 text-xs text-slate-300 line-clamp-3">
                            {memberProfile.coverLetterTemplate}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCoverLetter("");
                            setUseProfileCoverLetter(false);
                          }}
                          className="ml-4 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Write new
                        </button>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      required
                      value={coverLetter}
                      onChange={(e) => {
                        setCoverLetter(e.target.value);
                        setUseProfileCoverLetter(false);
                      }}
                      rows={8}
                      placeholder="Tell the employer why you're a great fit for this role..."
                      className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                    />
                  )}
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
              Create a community member account to apply for this position.
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
              Switch to a community member account to apply for jobs.
            </p>
          </div>
        )}

        {/* External Application Links */}
        {(job.applicationEmail || job.applicationLink) && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Alternative Application Methods
            </h3>
            <div className="mt-4 space-y-2">
              {job.applicationEmail && (
                <div className="flex items-center gap-2 text-slate-300">
                  <svg
                    className="h-5 w-5 text-[#14B8A6]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <a
                    href={`mailto:${job.applicationEmail}`}
                    className="hover:text-[#14B8A6] hover:underline"
                  >
                    {job.applicationEmail}
                  </a>
                </div>
              )}
              {job.applicationLink && (
                <div className="flex items-center gap-2 text-slate-300">
                  <svg
                    className="h-5 w-5 text-[#14B8A6]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <a
                    href={job.applicationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#14B8A6] hover:underline"
                  >
                    Apply on employer website
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

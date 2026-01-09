"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";
import JobVideoSection from "@/components/jobs/JobVideoSection";
import ShareButtons from "@/components/ShareButtons";
import { getMemberProfile, getEmployerProfile, incrementJobViews } from "@/lib/firestore";
import type { JobPosting, MemberProfile, EmployerProfile } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";
import QuickApplyButton from "@/components/QuickApplyButton";
import JobHeader from "@/components/jobs/JobHeader";
import JobSidebar from "@/components/jobs/JobSidebar";

interface JobDetailClientProps {
  job: JobPosting | null;
  error?: string;
}

export default function JobDetailClient({ job, error }: JobDetailClientProps) {
  const router = useRouter();
  const { user, role } = useAuth();

  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadEmployerProfile = async () => {
      if (job?.employerId) {
        try {
          const employer = await getEmployerProfile(job.employerId);
          if (employer) {
            setEmployerProfile(employer);
          }
        } catch (err) {
          console.error("Failed to load employer profile", err);
        }
      }
    };
    loadEmployerProfile();
  }, [job?.employerId]);

  // Track View (Once per mount)
  useEffect(() => {
    if (job?.id) {
      incrementJobViews(job.id).catch(err => console.error("Failed to track view", err));
    }
  }, [job?.id]);

  // Check if user is a community member (not employer/admin/moderator)
  const isCommunityMember = role !== null && role !== "employer" && role !== "admin" && role !== "moderator";

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

  if (error || !job) {
    const isExpired = error?.toLowerCase().includes("expired");
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-slate-800 p-6 mb-6">
            <svg
              className="h-12 w-12 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isExpired ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-200">
            {isExpired ? "Job No Longer Available" : "Job Not Found"}
          </h1>
          <p className="mt-3 text-slate-400 max-w-md mx-auto">
            {isExpired
              ? "This job posting has expired or is no longer accepting applications. Check out other opportunities below."
              : "Sorry, we couldn't find the job you're looking for. It may have been removed or the link is incorrect."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/careers/jobs"
              className="rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
            >
              Browse All Jobs
            </Link>
            <Link
              href="/careers"
              className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              Back to Careers
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return null;
    try {
      // Handle serialized Firestore timestamps
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <JobHeader job={job} employerId={job.employerId} />

        {/* Share Section */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#08090C] p-4">
          <ShareButtons
            item={{
              id: job.id,
              title: `${job.title} at ${job.employerName || 'Company'}`,
              description: job.description?.substring(0, 150) + '...',
              type: 'job'
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-200">Job Description</h2>
              <div
                className="mt-4 prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-slate-200 prose-strong:text-slate-200 prose-ul:text-slate-300 prose-li:text-slate-300"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description || '') }}
              />

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-200">
                    Responsibilities
                  </h3>
                  <ul className="mt-3 space-y-2 text-slate-300">
                    {job.responsibilities.map((item, i) => (
                      <li key={i} className="leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#14B8A6]"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Qualifications */}
              {job.qualifications && job.qualifications.length > 0 && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-200">
                    Qualifications
                  </h3>
                  <ul className="mt-3 space-y-2 text-slate-300">
                    {job.qualifications.map((item, i) => (
                      <li key={i} className="leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {job.requirements && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-200">
                    Requirements
                  </h3>
                  <div className="mt-3 space-y-2 text-slate-300">
                    {job.requirements.split("\n").map((req, i) => (
                      <p key={i} className="leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#14B8A6]"></span>
                        <span>{req}</span>
                      </p>
                    ))}
                  </div>
                </>
              )}

              {job.benefits && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-200">
                    Benefits
                  </h3>
                  <div className="mt-3 space-y-2 text-slate-300">
                    {job.benefits.split("\n").map((benefit, i) => (
                      <p key={i} className="leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"></span>
                        <span>{benefit}</span>
                      </p>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Job-Specific Video */}
            {job.jobVideo && (
              <div className="mt-8">
                <JobVideoSection video={job.jobVideo} jobTitle={job.title} />
              </div>
            )}

            {/* Employer Interview Section */}
            {employerProfile && employerProfile.interviews && employerProfile.interviews.length > 0 && (
              <div className="mt-8">
                <EmployerInterviewSection employer={employerProfile} />
              </div>
            )}

            {/* Application Section */}
            {isCommunityMember && user ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8" id="apply">
                <h2 className="text-xl font-bold text-slate-200 text-center mb-6">
                  Apply for this position
                </h2>

                {success ? (
                  <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                    <p className="text-lg font-semibold text-green-400">
                      Application submitted successfully!
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Redirecting to your applications...
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <QuickApplyButton job={job} memberProfile={memberProfile ?? undefined} />
                  </div>
                )}
              </div>
            ) : !user ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 text-center" id="apply">
                <h3 className="text-lg font-bold text-slate-200">
                  Sign in to apply
                </h3>
                <p className="mt-2 text-slate-400">
                  Create a community member account to apply for this position.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-[#14B8A6] px-6 py-3.5 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8] text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-lg border border-slate-700 px-6 py-3.5 font-semibold text-slate-200 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6] text-center"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            ) : role === 'employer' ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-200">Employer View</h3>
                <p className="mt-2 text-slate-400">
                  You are viewing this content as an Organization. <br />
                  Switch to a personal "Community Member" account to apply.
                </p>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8 text-center">
                <p className="text-slate-400">
                  Switch to a community member account to apply for jobs.
                </p>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <JobSidebar job={job} employerProfile={employerProfile} />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

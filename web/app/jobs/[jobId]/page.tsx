"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";
import JobVideoSection from "@/components/jobs/JobVideoSection";
import ShareButtons from "@/components/ShareButtons";
import { getJobPosting, getMemberProfile, getEmployerProfile, incrementJobViews } from "@/lib/firestore";
import type { JobPosting, MemberProfile, EmployerProfile } from "@/lib/types";
import QuickApplyButton from "@/components/QuickApplyButton";
import JobHeader from "@/components/jobs/JobHeader";
import JobSidebar from "@/components/jobs/JobSidebar";

function formatSalaryRange(salaryRange: JobPosting["salaryRange"]): string {
  if (!salaryRange) return "";
  if (typeof salaryRange === "string") return salaryRange;
  if (!salaryRange.disclosed) return "";

  const { min, max, currency = "CAD" } = salaryRange;
  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
  }
  if (min) return `$${min.toLocaleString()}+ ${currency}`;
  if (max) return `Up to $${max.toLocaleString()} ${currency}`;
  return "";
}

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
  const [success, setSuccess] = useState(false);

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

  // Track View (Once per mount)
  useEffect(() => {
    if (jobId) {
      // Simple distinct view check using session storage could be added here
      // For now, just increment on load
      incrementJobViews(jobId).catch(err => console.error("Failed to track view", err));
    }
  }, [jobId]);

  // Load member profile for community members
  useEffect(() => {
    const loadProfile = async () => {
      if (user && role === "community") {
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
  }, [user, role]);

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <JobHeader job={job} />

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
              <div className="mt-4 space-y-4 text-slate-300">
                {job.description?.split("\n").map((paragraph, i) => (
                  <p key={i} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

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
            {role === "community" && user ? (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8" id="apply">
                <h2 className="text-xl font-bold text-slate-200 text-center mb-6">
                  Apply for this position
                </h2>

                {success ? (
                  <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                    <p className="text-lg font-semibold text-green-400">
                      ✓ Application submitted successfully!
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      Redirecting to your applications...
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <QuickApplyButton job={job} memberProfile={memberProfile} />
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

              {/* Mobile Apply Button (only visible on small screens if needed, but we have one in main content) */}
              {/* We can add a sticky bottom bar for mobile later if requested */}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

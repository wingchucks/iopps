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

  if (error || !job) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Job not found"}
          </h1>
          <Link
            href="/jobs-training/jobs"
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
                dangerouslySetInnerHTML={{ __html: job.description || '' }}
              />

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

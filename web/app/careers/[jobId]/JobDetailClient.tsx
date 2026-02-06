"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { FeedLayout } from "@/components/opportunity-graph";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";
import JobVideoSection from "@/components/jobs/JobVideoSection";
import ShareButtons from "@/components/ShareButtons";
import { getMemberProfile, getEmployerProfile, incrementJobViews, toggleSavedJob, isJobSaved } from "@/lib/firestore";
import type { JobPosting, MemberProfile, EmployerProfile } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";
import QuickApplyButton from "@/components/QuickApplyButton";
import JobHeader from "@/components/jobs/JobHeader";
import JobSidebar from "@/components/jobs/JobSidebar";
import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";

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
  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);

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

  useEffect(() => {
    if (job?.id) {
      incrementJobViews(job.id).catch(err => console.error("Failed to track view", err));
    }
  }, [job?.id]);

  const isCommunityMember = role !== null && role !== "employer" && role !== "admin" && role !== "moderator";

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

  useEffect(() => {
    if (user && job?.id) {
      isJobSaved(user.uid, job.id).then(setIsSaved).catch(console.error);
    }
  }, [user, job?.id]);

  const handleToggleSave = async () => {
    if (!job) return;
    if (!user) {
      router.push(`/login?redirect=/careers/${job.id}`);
      return;
    }
    setSavingJob(true);
    try {
      await toggleSavedJob(user.uid, job.id, !isSaved);
      setIsSaved(!isSaved);
      toast.success(isSaved ? "Job removed from saved" : "Job saved!");
    } catch (err) {
      console.error("Failed to toggle save:", err);
      toast.error("Failed to save job. Please try again.");
    } finally {
      setSavingJob(false);
    }
  };

  if (error || !job) {
    const isExpired = error?.toLowerCase().includes("expired");
    return (
      <FeedLayout activeNav="careers" fullWidth>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-slate-100 p-6 mb-6">
            <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isExpired ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isExpired ? "Job No Longer Available" : "Job Not Found"}
          </h1>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">
            {isExpired
              ? "This job posting has expired or is no longer accepting applications."
              : "Sorry, we couldn't find the job you're looking for."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/careers/jobs" className="rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]">
              Browse All Jobs
            </Link>
            <Link href="/careers" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-[#0D9488] hover:text-[#0D9488]">
              Back to Careers
            </Link>
          </div>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout activeNav="careers" fullWidth>
      <div className="mx-auto max-w-7xl py-8">
        <JobHeader job={job} employerId={job.employerId} />

        {/* Share & Save */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <ShareButtons
              item={{ id: job.id, title: `${job.title} at ${job.employerName || 'Company'}`, description: job.description?.substring(0, 150) + '...', type: 'job' }}
            />
            <button
              onClick={handleToggleSave}
              disabled={savingJob}
              aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all ${
                isSaved
                  ? "bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-300"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {savingJob ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : isSaved ? (
                <HeartSolidIcon className="h-5 w-5" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">Job Description</h2>
              <div
                className="mt-4 prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:text-slate-800 prose-strong:text-slate-800 prose-ul:text-slate-600 prose-li:text-slate-600"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description || '') }}
              />

              {job.responsibilities && job.responsibilities.length > 0 && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-800">Responsibilities</h3>
                  <ul className="mt-3 space-y-2 text-slate-600">
                    {job.responsibilities.map((item, i) => (
                      <li key={i} className="leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0D9488]"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {job.qualifications && job.qualifications.length > 0 && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-800">Qualifications</h3>
                  <ul className="mt-3 space-y-2 text-slate-600">
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
                  <h3 className="mt-8 text-lg font-bold text-slate-800">Requirements</h3>
                  <div className="mt-3 space-y-2 text-slate-600">
                    {job.requirements.split("\n").map((req, i) => (
                      <p key={i} className="leading-relaxed flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0D9488]"></span>
                        <span>{req}</span>
                      </p>
                    ))}
                  </div>
                </>
              )}

              {job.benefits && (
                <>
                  <h3 className="mt-8 text-lg font-bold text-slate-800">Benefits</h3>
                  <div className="mt-3 space-y-2 text-slate-600">
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

            {job.jobVideo && (
              <div className="mt-8">
                <JobVideoSection video={job.jobVideo} jobTitle={job.title} />
              </div>
            )}

            {employerProfile && employerProfile.interviews && employerProfile.interviews.length > 0 && (
              <div className="mt-8">
                <EmployerInterviewSection employer={employerProfile} />
              </div>
            )}

            {/* Application Section */}
            {job.applicationLink ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm" id="apply">
                <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Apply for this position</h2>
                <div className="text-center">
                  <a
                    href={job.applicationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#0D9488] px-8 py-4 font-semibold text-white transition-all hover:bg-[#0F766E] hover:scale-[1.02]"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Apply on {job.employerName || "Employer"}&apos;s Website
                  </a>
                  <p className="mt-4 text-sm text-slate-500">You will be redirected to the employer&apos;s website to complete your application.</p>
                </div>
              </div>
            ) : isCommunityMember && user ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm" id="apply">
                <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Apply for this position</h2>
                {success ? (
                  <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-center">
                    <p className="text-lg font-semibold text-green-700">Application submitted successfully!</p>
                    <p className="mt-2 text-sm text-slate-600">Redirecting to your applications...</p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <QuickApplyButton job={job} memberProfile={memberProfile ?? undefined} />
                  </div>
                )}
              </div>
            ) : !user ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center" id="apply">
                <h3 className="text-lg font-bold text-slate-800">Sign in to apply</h3>
                <p className="mt-2 text-slate-500">Create a community member account to apply for this position.</p>
                <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                  <Link href="/login" className="rounded-lg bg-[#0D9488] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#0F766E] text-center">Sign In</Link>
                  <Link href="/register" className="rounded-lg border border-slate-300 px-6 py-3.5 font-semibold text-slate-700 transition-colors hover:border-[#0D9488] hover:text-[#0D9488] text-center">Create Account</Link>
                </div>
              </div>
            ) : role === 'employer' ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Employer View</h3>
                <p className="mt-2 text-slate-500">You are viewing this as an Organization. Switch to a &quot;Community Member&quot; account to apply.</p>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center">
                <p className="text-slate-500">Switch to a community member account to apply for jobs.</p>
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
    </FeedLayout>
  );
}

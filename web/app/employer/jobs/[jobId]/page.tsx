"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getJobPosting, listJobApplications } from "@/lib/firestore";
import { JobPosting, JobApplication } from "@/lib/types";

export default function EmployerJobDetailPage({ params }: { params: { jobId: string } }) {
  const { user, role, loading } = useAuth();
  const { jobId } = params;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingJob, setLoadingJob] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobAndApplications() {
      if (!user || role !== "employer") {
        setLoadingJob(false);
        return;
      }

      try {
        const jobData = await getJobPosting(jobId);

        if (!jobData) {
          setError("Job not found");
          setLoadingJob(false);
          return;
        }

        // Verify this employer owns this job
        if (jobData.employerId !== user.uid) {
          setError("You don't have permission to view this job");
          setLoadingJob(false);
          return;
        }

        setJob(jobData);

        // Load applications for this job
        const apps = await listJobApplications(jobId);
        setApplications(apps);
      } catch (err) {
        console.error("Error loading job:", err);
        setError("Failed to load job data");
      } finally {
        setLoadingJob(false);
      }
    }

    loadJobAndApplications();
  }, [jobId, user, role]);

  if (loading || loadingJob) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="text-sm text-slate-300">
          Please sign in as an employer to view job details.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-red-400">
          {error || "Job not found"}
        </h1>
        <Link
          href="/employer/jobs"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <Link
            href="/employer/jobs"
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-300 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to jobs
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              {job.title}
            </h1>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${job.active
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-slate-700/50 text-slate-400"
                }`}
            >
              {job.active ? "Active" : "Inactive"}
            </span>
            {job.featured && (
              <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                Featured
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            {job.location} • {job.employmentType}
          </p>
        </div>
        <Link
          href={`/employer/jobs/${jobId}/edit`}
          className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Edit Job
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Views</p>
          <p className="text-2xl font-semibold text-slate-50 mt-1">
            {job.viewsCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Applications</p>
          <p className="text-2xl font-semibold text-slate-50 mt-1">
            {job.applicationsCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Payment Status</p>
          <p className={`text-sm font-semibold mt-1 ${job.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"
            }`}>
            {job.paymentStatus === "paid" ? "Paid" : job.paymentStatus || "Unknown"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Expires</p>
          <p className="text-sm font-semibold text-slate-50 mt-1">
            {job.expiresAt
              ? typeof (job.expiresAt as any).toDate === "function"
                ? (job.expiresAt as any).toDate().toLocaleDateString()
                : new Date(job.expiresAt as any).toLocaleDateString()
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Job Description</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">Responsibilities</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((item, index) => (
                  <li key={index} className="flex items-start text-sm text-slate-300">
                    <span className="text-[#14B8A6] mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.qualifications && job.qualifications.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">Qualifications</h2>
              <ul className="space-y-2">
                {job.qualifications.map((item, index) => (
                  <li key={index} className="flex items-start text-sm text-slate-300">
                    <span className="text-[#14B8A6] mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Applications List */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">
              Applications ({applications.length})
            </h2>
            {applications.length === 0 ? (
              <p className="text-sm text-slate-400">No applications yet</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {app.applicantName || "Anonymous"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Applied {app.appliedAt?.toDate().toLocaleDateString() || "Unknown"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${app.status === "pending"
                        ? "bg-amber-500/10 text-amber-400"
                        : app.status === "reviewing"
                          ? "bg-blue-500/10 text-blue-400"
                          : app.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-700/50 text-slate-400"
                        }`}
                    >
                      {app.status || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Job Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-slate-400">Employment Type</dt>
                <dd className="text-sm text-slate-200 mt-1">{job.employmentType}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Location</dt>
                <dd className="text-sm text-slate-200 mt-1">{job.location}</dd>
              </div>
              {job.salaryRange && (
                <div>
                  <dt className="text-xs text-slate-400">Salary Range</dt>
                  <dd className="text-sm text-slate-200 mt-1">{job.salaryRange}</dd>
                </div>
              )}
              {job.closingDate && (
                <div>
                  <dt className="text-xs text-slate-400">Application Deadline</dt>
                  <dd className="text-sm text-slate-200 mt-1">{job.closingDate}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-400">Posted Date</dt>
                <dd className="text-sm text-slate-200 mt-1">
                  {job.createdAt?.toDate().toLocaleDateString() || "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Features
            </h2>
            <div className="space-y-2">
              {job.remoteFlag && (
                <div className="flex items-center text-sm text-slate-300">
                  <svg className="w-4 h-4 mr-2 text-[#14B8A6]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Remote Friendly
                </div>
              )}
              {job.indigenousPreference && (
                <div className="flex items-center text-sm text-slate-300">
                  <svg className="w-4 h-4 mr-2 text-[#14B8A6]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Indigenous Preference
                </div>
              )}
              {job.quickApplyEnabled && (
                <div className="flex items-center text-sm text-slate-300">
                  <svg className="w-4 h-4 mr-2 text-[#14B8A6]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Quick Apply Enabled
                </div>
              )}
            </div>
          </div>

          {(job.applicationLink || job.applicationEmail) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Application Methods
              </h2>
              <div className="space-y-2">
                {job.applicationLink && (
                  <div>
                    <dt className="text-xs text-slate-400 mb-1">Application Link</dt>
                    <dd>
                      <a
                        href={job.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#14B8A6] hover:underline break-all"
                      >
                        {job.applicationLink}
                      </a>
                    </dd>
                  </div>
                )}
                {job.applicationEmail && (
                  <div>
                    <dt className="text-xs text-slate-400 mb-1">Application Email</dt>
                    <dd>
                      <a
                        href={`mailto:${job.applicationEmail}`}
                        className="text-sm text-[#14B8A6] hover:underline"
                      >
                        {job.applicationEmail}
                      </a>
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

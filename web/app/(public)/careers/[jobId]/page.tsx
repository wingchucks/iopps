"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
} from "@/components/ui";
import type { JobPosting } from "@/lib/firestore/jobs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" }> = {
  "Full-time": { label: "Full-time", variant: "info" },
  "Part-time": { label: "Part-time", variant: "warning" },
  Contract: { label: "Contract", variant: "default" },
  Internship: { label: "Internship", variant: "success" },
  Casual: { label: "Casual", variant: "default" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Firestore timestamp-like value to a formatted date string. */
function formatDate(timestamp: unknown): string {
  if (!timestamp) return "";

  let date: Date | null = null;

  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else if (typeof timestamp === "object" && timestamp !== null) {
    const ts = timestamp as Record<string, unknown>;
    if (typeof ts._seconds === "number") {
      date = new Date(ts._seconds * 1000);
    } else if (typeof ts.seconds === "number") {
      date = new Date((ts.seconds as number) * 1000);
    }
  }

  if (!date || isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format salary range for display. */
function formatSalaryRange(salary: JobPosting["salaryRange"]): string {
  if (!salary) return "";
  if (typeof salary === "string") return salary;
  if (salary.disclosed === false) return "";

  const { min, max, period } = salary;
  const currency = salary.currency || "CAD";
  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const periodLabel = period ? `/${period}` : "/year";

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}${periodLabel}`;
  }
  if (min) return `From ${formatter.format(min)}${periodLabel}`;
  if (max) return `Up to ${formatter.format(max)}${periodLabel}`;
  return "";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JobDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-24" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton variant="rectangular" className="h-64 w-full" />
            <Skeleton variant="rectangular" className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton variant="rectangular" className="h-48 w-full" />
            <Skeleton variant="rectangular" className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

interface JobApiResponse {
  job: JobPosting;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);

  // Fetch job data
  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Job not found");
          } else {
            setError("Failed to load job");
          }
          return;
        }
        const data: JobApiResponse = await res.json();
        setJob(data.job);
      } catch (err) {
        console.error("Failed to fetch job:", err);
        setError("Failed to load job");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobId]);

  // Check if job is saved by the current user
  useEffect(() => {
    if (!user || !job) return;

    async function checkSaved() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/member/saved-jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const savedJobs = data.savedJobs as Array<{ jobId: string }>;
        setIsSaved(savedJobs.some((s) => s.jobId === jobId));
      } catch (err) {
        console.error("Failed to check saved status:", err);
      }
    }
    checkSaved();
  }, [user, job, jobId]);

  const handleToggleSave = async () => {
    if (!user) {
      router.push(`/login?redirect=/careers/${jobId}`);
      return;
    }

    setSavingJob(true);
    try {
      const token = await user.getIdToken();
      const method = isSaved ? "DELETE" : "POST";
      const res = await fetch("/api/member/saved-jobs", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      if (res.ok) {
        setIsSaved(!isSaved);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setSavingJob(false);
    }
  };

  if (loading) {
    return <JobDetailSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface">
            <svg
              className="h-10 w-10 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {error || "Job Not Found"}
          </h1>
          <p className="mt-3 text-text-secondary">
            This job posting may have been removed or is no longer available.
          </p>
          <div className="mt-8">
            <Button href="/careers">Browse All Jobs</Button>
          </div>
        </div>
      </div>
    );
  }

  const companyName = job.employerName || job.companyName || "Company";
  const salary = formatSalaryRange(job.salaryRange);
  const postedDate = formatDate(job.createdAt);
  const closingDate = formatDate(job.closingDate);
  const badgeInfo = STATUS_BADGE_MAP[job.employmentType] || {
    label: job.employmentType,
    variant: "default" as const,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/careers"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Careers
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job header */}
            <div>
              <div className="flex items-start gap-4">
                {job.companyLogoUrl ? (
                  <img
                    src={job.companyLogoUrl}
                    alt={`${companyName} logo`}
                    className="h-14 w-14 rounded-lg border border-card-border object-contain bg-surface"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-card-border bg-surface text-xl font-bold text-text-muted">
                    {companyName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                    {job.title}
                  </h1>
                  <p className="mt-1 text-lg text-text-secondary">{companyName}</p>
                </div>
              </div>

              {/* Badges row */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {job.employmentType && (
                  <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                )}
                {job.location && <Badge variant="info">{job.location}</Badge>}
                {job.remoteFlag && <Badge variant="success">Remote</Badge>}
                {job.locationType && job.locationType !== "onsite" && (
                  <Badge variant="success">
                    {job.locationType === "hybrid" ? "Hybrid" : "Remote"}
                  </Badge>
                )}
                {job.indigenousPreference && (
                  <Badge variant="warning">Indigenous Preference</Badge>
                )}
                {job.willTrain && <Badge variant="info">Will Train</Badge>}
                {job.cpicRequired && <Badge variant="default">CPIC Required</Badge>}
                {job.driversLicense && (
                  <Badge variant="default">Driver&apos;s License Required</Badge>
                )}
              </div>

              {/* Salary and date info */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-muted">
                {salary && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {salary}
                  </span>
                )}
                {postedDate && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Posted {postedDate}
                  </span>
                )}
                {closingDate && (
                  <span className="flex items-center gap-1.5 text-warning">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Closes {closingDate}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button href={`/careers/${jobId}/apply`} size="lg">
                Apply Now
              </Button>

              <Button
                variant={isSaved ? "outline" : "secondary"}
                size="lg"
                onClick={handleToggleSave}
                loading={savingJob}
                disabled={savingJob}
              >
                <svg
                  className="h-5 w-5"
                  fill={isSaved ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
                {isSaved ? "Saved" : "Save Job"}
              </Button>
            </div>

            {/* Job Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-text-primary">
                  Job Description
                </h2>
                <div
                  className="mt-4 prose prose-sm max-w-none text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary prose-ul:text-text-secondary prose-li:text-text-secondary prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: job.description || "" }}
                />
              </CardContent>
            </Card>

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-text-primary">
                    Responsibilities
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {job.responsibilities.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Qualifications */}
            {job.qualifications && job.qualifications.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-text-primary">
                    Qualifications
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {job.qualifications.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-info" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {job.requirements && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-text-primary">
                    Requirements
                  </h2>
                  <div className="mt-3 space-y-2">
                    {job.requirements.split("\n").filter(Boolean).map((req, i) => (
                      <p
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                        <span>{req}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-text-primary">
                    Benefits
                  </h2>
                  <div className="mt-3 space-y-2">
                    {job.benefits.split("\n").filter(Boolean).map((benefit, i) => (
                      <p
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary leading-relaxed"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" />
                        <span>{benefit}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              {/* Company Info Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    About the Company
                  </h3>
                  <div className="mt-4 flex items-center gap-3">
                    {job.companyLogoUrl ? (
                      <img
                        src={job.companyLogoUrl}
                        alt={`${companyName} logo`}
                        className="h-10 w-10 rounded-lg border border-card-border object-contain bg-surface"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-surface text-sm font-bold text-text-muted">
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-text-primary">{companyName}</p>
                      {job.location && (
                        <p className="text-sm text-text-muted">{job.location}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Job Details Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Job Details
                  </h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    {job.employmentType && (
                      <div>
                        <dt className="text-text-muted">Type</dt>
                        <dd className="mt-0.5 font-medium text-text-primary">
                          {job.employmentType}
                        </dd>
                      </div>
                    )}
                    {job.location && (
                      <div>
                        <dt className="text-text-muted">Location</dt>
                        <dd className="mt-0.5 font-medium text-text-primary">
                          {job.location}
                        </dd>
                      </div>
                    )}
                    {salary && (
                      <div>
                        <dt className="text-text-muted">Salary</dt>
                        <dd className="mt-0.5 font-medium text-text-primary">
                          {salary}
                        </dd>
                      </div>
                    )}
                    {job.category && (
                      <div>
                        <dt className="text-text-muted">Category</dt>
                        <dd className="mt-0.5 font-medium text-text-primary">
                          {job.category}
                        </dd>
                      </div>
                    )}
                    {postedDate && (
                      <div>
                        <dt className="text-text-muted">Posted</dt>
                        <dd className="mt-0.5 font-medium text-text-primary">
                          {postedDate}
                        </dd>
                      </div>
                    )}
                    {closingDate && (
                      <div>
                        <dt className="text-text-muted">Closes</dt>
                        <dd className="mt-0.5 font-medium text-warning">
                          {closingDate}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Quick Apply Card */}
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-text-secondary">
                    Interested in this position?
                  </p>
                  <div className="mt-4">
                    <Button href={`/careers/${jobId}/apply`} fullWidth>
                      Apply Now
                    </Button>
                  </div>
                  <button
                    onClick={handleToggleSave}
                    disabled={savingJob}
                    className="mt-3 text-sm text-text-muted hover:text-accent transition-colors disabled:opacity-50"
                  >
                    {savingJob
                      ? "Saving..."
                      : isSaved
                        ? "Remove from Saved"
                        : "Save for Later"}
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

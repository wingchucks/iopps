"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
  EmptyState,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedJobData {
  id: string;
  title?: string;
  employerName?: string;
  companyName?: string;
  location?: string;
  employmentType?: string;
  remoteFlag?: boolean;
  companyLogoUrl?: string;
  salaryRange?:
    | {
        min?: number;
        max?: number;
        currency?: string;
        period?: string;
        disclosed?: boolean;
      }
    | string;
  createdAt?: unknown;
}

interface SavedJobEntry {
  id: string;
  jobId: string;
  memberId: string;
  createdAt?: unknown;
  job?: SavedJobData | null;
}

interface SavedJobsApiResponse {
  savedJobs: SavedJobEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSalaryRange(
  salary: SavedJobData["salaryRange"],
): string {
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

function SavedJobCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton variant="rectangular" className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SavedJobCard({
  entry,
  onUnsave,
  unsaving,
}: {
  entry: SavedJobEntry;
  onUnsave: (jobId: string) => void;
  unsaving: boolean;
}) {
  const job = entry.job;

  // If the job data was not resolved, show a minimal fallback
  if (!job) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">
                Job no longer available
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnsave(entry.jobId)}
              loading={unsaving}
              disabled={unsaving}
            >
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const companyName = job.employerName || job.companyName || "Company";
  const salary = formatSalaryRange(job.salaryRange);

  return (
    <Card className="transition-all duration-200 hover:border-accent/40 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Company logo or fallback */}
          {job.companyLogoUrl ? (
            <img
              src={job.companyLogoUrl}
              alt={`${companyName} logo`}
              className="h-12 w-12 rounded-lg border border-card-border object-contain bg-surface"
              loading="lazy"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-card-border bg-surface text-lg font-bold text-text-muted">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <Link
              href={`/careers/${entry.jobId}`}
              className="text-base font-semibold text-text-primary hover:text-accent transition-colors truncate block"
            >
              {job.title || "Untitled Job"}
            </Link>
            <p className="mt-0.5 text-sm text-text-secondary truncate">
              {companyName}
            </p>

            {/* Metadata row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {job.employmentType && (
                <Badge>{job.employmentType}</Badge>
              )}
              {job.location && (
                <Badge variant="info">{job.location}</Badge>
              )}
              {job.remoteFlag && (
                <Badge variant="success">Remote</Badge>
              )}
            </div>

            {/* Salary */}
            {salary && (
              <p className="mt-2 text-xs text-text-muted">{salary}</p>
            )}
          </div>

          {/* Unsave button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnsave(entry.jobId)}
            loading={unsaving}
            disabled={unsaving}
            className="flex-shrink-0"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={0}
            >
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Unsave
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inner Content
// ---------------------------------------------------------------------------

function SavedJobsContent() {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJobEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsavingJobId, setUnsavingJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchSavedJobs() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/member/saved-jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data: SavedJobsApiResponse = await res.json();
        setSavedJobs(data.savedJobs);
      } catch (err) {
        console.error("Failed to fetch saved jobs:", err);
        setError("Unable to load your saved jobs right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchSavedJobs();
  }, [user]);

  const handleUnsave = async (jobId: string) => {
    if (!user) return;

    setUnsavingJobId(jobId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/member/saved-jobs", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      if (res.ok) {
        setSavedJobs((prev) => prev.filter((s) => s.jobId !== jobId));
      }
    } catch (err) {
      console.error("Failed to unsave job:", err);
    } finally {
      setUnsavingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/member/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Dashboard
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Saved Jobs</h1>
          <p className="mt-2 text-text-secondary">
            Jobs you have saved for later.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border border-error/30 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SavedJobCardSkeleton key={i} />
            ))}
          </div>
        ) : savedJobs.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
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
            }
            title="No saved jobs"
            description="Save jobs you are interested in to easily find them later."
            action={
              <Button href="/careers">Browse Jobs</Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {savedJobs.length} saved job
              {savedJobs.length !== 1 ? "s" : ""}
            </p>
            {savedJobs.map((entry) => (
              <SavedJobCard
                key={entry.id}
                entry={entry}
                onUnsave={handleUnsave}
                unsaving={unsavingJobId === entry.jobId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function SavedJobsPage() {
  return (
    <ProtectedRoute>
      <SavedJobsContent />
    </ProtectedRoute>
  );
}

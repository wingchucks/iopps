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
import type { ApplicationStatus } from "@/lib/firestore/applications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicationItem {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  jobTitle?: string;
  memberDisplayName?: string;
  memberEmail?: string;
  resumeUrl?: string;
  coverLetter?: string;
  note?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface ApplicationsApiResponse {
  applications: ApplicationItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "info" }
> = {
  submitted: { label: "Submitted", variant: "info" },
  reviewed: { label: "Reviewed", variant: "warning" },
  shortlisted: { label: "Shortlisted", variant: "success" },
  interviewing: { label: "Interviewing", variant: "info" },
  offered: { label: "Offered", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
  hired: { label: "Hired", variant: "success" },
  withdrawn: { label: "Withdrawn", variant: "default" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Firestore timestamp-like value to a human-readable date. */
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
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ApplicationCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationCard({ application }: { application: ApplicationItem }) {
  const statusConfig = STATUS_BADGE_CONFIG[application.status] || {
    label: application.status,
    variant: "default" as const,
  };

  const appliedDate = formatDate(application.createdAt);

  return (
    <Link href={`/careers/${application.jobId}`} className="block group">
      <Card className="transition-all duration-200 hover:border-accent/40 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                {application.jobTitle || "Job Application"}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                {appliedDate && <span>Applied {appliedDate}</span>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <svg
                className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Inner Content
// ---------------------------------------------------------------------------

function ApplicationsContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchApplications() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/member/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data: ApplicationsApiResponse = await res.json();
        setApplications(data.applications);
      } catch (err) {
        console.error("Failed to fetch applications:", err);
        setError("Unable to load your applications right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [user]);

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
          <h1 className="text-3xl font-bold text-text-primary">
            My Applications
          </h1>
          <p className="mt-2 text-text-secondary">
            Track the status of all your job applications.
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
            {Array.from({ length: 5 }).map((_, i) => (
              <ApplicationCardSkeleton key={i} />
            ))}
          </div>
        ) : applications.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            title="No applications yet"
            description="Start applying to jobs to track your progress here."
            action={
              <Button href="/careers">Browse Jobs</Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {applications.length} application
              {applications.length !== 1 ? "s" : ""}
            </p>
            {applications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
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

export default function MyApplicationsPage() {
  return (
    <ProtectedRoute>
      <ApplicationsContent />
    </ProtectedRoute>
  );
}

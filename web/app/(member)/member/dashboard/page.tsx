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
  createdAt?: unknown;
}

interface SavedJobEntry {
  id: string;
  jobId: string;
  job?: Record<string, unknown> | null;
}

interface ApplicationsApiResponse {
  applications: ApplicationItem[];
}

interface SavedJobsApiResponse {
  savedJobs: SavedJobEntry[];
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

const RECENT_APPLICATIONS_LIMIT = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  loading: isLoading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
            {icon}
          </div>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-sm text-text-muted">{label}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentApplicationSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner Content
// ---------------------------------------------------------------------------

function DashboardContent() {
  const { user, userProfile } = useAuth();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Fetch applications
  useEffect(() => {
    if (!user) return;

    async function fetchApplications() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/member/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data: ApplicationsApiResponse = await res.json();
        setApplications(data.applications);
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoadingApps(false);
      }
    }

    fetchApplications();
  }, [user]);

  // Fetch saved jobs count
  useEffect(() => {
    if (!user) return;

    async function fetchSavedJobs() {
      try {
        const token = await user!.getIdToken();
        const res = await fetch("/api/member/saved-jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data: SavedJobsApiResponse = await res.json();
        setSavedJobsCount(data.savedJobs.length);
      } catch (err) {
        console.error("Failed to fetch saved jobs:", err);
      } finally {
        setLoadingSaved(false);
      }
    }

    fetchSavedJobs();
  }, [user]);

  const recentApplications = applications.slice(0, RECENT_APPLICATIONS_LIMIT);
  const displayName =
    userProfile?.displayName || user?.displayName || "Member";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 text-text-secondary">
            Here is an overview of your activity.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Applications"
            value={applications.length}
            loading={loadingApps}
            icon={
              <svg
                className="h-6 w-6"
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
          />
          <StatCard
            label="Saved Jobs"
            value={savedJobsCount}
            loading={loadingSaved}
            icon={
              <svg
                className="h-6 w-6"
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
          />
        </div>

        {/* Recent Applications */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Recent Applications
              </h2>
              {applications.length > 0 && (
                <Link
                  href="/member/applications"
                  className="text-sm text-accent hover:underline"
                >
                  View all
                </Link>
              )}
            </div>

            {loadingApps ? (
              <div className="divide-y divide-card-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <RecentApplicationSkeleton key={i} />
                ))}
              </div>
            ) : recentApplications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  No applications yet. Start exploring opportunities.
                </p>
                <div className="mt-4">
                  <Button href="/careers" variant="secondary" size="sm">
                    Browse Jobs
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {recentApplications.map((app) => {
                  const statusConfig = STATUS_BADGE_CONFIG[app.status] || {
                    label: app.status,
                    variant: "default" as const,
                  };
                  const appliedDate = formatDate(app.createdAt);

                  return (
                    <Link
                      key={app.id}
                      href={`/careers/${app.jobId}`}
                      className="flex items-center justify-between py-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                          {app.jobTitle || "Job Application"}
                        </p>
                        {appliedDate && (
                          <p className="text-xs text-text-muted">
                            Applied {appliedDate}
                          </p>
                        )}
                      </div>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button href="/careers" variant="primary" fullWidth>
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                Browse Jobs
              </Button>

              <Button href="/member/profile" variant="secondary" fullWidth>
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
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                Update Profile
              </Button>

              <Button
                href="/member/applications"
                variant="secondary"
                fullWidth
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                View Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function MemberDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

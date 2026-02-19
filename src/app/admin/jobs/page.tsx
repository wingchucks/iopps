"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Badge, Skeleton } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatus = "active" | "inactive";
type TabFilter = "all" | JobStatus;

interface AdminJob {
  id: string;
  title: string;
  employerName: string;
  location: string;
  status: JobStatus;
  applications: number;
  postedAt: string;
}

interface JobsApiResponse {
  jobs: AdminJob[];
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { label: string; value: TabFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const STATUS_BADGE: Record<
  JobStatus,
  { label: string; variant: "success" | "default" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "default" },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Stats card used in the summary row */
function StatCard({
  label,
  value,
  loading: isLoading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5">
      {isLoading ? (
        <>
          <Skeleton className="mb-2 h-8 w-16" />
          <Skeleton className="h-4 w-24" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="mt-1 text-sm text-text-muted">{label}</p>
        </>
      )}
    </div>
  );
}

/** Confirmation dialog for destructive actions */
function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-xl border border-card-border bg-card p-6 shadow-xl animate-scale-in"
      >
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-card-border bg-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-error/10 border border-error/50 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminJobsPage() {
  const { user } = useAuth();

  // Data state
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & search
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminJob | null>(null);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/jobs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data: JobsApiResponse = await res.json();
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError("Failed to load jobs. Please try again.");
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Toggle job status
  const toggleJobStatus = async (job: AdminJob) => {
    if (!user) return;

    const newStatus: JobStatus = job.status === "active" ? "inactive" : "active";

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/jobs/${job.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      // Update local state
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j)),
      );
    } catch (err) {
      console.error("Failed to toggle job status:", err);
    }
  };

  // Delete job
  const handleDelete = async () => {
    if (!user || !deleteTarget) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/jobs/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete job:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Computed values
  const filteredJobs = searchQuery
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          j.employerName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : jobs;

  const activeCount = jobs.filter((j) => j.status === "active").length;
  const inactiveCount = jobs.filter((j) => j.status === "inactive").length;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Jobs Management
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitor and manage all job postings across the platform.
          </p>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Jobs" value={total} loading={loading} />
          <StatCard label="Active Jobs" value={activeCount} loading={loading} />
          <StatCard
            label="Inactive Jobs"
            value={inactiveCount}
            loading={loading}
          />
        </div>

        {/* Filter Tabs + Search */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={[
                      "flex-shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                      activeTab === tab.value
                        ? "bg-card text-text-primary shadow-sm"
                        : "text-text-muted hover:text-text-primary",
                    ].join(" ")}
                    aria-pressed={activeTab === tab.value}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="search"
                  placeholder="Search by title or employer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-input-border bg-input py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-input-focus focus:outline-none sm:w-72"
                />
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="mb-6 rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
                {error}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-5 w-1/5" />
                    <Skeleton className="h-5 w-1/6" />
                    <Skeleton className="h-5 w-1/6" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredJobs.length === 0 && (
              <div className="rounded-xl border border-dashed border-card-border py-16 text-center">
                <svg
                  className="mx-auto h-10 w-10 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <p className="mt-3 text-sm font-medium text-text-primary">
                  No jobs found
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {searchQuery
                    ? "Try adjusting your search terms."
                    : "Jobs will appear here once employers post them."}
                </p>
              </div>
            )}

            {/* Jobs Table */}
            {!loading && !error && filteredJobs.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border text-left">
                        <th className="pb-3 pr-4 font-medium text-text-muted">
                          Job Title
                        </th>
                        <th className="hidden pb-3 pr-4 font-medium text-text-muted sm:table-cell">
                          Location
                        </th>
                        <th className="pb-3 pr-4 font-medium text-text-muted">
                          Status
                        </th>
                        <th className="hidden pb-3 pr-4 font-medium text-text-muted md:table-cell">
                          Applications
                        </th>
                        <th className="hidden pb-3 pr-4 font-medium text-text-muted lg:table-cell">
                          Posted
                        </th>
                        <th className="pb-3 font-medium text-text-muted text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job) => {
                        const badge = STATUS_BADGE[job.status] || { label: job.status || "Unknown", variant: "default" as const };
                        return (
                          <tr
                            key={job.id}
                            className="group border-b border-[var(--card-border)]/50 transition-colors hover:bg-[var(--card-bg)]/50"
                          >
                            <td className="py-4 pr-4">
                              <p className="font-medium text-text-primary group-hover:text-accent transition-colors">
                                {job.title}
                              </p>
                              <p className="mt-0.5 text-xs text-text-muted">
                                {job.employerName}
                              </p>
                            </td>
                            <td className="hidden py-4 pr-4 text-text-secondary sm:table-cell">
                              {job.location}
                            </td>
                            <td className="py-4 pr-4">
                              <Badge variant={badge.variant}>
                                {badge.label}
                              </Badge>
                            </td>
                            <td className="hidden py-4 pr-4 text-text-secondary md:table-cell">
                              {job.applications}
                            </td>
                            <td className="hidden py-4 pr-4 text-text-secondary lg:table-cell">
                              {formatDate(job.postedAt)}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* View */}
                                <Link
                                  href={`/careers/${job.id}`}
                                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
                                  title="View job"
                                  aria-label={`View ${job.title}`}
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
                                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                                    />
                                  </svg>
                                </Link>

                                {/* Toggle Status */}
                                <button
                                  type="button"
                                  onClick={() => toggleJobStatus(job)}
                                  className={[
                                    "rounded-lg p-2 transition-colors",
                                    job.status === "active"
                                      ? "text-warning hover:bg-warning/10"
                                      : "text-success hover:bg-success/10",
                                  ].join(" ")}
                                  title={
                                    job.status === "active"
                                      ? "Deactivate"
                                      : "Activate"
                                  }
                                  aria-label={
                                    job.status === "active"
                                      ? `Deactivate ${job.title}`
                                      : `Activate ${job.title}`
                                  }
                                >
                                  {job.status === "active" ? (
                                    // Pause icon
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
                                        d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                                      />
                                    </svg>
                                  ) : (
                                    // Play icon
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
                                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                                      />
                                    </svg>
                                  )}
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(job)}
                                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                                  title="Delete"
                                  aria-label={`Delete ${job.title}`}
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
                                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between border-t border-card-border pt-4">
                  <p className="text-sm text-text-muted">
                    Showing {rangeStart}-{rangeEnd} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className="rounded-lg border border-card-border bg-card px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Job"
        message={`Are you sure you want to delete "${deleteTarget?.title ?? ""}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

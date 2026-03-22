"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import OrgDashboardNav from "@/components/OrgDashboardNav";
import Avatar from "@/components/Avatar";

/* ─── types ─── */
type JobStatus = "active" | "draft" | "closed";

interface Job {
  id: string;
  title: string;
  slug?: string;
  location?: string;
  status?: JobStatus;
  applicationCount?: number;
  applications?: number;
  createdAt?: unknown;
  orgName?: string;
  orgId?: string;
}

/* ─── helpers ─── */
function formatDate(ts: unknown): string {
  if (!ts) return "N/A";
  if (typeof ts === "string") return new Date(ts).toLocaleDateString();
  if (typeof ts === "object" && ts !== null) {
    if ("toDate" in ts) {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString();
    }
    if ("_seconds" in ts) {
      return new Date(
        (ts as { _seconds: number })._seconds * 1000
      ).toLocaleDateString();
    }
  }
  return "N/A";
}

function StatusBadge({ status }: { status?: JobStatus }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(16,185,129,.12)", color: "#10B981" },
    draft: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
    closed: { bg: "rgba(107,114,128,.12)", color: "#6B7280" },
  };
  const s = status || "active";
  const c = colors[s] || colors.active;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: c.bg, color: c.color }}
    >
      {s}
    </span>
  );
}

/* ─── main page ─── */
export default function OrgDashboardJobsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState<string | undefined>();
  const [orgLogo, setOrgLogo] = useState<string | undefined>();
  const [orgType, setOrgType] = useState<string | undefined>();
  const [orgPlan, setOrgPlan] = useState<string | null>(null);
  const [orgTier, setOrgTier] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const token = await user.getIdToken();
      const res = await fetch("/api/employer/jobs", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to load jobs");
        throw new Error(msg);
      }
      const data = await res.json();
      setJobs(data.jobs || []);
      if (data.orgName) setOrgName(data.orgName);
      if (data.orgSlug) setOrgSlug(data.orgSlug);
      if (data.orgLogo) setOrgLogo(data.orgLogo);
      if (data.orgType) setOrgType(data.orgType);
      if (data.orgPlan !== undefined) setOrgPlan(data.orgPlan);
      if (data.orgTier !== undefined) setOrgTier(data.orgTier);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /* ─── actions ─── */
  const apiAction = async (
    jobId: string,
    method: "PUT" | "DELETE",
    body?: Record<string, unknown>
  ) => {
    if (!user) return;
    setActionLoading(jobId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Action failed");
        throw new Error(msg);
      }
      return res;
    } catch (err) {
      console.error(`Action ${method} failed for ${jobId}:`, err);
      showToast(err instanceof Error ? err.message : "Action failed", "error");
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (job: Job) => {
    const current = job.status || "active";
    const newStatus: JobStatus = current === "active" ? "draft" : "active";
    const res = await apiAction(job.id, "PUT", { status: newStatus });
    if (res) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
      );
      showToast(
        newStatus === "active" ? "Job activated" : "Job deactivated",
        "success"
      );
    }
  };

  const handleClosePosition = async (job: Job) => {
    if (!confirm("Close this position? It will no longer accept applications."))
      return;
    const res = await apiAction(job.id, "PUT", { status: "closed" });
    if (res) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "closed" as JobStatus } : j
        )
      );
      showToast("Position closed", "success");
    }
  };

  const handleDelete = async (job: Job) => {
    if (
      !confirm(
        `Delete "${job.title}"? This action cannot be undone.`
      )
    )
      return;
    const res = await apiAction(job.id, "DELETE");
    if (res) {
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      showToast("Job deleted", "success");
    }
  };

  /* ─── computed stats ─── */
  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => (j.status || "active") === "active").length,
    closed: jobs.filter((j) => j.status === "closed").length,
  };

  const getAppCount = (job: Job) =>
    job.applicationCount ?? job.applications ?? 0;

  return (
    <OrgRoute>
      <AppShell>
        <div className="min-h-screen bg-bg">
          <div className="max-w-[1100px] mx-auto px-4 py-8 md:px-10">
            {loading ? (
              <div className="flex flex-col gap-4">
                <div className="h-10 w-64 rounded-xl skeleton" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl skeleton" />
                  ))}
                </div>
                <div className="h-64 rounded-2xl skeleton" />
              </div>
            ) : error ? (
              <Card className="p-8 text-center">
                <p
                  className="text-sm font-semibold mb-4"
                  style={{ color: "#DC2626" }}
                >
                  {error}
                </p>
                <Button onClick={fetchJobs}>Retry</Button>
              </Card>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={orgName || ""}
                      size={48}
                      src={orgLogo}
                    />
                    <div>
                      <h1
                        className="text-2xl font-bold"
                        style={{ color: "var(--text)" }}
                      >
                        Jobs
                      </h1>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Manage your organization&apos;s job listings
                      </p>
                    </div>
                  </div>
                  <OrgDashboardNav orgSlug={orgSlug} orgType={orgType} orgPlan={orgPlan} orgTier={orgTier} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Total Jobs", value: stats.total },
                    { label: "Active", value: stats.active },
                    { label: "Closed", value: stats.closed },
                  ].map(({ label, value }) => (
                    <Card key={label} className="p-5">
                      <p
                        className="text-sm font-semibold mb-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-3xl font-bold"
                        style={{ color: "var(--text)" }}
                      >
                        {value}
                      </p>
                    </Card>
                  ))}
                </div>

                {/* Post New Job button */}
                <div className="mb-6">
                  <Link
                    href="/org/dashboard/jobs/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold no-underline transition-all hover:opacity-80"
                    style={{ background: "var(--teal)", color: "#fff" }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Post New Job
                  </Link>
                </div>

                {/* Jobs list */}
                <h2
                  className="text-lg font-bold mb-4"
                  style={{ color: "var(--text)" }}
                >
                  Your Job Listings
                </h2>

                {jobs.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="mb-3">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          color: "var(--text-muted)",
                          display: "inline-block",
                        }}
                      >
                        <rect
                          x="2"
                          y="7"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </div>
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--text)" }}
                    >
                      No job listings yet
                    </p>
                    <p
                      className="text-sm mb-4"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Click &quot;Post New Job&quot; to create your first
                      listing.
                    </p>
                    <Link
                      href="/org/dashboard/jobs/new"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold no-underline transition-all hover:opacity-80"
                      style={{ background: "var(--teal)", color: "#fff" }}
                    >
                      Post New Job
                    </Link>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {jobs.map((job) => {
                      const isDisabled = actionLoading === job.id;
                      const currentStatus = job.status || "active";
                      const appCount = getAppCount(job);

                      return (
                        <Card
                          key={job.id}
                          className={`p-5 ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            {/* Job info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h3
                                  className="text-base font-bold truncate"
                                  style={{ color: "var(--text)" }}
                                >
                                  {job.title}
                                </h3>
                                <StatusBadge
                                  status={currentStatus as JobStatus}
                                />
                                {appCount > 0 && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                    style={{
                                      background: "rgba(59,130,246,.12)",
                                      color: "#3B82F6",
                                    }}
                                  >
                                    {appCount}{" "}
                                    {appCount === 1
                                      ? "application"
                                      : "applications"}
                                  </span>
                                )}
                              </div>
                              <div
                                className="flex items-center gap-4 text-xs flex-wrap"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {job.location && (
                                  <span className="inline-flex items-center gap-1">
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {job.location}
                                  </span>
                                )}
                                <span>Posted: {formatDate(job.createdAt)}</span>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              <Link
                                href={`/org/dashboard/jobs/${job.id}/edit`}
                                className="px-3 py-1.5 rounded-lg no-underline text-xs font-semibold transition-all hover:opacity-80"
                                style={{
                                  background: "rgba(13,148,136,.1)",
                                  color: "var(--teal)",
                                }}
                              >
                                Edit
                              </Link>
                              {currentStatus !== "closed" && (
                                <button
                                  onClick={() => handleToggleStatus(job)}
                                  disabled={isDisabled}
                                  className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold transition-all hover:opacity-80"
                                  style={{
                                    background:
                                      currentStatus === "active"
                                        ? "rgba(245,158,11,.1)"
                                        : "rgba(16,185,129,.1)",
                                    color:
                                      currentStatus === "active"
                                        ? "#F59E0B"
                                        : "#10B981",
                                  }}
                                >
                                  {currentStatus === "active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                              )}
                              {currentStatus !== "closed" && (
                                <button
                                  onClick={() => handleClosePosition(job)}
                                  disabled={isDisabled}
                                  className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold transition-all hover:opacity-80"
                                  style={{
                                    background: "rgba(107,114,128,.1)",
                                    color: "#6B7280",
                                  }}
                                >
                                  Close Position
                                </button>
                              )}
                              {currentStatus === "closed" && (
                                <button
                                  onClick={() => handleToggleStatus(job)}
                                  disabled={isDisabled}
                                  className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold transition-all hover:opacity-80"
                                  style={{
                                    background: "rgba(16,185,129,.1)",
                                    color: "#10B981",
                                  }}
                                >
                                  Reopen
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(job)}
                                disabled={isDisabled}
                                className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold transition-all hover:opacity-80"
                                style={{
                                  background: "rgba(220,38,38,.1)",
                                  color: "#DC2626",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}

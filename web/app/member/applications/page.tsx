"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listMemberApplications,
  getJobPosting,
  withdrawJobApplication,
} from "@/lib/firestore";
import type { JobApplication, JobPosting } from "@/lib/types";

type ApplicationWithJob = JobApplication & {
  job?: JobPosting | null;
};

type MaybeTimestamp =
  | JobApplication["createdAt"]
  | JobApplication["updatedAt"]
  | null
  | undefined;

const toDateValue = (value: MaybeTimestamp) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }
  return null;
};

export default function MemberApplicationsPage() {
  const { user, role, loading } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);
  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter(
      (app) =>
        (app.status ?? "submitted").toLowerCase() ===
        statusFilter.toLowerCase()
    );
  }, [applications, statusFilter]);

  const counts = useMemo(() => {
    const statusMap = new Map<string, number>();
    applications.forEach((app) => {
      const status = app.status ?? "submitted";
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    });
    const last30 = applications.filter((app) => {
      const date = toDateValue(app.createdAt);
      return date
        ? date.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
        : false;
    }).length;
    return {
      total: applications.length,
      statusMap,
      last30,
    };
  }, [applications]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "hired" || s === "accepted") return "bg-green-500/20 text-green-300 border-green-500/40";
    if (s === "in review" || s === "reviewing") return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (s === "not selected" || s === "rejected") return "bg-slate-500/20 text-slate-400 border-slate-500/40";
    if (s === "withdrawn") return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-[#14B8A6]/20 text-[#14B8A6] border-[#14B8A6]/40";
  };

  const canWithdraw = (status: string) => {
    const s = status.toLowerCase();
    return s === "submitted" || s === "in review" || s === "reviewed";
  };

  const handleWithdrawJobApplication = async (applicationId: string) => {
    try {
      setWithdrawingId(applicationId);
      setError(null);
      await withdrawJobApplication(applicationId);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: "withdrawn" } : app
        )
      );
      setConfirmWithdrawId(null);
    } catch (err) {
      console.error(err);
      setError("Failed to withdraw application. Please try again.");
    } finally {
      setWithdrawingId(null);
    }
  };


  useEffect(() => {
    if (!user || role !== "community") return;
    (async () => {
      try {
        const apps = await listMemberApplications(user.uid);

        const withJobs: ApplicationWithJob[] = [];
        for (const app of apps) {
          const job = await getJobPosting(app.jobId);
          withJobs.push({ ...app, job });
        }
        setApplications(withJobs);
      } catch (err) {
        console.error(err);
        setError("Unable to load your applications right now.");
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [role, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading your account...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-slate-50">Sign in to view your applications</h1>
          <p className="mt-3 text-slate-400">Log in or create an account to track your job applications.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 px-6 py-3 font-semibold text-slate-100 hover:border-[#14B8A6] hover:bg-slate-800"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (role !== "community") {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-50">Community Member Area</h1>
          <p className="mt-3 text-slate-400">Switch to your community account to view job applications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#14B8A6]">My Applications</p>
          <h1 className="mt-2 text-4xl font-bold text-slate-50">Track Your Applications</h1>
          <p className="mt-3 text-slate-400">Monitor the status of all your job applications in one place.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/member/profile"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2 text-slate-200 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
            >
              Edit Profile
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/saved"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2 text-slate-200 transition hover:border-[#14B8A6] hover:bg-slate-800 hover:text-[#14B8A6]"
            >
              Saved Jobs
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Stats Dashboard */}
        {!appsLoading && (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total Applications</p>
              <p className="mt-3 text-3xl font-bold text-slate-50">{counts.total}</p>
              <p className="mt-2 text-xs text-slate-500">{counts.last30} in last 30 days</p>
            </div>

            {Array.from(counts.statusMap.entries()).map(([status, value]) => {
              const statusUpper = status.toUpperCase();
              const statusColors: Record<string, { bg: string; text: string }> = {
                SUBMITTED: { bg: "bg-blue-500/10", text: "text-blue-300" },
                REVIEWED: { bg: "bg-amber-500/10", text: "text-amber-300" },
                SHORTLISTED: { bg: "bg-emerald-500/10", text: "text-emerald-300" },
                HIRED: { bg: "bg-green-500/10", text: "text-green-300" },
                REJECTED: { bg: "bg-red-500/10", text: "text-red-300" },
                WITHDRAWN: { bg: "bg-slate-500/10", text: "text-slate-300" },
              };
              const colors = statusColors[statusUpper] || { bg: "bg-slate-500/10", text: "text-slate-300" };
              return (
                <div key={status} className={`rounded-xl border border-slate-800 ${colors.bg} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{status}</p>
                  <p className={`mt-3 text-3xl font-bold ${colors.text}`}>{value}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-8 flex justify-end">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Filter by status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* Applications Section */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/20 p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {appsLoading ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">Loading your applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-slate-400">No applications yet</p>
              <p className="mt-1 text-sm text-slate-500">Start applying to jobs to track your progress.</p>
              <Link
                href="/careers"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-2.5 font-semibold text-slate-900 hover:bg-[#16cdb8]"
              >
                Browse Jobs
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 py-12 text-center">
              <p className="text-slate-400">No applications match your filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/50 p-5 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/careers/${app.jobId}`}
                        className="inline-flex text-lg font-semibold text-slate-50 hover:text-[#14B8A6]"
                      >
                        {app.job?.title ?? "Job"}
                        <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      <p className="mt-1 text-sm text-slate-400">{app.job?.employerName ?? "Employer"}</p>
                      {app.job?.location && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {app.job.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${getStatusColor(app.status ?? "submitted")}`}>
                        {app.status ?? "submitted"}
                      </span>
                      {canWithdraw(app.status ?? "submitted") && (
                        confirmWithdrawId === app.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleWithdrawJobApplication(app.id)}
                              disabled={withdrawingId === app.id}
                              className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {withdrawingId === app.id ? "Withdrawing..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmWithdrawId(null)}
                              disabled={withdrawingId === app.id}
                              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmWithdrawId(app.id)}
                            className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
                          >
                            Withdraw
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <span>Applied:</span>
                      <span className="text-slate-400">{toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ?? "—"}</span>
                    </div>
                    {app.updatedAt && toDateValue(app.updatedAt) && (
                      <div className="flex items-center gap-1">
                        <span>Updated:</span>
                        <span className="text-slate-400">{toDateValue(app.updatedAt)?.toLocaleDateString("en-CA")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listMemberApplications,
  getJobPosting,
  listMemberScholarshipApplications,
  getScholarship,
  withdrawJobApplication,
  withdrawScholarshipApplication,
} from "@/lib/firestore";
import type {
  JobApplication,
  JobPosting,
  ScholarshipApplication,
  Scholarship,
} from "@/lib/types";

type ApplicationWithJob = JobApplication & {
  job?: JobPosting | null;
};

type ScholarshipApplicationWithDetails = ScholarshipApplication & {
  scholarship?: Scholarship | null;
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

export default function ApplicationsTab() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<
    ScholarshipApplicationWithDetails[]
  >([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"jobs" | "scholarships">("jobs");
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

  const filteredScholarshipApplications = useMemo(() => {
    if (statusFilter === "all") return scholarshipApplications;
    return scholarshipApplications.filter(
      (app) =>
        (app.status ?? "submitted").toLowerCase() ===
        statusFilter.toLowerCase()
    );
  }, [scholarshipApplications, statusFilter]);

  const counts = useMemo(() => {
    const allApps =
      activeTab === "jobs" ? applications : scholarshipApplications;
    const statusMap = new Map<string, number>();
    allApps.forEach((app) => {
      const status = app.status ?? "submitted";
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    });
    const last30 = allApps.filter((app) => {
      const date = toDateValue(app.createdAt);
      return date
        ? date.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
        : false;
    }).length;
    return {
      total: allApps.length,
      statusMap,
      last30,
    };
  }, [activeTab, applications, scholarshipApplications]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "hired" || s === "accepted") return "bg-green-500/20 text-green-300 border-green-500/40";
    if (s === "in review" || s === "reviewing") return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (s === "not selected" || s === "rejected") return "bg-slate-500/20 text-slate-400 border-slate-500/40";
    if (s === "withdrawn") return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
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

  const handleWithdrawScholarshipApplication = async (applicationId: string) => {
    try {
      setWithdrawingId(applicationId);
      setError(null);
      await withdrawScholarshipApplication(applicationId);
      setScholarshipApplications((prev) =>
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
    if (!user) return;
    (async () => {
      try {
        const [apps, scholarshipApps] = await Promise.all([
          listMemberApplications(user.uid),
          listMemberScholarshipApplications(user.uid),
        ]);

        const withJobs: ApplicationWithJob[] = [];
        for (const app of apps) {
          const job = await getJobPosting(app.jobId);
          withJobs.push({ ...app, job });
        }
        setApplications(withJobs);

        const withScholarships: ScholarshipApplicationWithDetails[] = [];
        for (const app of scholarshipApps) {
          const scholarship = await getScholarship(app.scholarshipId);
          withScholarships.push({ ...app, scholarship });
        }
        setScholarshipApplications(withScholarships);
      } catch (err) {
        console.error(err);
        setError("Unable to load your applications right now.");
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">My Applications</h2>
        <p className="mt-2 text-slate-400">
          Track your job and scholarship applications in one place.
        </p>
      </div>

      {/* Tabs for Job vs Scholarship Applications */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "jobs"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Job Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("scholarships")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "scholarships"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Scholarship Applications ({scholarshipApplications.length})
        </button>
      </div>

      {/* Stats */}
      {!appsLoading && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Total Applications
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-white">
              {counts.total}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {counts.last30} added in the last 30 days
            </p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-8 shadow-xl shadow-blue-900/20">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Status Breakdown
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {Array.from(counts.statusMap.entries()).map(([status, value]) => (
                <span
                  key={status}
                  className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-slate-300"
                >
                  {status}: {value}
                </span>
              ))}
              {counts.statusMap.size === 0 && (
                <span className="text-slate-400">
                  No applications recorded yet.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex justify-end">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Filter by status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in review">In review</option>
            <option value="hired">Hired</option>
            <option value="not selected">Not selected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
        {appsLoading ? (
          <p className="text-center text-slate-400">Loading applications...</p>
        ) : activeTab === "jobs" ? (
          applications.length === 0 ? (
            <div className="rounded-xl bg-slate-900/50 p-8 text-center">
              <p className="text-slate-300">
                You have not recorded any job applications yet. Visit a job and
                use "Record my application" to add one.
              </p>
              <Link
                href="/jobs"
                className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
              >
                Browse jobs
              </Link>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-xl bg-slate-900/50 p-8 text-center">
              <p className="text-slate-300">No job applications match your filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-white">
                        {app.job?.title ?? "Job"}
                      </p>
                      <p className="text-sm text-emerald-400">
                        {app.job?.employerName ?? "Employer"}
                      </p>
                      {app.job?.location && (
                        <p className="mt-1 text-xs text-slate-400">
                          📍 {app.job.location}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${getStatusColor(
                        app.status ?? "submitted"
                      )}`}
                    >
                      {app.status ?? "submitted"}
                    </span>
                  </div>
                  {app.note && (
                    <p className="mt-2 text-sm text-slate-300">{app.note}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {app.job && (
                      <Link
                        href={`/jobs/${app.jobId}`}
                        className="inline-flex text-sm text-emerald-400 transition-colors hover:text-emerald-300"
                      >
                        View job posting →
                      </Link>
                    )}
                    {canWithdraw(app.status ?? "submitted") && (
                      confirmWithdrawId === app.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleWithdrawJobApplication(app.id)}
                            disabled={withdrawingId === app.id}
                            className="rounded-xl bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {withdrawingId === app.id ? "Withdrawing..." : "Confirm withdraw"}
                          </button>
                          <button
                            onClick={() => setConfirmWithdrawId(null)}
                            disabled={withdrawingId === app.id}
                            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmWithdrawId(app.id)}
                          className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
                        >
                          Withdraw application
                        </button>
                      )
                    )}
                  </div>
                  <p className="mt-4 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                    Recorded{" "}
                    {toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ??
                      "—"}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : scholarshipApplications.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-300">
              You have not applied to any scholarships yet. Browse available
              scholarships to get started.
            </p>
            <Link
              href="/education/scholarships"
              className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Browse scholarships
            </Link>
          </div>
        ) : filteredScholarshipApplications.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-300">No scholarship applications match your filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredScholarshipApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">
                      {app.scholarship?.title ?? "Scholarship"}
                    </p>
                    <p className="text-sm text-emerald-400">
                      {app.scholarship?.provider ?? "Provider"}
                    </p>
                    {app.scholarship?.amount && (
                      <p className="mt-1 text-xs text-slate-400">
                        💰 {app.scholarship.amount}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${getStatusColor(
                      app.status ?? "submitted"
                    )}`}
                  >
                    {app.status ?? "submitted"}
                  </span>
                </div>
                {app.education && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-400">
                      Education:
                    </p>
                    <p className="text-xs text-slate-300">{app.education}</p>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {app.scholarship && (
                    <Link
                      href={`/scholarships/${app.scholarshipId}`}
                      className="inline-flex text-sm text-emerald-400 transition-colors hover:text-emerald-300"
                    >
                      View scholarship →
                    </Link>
                  )}
                  {canWithdraw(app.status ?? "submitted") && (
                    confirmWithdrawId === app.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleWithdrawScholarshipApplication(app.id)}
                          disabled={withdrawingId === app.id}
                          className="rounded-xl bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {withdrawingId === app.id ? "Withdrawing..." : "Confirm withdraw"}
                        </button>
                        <button
                          onClick={() => setConfirmWithdrawId(null)}
                          disabled={withdrawingId === app.id}
                          className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmWithdrawId(app.id)}
                        className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
                      >
                        Withdraw application
                      </button>
                    )
                  )}
                </div>
                <p className="mt-4 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                  Applied{" "}
                  {toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ??
                    "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

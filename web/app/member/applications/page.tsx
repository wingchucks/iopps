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
import { ButtonLink } from "@/components/ui/ButtonLink";

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

export default function MemberApplicationsPage() {
  const { user, role, loading } = useAuth();
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
    if (!user || role !== "community") return;
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
  }, [role, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to view your applications
        </h1>
        <p className="text-sm text-slate-300">
          Log in or create an account to see the jobs you&apos;ve applied for.
        </p>
        <div className="flex gap-3">
          <ButtonLink href="/login">Login</ButtonLink>
          <ButtonLink href="/register" variant="outline">
            Register
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (role !== "community") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Community member area
        </h1>
        <p className="text-sm text-slate-300">
          Switch to your community account to view job applications.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
            My applications
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Applications you&apos;ve recorded
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Track your job and scholarship applications in one place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href="/member/profile"
              className="rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2 text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              Edit profile →
            </Link>
            <Link
              href="/saved"
              className="rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2 text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              View saved jobs →
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs for Job vs Scholarship Applications */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "jobs"
              ? "border-b-2 border-[#14B8A6] text-[#14B8A6]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Job Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("scholarships")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "scholarships"
              ? "border-b-2 border-[#14B8A6] text-[#14B8A6]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Scholarship Applications ({scholarshipApplications.length})
        </button>
      </div>

      {/* Filter and Status Selector */}
      <div className="flex justify-end">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Filter by status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
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

      {!appsLoading && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:p-8 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Recorded
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">
              {counts.total}
            </h2>
            <p className="text-xs text-slate-400">
              {counts.last30} added in the last 30 days
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:p-8 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Status breakdown
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {Array.from(counts.statusMap.entries()).map(([status, value]) => (
                <span
                  key={status}
                  className="rounded-full border border-slate-700 px-3 py-1 text-slate-300"
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
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {appsLoading ? (
          <p className="text-sm text-slate-300">Loading applications...</p>
        ) : activeTab === "jobs" ? (
          applications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 text-center text-sm text-slate-300">
              <p>
                You have not recorded any job applications yet. Visit a job and
                use &quot;Record my application&quot; to add one.
              </p>
              <ButtonLink href="/jobs" className="mt-3 text-xs">
                Browse jobs
              </ButtonLink>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 text-center text-sm text-slate-300">
              <p>No job applications match your filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-50">
                        {app.job?.title ?? "Job"}
                      </p>
                      <p className="text-xs text-slate-300">
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
                    <p className="mt-2 text-xs text-slate-300">{app.note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {app.job && (
                      <Link
                        href={`/jobs/${app.jobId}`}
                        className="inline-flex text-xs text-[#14B8A6] underline"
                      >
                        View job posting
                      </Link>
                    )}
                    {canWithdraw(app.status ?? "submitted") && (
                      confirmWithdrawId === app.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleWithdrawJobApplication(app.id)}
                            disabled={withdrawingId === app.id}
                            className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                          >
                            {withdrawingId === app.id ? "Withdrawing..." : "Confirm withdraw"}
                          </button>
                          <button
                            onClick={() => setConfirmWithdrawId(null)}
                            disabled={withdrawingId === app.id}
                            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmWithdrawId(app.id)}
                          className="rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
                        >
                          Withdraw application
                        </button>
                      )
                    )}
                  </div>
                  <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                    Recorded{" "}
                    {toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ??
                      "—"}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : scholarshipApplications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 text-center text-sm text-slate-300">
            <p>
              You have not applied to any scholarships yet. Browse available
              scholarships to get started.
            </p>
            <ButtonLink href="/scholarships" className="mt-3 text-xs">
              Browse scholarships
            </ButtonLink>
          </div>
        ) : filteredScholarshipApplications.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 text-center text-sm text-slate-300">
            <p>No scholarship applications match your filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredScholarshipApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-50">
                      {app.scholarship?.title ?? "Scholarship"}
                    </p>
                    <p className="text-xs text-slate-300">
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
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {app.scholarship && (
                    <Link
                      href={`/scholarships/${app.scholarshipId}`}
                      className="inline-flex text-xs text-[#14B8A6] underline"
                    >
                      View scholarship
                    </Link>
                  )}
                  {canWithdraw(app.status ?? "submitted") && (
                    confirmWithdrawId === app.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleWithdrawScholarshipApplication(app.id)}
                          disabled={withdrawingId === app.id}
                          className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {withdrawingId === app.id ? "Withdrawing..." : "Confirm withdraw"}
                        </button>
                        <button
                          onClick={() => setConfirmWithdrawId(null)}
                          disabled={withdrawingId === app.id}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmWithdrawId(app.id)}
                        className="rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
                      >
                        Withdraw application
                      </button>
                    )
                  )}
                </div>
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
                  Applied{" "}
                  {toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ??
                    "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

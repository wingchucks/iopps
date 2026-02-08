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

type ApplicationWithJob = JobApplication & { job?: JobPosting | null };
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

export default function ProfileApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<
    ScholarshipApplicationWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"jobs" | "scholarships">("jobs");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(
    null
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "jobs" ? applications : scholarshipApplications;
    if (statusFilter === "all") return list;
    return list.filter(
      (app) =>
        (app.status ?? "submitted").toLowerCase() ===
        statusFilter.toLowerCase()
    );
  }, [activeTab, applications, scholarshipApplications, statusFilter]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "hired" || s === "accepted")
      return "bg-green-500/20 text-green-300 border-green-500/40";
    if (s === "in review" || s === "reviewing")
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (s === "not selected" || s === "rejected")
      return "bg-slate-500/20 text-[var(--text-muted)] border-slate-500/40";
    if (s === "withdrawn")
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/40";
  };

  const canWithdraw = (status: string) => {
    const s = status.toLowerCase();
    return s === "submitted" || s === "in review" || s === "reviewed";
  };

  const handleWithdrawJob = async (id: string) => {
    try {
      setWithdrawingId(id);
      setError(null);
      await withdrawJobApplication(id);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: "withdrawn" } : app
        )
      );
      setConfirmWithdrawId(null);
    } catch {
      setError("Failed to withdraw application.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleWithdrawScholarship = async (id: string) => {
    try {
      setWithdrawingId(id);
      setError(null);
      await withdrawScholarshipApplication(id);
      setScholarshipApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: "withdrawn" } : app
        )
      );
      setConfirmWithdrawId(null);
    } catch {
      setError("Failed to withdraw application.");
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
      } catch {
        setError("Unable to load applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--text-muted)]">
        Loading applications...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs and filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === "jobs"
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Jobs ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab("scholarships")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === "scholarships"
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Scholarships ({scholarshipApplications.length})
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in review">In review</option>
          <option value="hired">Hired</option>
          <option value="not selected">Not selected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">
            {applications.length === 0 && scholarshipApplications.length === 0
              ? "No applications recorded yet."
              : "No applications match your filter."}
          </p>
          <Link
            href={activeTab === "jobs" ? "/careers" : "/education/scholarships"}
            className="mt-3 inline-flex items-center text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Browse {activeTab === "jobs" ? "jobs" : "scholarships"}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const isJob = activeTab === "jobs";
            const title = isJob
              ? (app as ApplicationWithJob).job?.title ?? "Job"
              : (app as ScholarshipApplicationWithDetails).scholarship
                  ?.title ?? "Scholarship";
            const subtitle = isJob
              ? (app as ApplicationWithJob).job?.employerName ?? "Employer"
              : (app as ScholarshipApplicationWithDetails).scholarship
                  ?.provider ?? "Provider";
            const detailLink = isJob
              ? `/careers/${(app as ApplicationWithJob).jobId}`
              : `/education/scholarships/${
                  (app as ScholarshipApplicationWithDetails).scholarshipId
                }`;

            return (
              <div
                key={app.id}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">
                      {title}
                    </p>
                    <p className="text-sm text-[var(--accent)]">{subtitle}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-0.5 text-xs uppercase tracking-widest ${getStatusColor(
                      app.status ?? "submitted"
                    )}`}
                  >
                    {app.status ?? "submitted"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={detailLink}
                    className="text-[var(--accent)] hover:underline"
                  >
                    View details
                  </Link>
                  {canWithdraw(app.status ?? "submitted") && (
                    <>
                      {confirmWithdrawId === app.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              isJob
                                ? handleWithdrawJob(app.id)
                                : handleWithdrawScholarship(app.id)
                            }
                            disabled={withdrawingId === app.id}
                            className="text-xs font-medium text-red-400 hover:underline disabled:opacity-50"
                          >
                            {withdrawingId === app.id
                              ? "Withdrawing..."
                              : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmWithdrawId(null)}
                            className="text-xs font-medium text-[var(--text-muted)] hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmWithdrawId(app.id)}
                          className="text-xs font-medium text-orange-400 hover:underline"
                        >
                          Withdraw
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-2 text-[0.65rem] uppercase tracking-widest text-[var(--text-muted)]">
                  {toDateValue(app.createdAt)?.toLocaleDateString("en-CA") ??
                    ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

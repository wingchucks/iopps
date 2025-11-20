"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerApplications,
  listEmployerJobs,
  updateApplicationStatus,
} from "@/lib/firestore";
import type { JobApplication, JobPosting, ApplicationStatus } from "@/lib/types";

export default function ApplicationsTab() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [appsData, jobsData] = await Promise.all([
        listEmployerApplications(user.uid),
        listEmployerJobs(user.uid),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
    } catch (err) {
      console.error("Error loading applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (jobFilter !== "all" && app.jobId !== jobFilter) return false;
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (
        keyword &&
        !`${app.memberDisplayName} ${app.memberEmail}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [applications, jobFilter, keyword, statusFilter]);

  const handleStatusChange = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
      await updateApplicationStatus(applicationId, newStatus);
      await loadData();
    } catch (err) {
      console.error("Error updating application status:", err);
      alert("Failed to update application status");
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "hired" || s === "accepted")
      return "bg-green-500/20 text-green-300 border-green-500/40";
    if (s === "in review" || s === "reviewing")
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (s === "not selected" || s === "rejected")
      return "bg-slate-500/20 text-slate-400 border-slate-500/40";
    if (s === "withdrawn")
      return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  };

  const statusCounts = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter((a) => a.status === "submitted").length,
      inReview: applications.filter((a) => a.status === "in review").length,
      hired: applications.filter((a) => a.status === "hired").length,
      rejected: applications.filter((a) => a.status === "not selected").length,
    };
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">Applications</h2>
        <p className="mt-2 text-slate-400">
          Review and manage applications from candidates
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl bg-gradient-to-br from-slate-500/10 to-slate-600/10 p-6 shadow-xl shadow-slate-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {statusCounts.total}
          </h3>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 shadow-xl shadow-emerald-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Submitted
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {statusCounts.submitted}
          </h3>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 shadow-xl shadow-blue-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            In Review
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {statusCounts.inReview}
          </h3>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 shadow-xl shadow-green-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Hired</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {statusCounts.hired}
          </h3>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-slate-600/10 to-slate-700/10 p-6 shadow-xl shadow-slate-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Rejected
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {statusCounts.rejected}
          </h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Search candidates
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Filter by job
          </label>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Filter by status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
        {loading ? (
          <p className="text-center text-slate-400">Loading applications...</p>
        ) : filteredApplications.length === 0 ? (
          <div className="rounded-xl bg-slate-900/50 p-8 text-center">
            <p className="text-slate-300">
              {applications.length === 0
                ? "No applications received yet. Applications will appear here as candidates apply to your jobs."
                : "No applications match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const job = jobs.find((j) => j.id === app.jobId);
              return (
                <article
                  key={app.id}
                  className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {app.memberDisplayName || "Anonymous"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {app.memberEmail}
                          </p>
                          <p className="mt-2 text-sm text-emerald-400">
                            Applied to: {job?.title || "Unknown job"}
                          </p>
                        </div>
                      </div>

                      {app.coverLetter && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Cover Letter
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {app.coverLetter.slice(0, 200)}
                            {app.coverLetter.length > 200 ? "..." : ""}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {app.resumeUrl && (
                          <Link
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
                          >
                            📄 View resume
                          </Link>
                        )}
                        <a
                          href={`mailto:${app.memberEmail}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/30"
                        >
                          ✉️ Email candidate
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(
                          app.status || "submitted"
                        )}`}
                      >
                        {app.status || "submitted"}
                      </span>
                      <select
                        value={app.status || "submitted"}
                        onChange={(e) =>
                          handleStatusChange(
                            app.id,
                            e.target.value as ApplicationStatus
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 transition-all hover:border-emerald-500/50 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="in review">In review</option>
                        <option value="hired">Hired</option>
                        <option value="not selected">Not selected</option>
                      </select>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

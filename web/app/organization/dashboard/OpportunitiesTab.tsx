"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerJobs,
  listEmployerConferences,
  updateJobStatus,
  deleteJobPosting,
  deleteConference,
} from "@/lib/firestore";
import type { JobPosting, Conference } from "@/lib/types";

type OpportunityType = "jobs" | "conferences";
type StatusFilter = "all" | "active" | "paused";

export default function OpportunitiesTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [opportunityType, setOpportunityType] = useState<OpportunityType>("jobs");
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
      const [jobsData, conferencesData] = await Promise.all([
        listEmployerJobs(user.uid),
        listEmployerConferences(user.uid),
      ]);
      setJobs(jobsData);
      setConferences(conferencesData);
    } catch (err) {
      console.error("Error loading opportunities:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter === "active" && job.active === false) return false;
      if (statusFilter === "paused" && job.active !== false) return false;
      if (
        keyword &&
        !`${job.title} ${job.description}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [jobs, keyword, statusFilter]);

  const filteredConferences = useMemo(() => {
    return conferences.filter((conf) => {
      if (statusFilter === "active" && conf.active === false) return false;
      if (statusFilter === "paused" && conf.active !== false) return false;
      if (
        keyword &&
        !`${conf.title} ${conf.description}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [conferences, keyword, statusFilter]);

  const handleToggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    try {
      await updateJobStatus(jobId, !currentStatus);
      await loadData();
    } catch (err) {
      console.error("Error toggling job status:", err);
      alert("Failed to update job status");
    }
  };

  const handleDeleteJob = async (jobId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteJobPosting(jobId);
      await loadData();
    } catch (err) {
      console.error("Error deleting job:", err);
      alert("Failed to delete job");
    }
  };

  const handleDeleteConference = async (confId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteConference(confId);
      await loadData();
    } catch (err) {
      console.error("Error deleting conference:", err);
      alert("Failed to delete conference");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">Opportunities</h2>
        <p className="mt-2 text-slate-400">
          Manage your job postings and conference listings
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setOpportunityType("jobs")}
          className={`rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${
            opportunityType === "jobs"
              ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
          }`}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setOpportunityType("conferences")}
          className={`rounded-t-lg px-4 py-3 text-sm font-medium transition-all ${
            opportunityType === "conferences"
              ? "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
          }`}
        >
          Conferences ({conferences.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Search
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={`Search ${opportunityType}...`}
            className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Filter by status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="paused">Paused only</option>
          </select>
        </div>
        <div>
          <Link
            href={opportunityType === "jobs" ? "/organization/jobs/new" : "/organization/conferences/new"}
            className="inline-flex rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
          >
            + New {opportunityType === "jobs" ? "Job" : "Conference"}
          </Link>
        </div>
      </div>

      {/* Jobs List */}
      {opportunityType === "jobs" && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
          {loading ? (
            <p className="text-center text-slate-400">Loading jobs...</p>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-xl bg-slate-900/50 p-8 text-center">
              <p className="text-slate-300">
                {jobs.length === 0
                  ? "No jobs posted yet. Create your first job posting to get started."
                  : "No jobs match your filters."}
              </p>
              {jobs.length === 0 && (
                <Link
                  href="/organization/jobs/new"
                  className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
                >
                  Post your first job
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm text-emerald-400">
                            {job.employerName}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                            {job.employmentType}
                          </span>
                          {job.active === false ? (
                            <span className="rounded-full border border-slate-600 bg-slate-700/30 px-3 py-1 text-xs font-medium text-slate-400">
                              Paused
                            </span>
                          ) : (
                            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {job.description && (
                        <p className="mt-3 text-sm text-slate-300">
                          {job.description.slice(0, 150)}
                          {job.description.length > 150 ? "..." : ""}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>📍 {job.location || "Remote"}</span>
                        <span>👁️ {job.viewsCount || 0} views</span>
                        <span>📝 {job.applicationsCount || 0} applications</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/organization/jobs/${job.id}/edit`}
                      className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/organization/jobs/${job.id}/applications`}
                      className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/30"
                    >
                      View applications
                    </Link>
                    <button
                      onClick={() => handleToggleJobStatus(job.id, job.active !== false)}
                      className="rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700"
                    >
                      {job.active !== false ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conferences List */}
      {opportunityType === "conferences" && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
          {loading ? (
            <p className="text-center text-slate-400">Loading conferences...</p>
          ) : filteredConferences.length === 0 ? (
            <div className="rounded-xl bg-slate-900/50 p-8 text-center">
              <p className="text-slate-300">
                {conferences.length === 0
                  ? "No conferences posted yet. Create your first conference listing to get started."
                  : "No conferences match your filters."}
              </p>
              {conferences.length === 0 && (
                <Link
                  href="/organization/conferences/new"
                  className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
                >
                  Post your first conference
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConferences.map((conf) => (
                <article
                  key={conf.id}
                  className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {conf.title}
                          </h3>
                          <p className="mt-1 text-sm text-emerald-400">
                            {conf.organizerName}
                          </p>
                        </div>
                        {conf.active === false ? (
                          <span className="rounded-full border border-slate-600 bg-slate-700/30 px-3 py-1 text-xs font-medium text-slate-400">
                            Inactive
                          </span>
                        ) : (
                          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
                            Active
                          </span>
                        )}
                      </div>

                      {conf.description && (
                        <p className="mt-3 text-sm text-slate-300">
                          {conf.description.slice(0, 150)}
                          {conf.description.length > 150 ? "..." : ""}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>📍 {conf.location || "TBD"}</span>
                        <span>📅 {
                          typeof conf.startDate === 'string' ? conf.startDate :
                          conf.startDate && typeof conf.startDate === 'object' && 'toDate' in conf.startDate
                            ? conf.startDate.toDate().toLocaleDateString()
                            : 'TBD'
                        } - {
                          typeof conf.endDate === 'string' ? conf.endDate :
                          conf.endDate && typeof conf.endDate === 'object' && 'toDate' in conf.endDate
                            ? conf.endDate.toDate().toLocaleDateString()
                            : 'TBD'
                        }</span>
                        {conf.registrationUrl && <span>🔗 Registration available</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/organization/conferences/${conf.id}/edit`}
                      className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/conferences/${conf.id}`}
                      className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition-all hover:bg-blue-500/30"
                    >
                      View public page
                    </Link>
                    <button
                      onClick={() => handleDeleteConference(conf.id, conf.title)}
                      className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

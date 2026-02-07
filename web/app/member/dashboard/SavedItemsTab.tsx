"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listSavedJobs } from "@/lib/firestore";
import type { SavedJob } from "@/lib/types";

type StatusFilter = "all" | "active" | "inactive";

export default function SavedItemsTab() {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setError(null);
        const data = await listSavedJobs(user.uid);
        setSavedJobs(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load saved jobs right now.");
      } finally {
        setListLoading(false);
      }
    })();
  }, [user]);

  const filteredJobs = useMemo(() => {
    return savedJobs.filter((entry) => {
      const job = entry.job;
      if (!job) return false;
      if (statusFilter === "active" && job.active === false) return false;
      if (statusFilter === "inactive" && job.active !== false) return false;
      if (
        keyword &&
        !`${job.title} ${job.employerName}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [keyword, savedJobs, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h2 className="text-2xl font-bold text-white">Saved Jobs</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Saved jobs stay here even after you leave the site. Use the filters to find active roles or revisit older listings.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground0">
            Total Saved
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {savedJobs.length}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {savedJobs.filter(entry => entry.job?.active !== false).length} active positions
          </p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-8 shadow-xl shadow-blue-900/20">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground0">
            Quick Actions
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/careers"
              className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-4 py-2 text-sm font-semibold text-accent transition-all hover:from-emerald-500/30 hover:to-teal-500/30"
            >
              Browse more jobs →
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
            Search jobs
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search job or employer"
            className="w-full rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground placeholder-slate-500 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-foreground0">
            Filter by status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-accent/20 bg-surface px-4 py-3 text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Closed/paused</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Saved Jobs List */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        {listLoading ? (
          <p className="text-center text-[var(--text-muted)]">Loading saved jobs...</p>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-xl bg-surface p-8 text-center">
            <p className="text-[var(--text-secondary)]">
              {savedJobs.length === 0
                ? "No saved jobs yet. Save jobs from the Jobs page and they will appear here."
                : "No saved jobs match your filters."}
            </p>
            <Link
              href="/careers"
              className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
            >
              Browse jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-accent/20 bg-surface p-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/careers/${entry.jobId}`}
                      className="text-lg font-semibold text-white transition-colors hover:text-accent"
                    >
                      {entry.job?.title}
                    </Link>
                    <p className="mt-1 text-sm text-accent">
                      {entry.job?.employerName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-emerald-300">
                      {entry.job?.employmentType}
                    </span>
                    {entry.job?.active === false && (
                      <span className="rounded-full border border-[var(--card-border)] bg-slate-700/30 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                        Closed
                      </span>
                    )}
                  </div>
                </div>

                {entry.job?.description && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    {entry.job.description.slice(0, 180)}
                    {entry.job.description.length > 180 ? "..." : ""}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                  {entry.job?.location && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {entry.job.location}
                    </span>
                  )}
                  {entry.job?.remoteFlag && (
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-300">
                      Remote friendly
                    </span>
                  )}
                  {entry.job?.indigenousPreference && (
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-emerald-300">
                      Indigenous preference
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/careers/${entry.jobId}`}
                    className="text-sm font-semibold text-accent transition-colors hover:text-emerald-300"
                  >
                    View job details →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

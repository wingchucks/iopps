"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listSavedJobs } from "@/lib/firestore";
import type { SavedJob } from "@/lib/types";

type StatusFilter = "all" | "active" | "inactive";

export default function SavedJobsPage() {
  const { user, role, loading } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "community") return;
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
  }, [role, user]);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Please sign in</h1>
        <p className="text-sm text-slate-300">
          Log in or register as a community member to see your saved jobs.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-teal-400 hover:text-teal-300"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "community") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Community member area
        </h1>
        <p className="text-sm text-slate-300">
          Switch to your community account to view saved jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
            Saved jobs
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Keep track of opportunities
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Saved jobs stay here even after you leave the site. Use the filters
            to find active roles or revisit older listings.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search job or employer"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Closed/paused</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {listLoading ? (
        <p className="text-sm text-slate-300">Loading saved jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-sm text-slate-300">
          No saved jobs match your filters. Save jobs from the Jobs page and
          they will appear here.
        </p>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((entry) => (
            <article
              key={entry.id}
              className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <div>
                  <Link
                    href={`/jobs/${entry.jobId}`}
                    className="text-lg font-semibold text-slate-50 hover:text-teal-300"
                  >
                    {entry.job?.title}
                  </Link>
                  <p className="text-sm text-slate-300">
                    {entry.job?.employerName}
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200">
                  {entry.job?.employmentType}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                {entry.job?.description?.slice(0, 180)}
                {entry.job?.description &&
                entry.job.description.length > 180
                  ? "..."
                  : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                <span>{entry.job?.location}</span>
                {entry.job?.remoteFlag && <span>Remote friendly</span>}
                {entry.job?.indigenousPreference && (
                  <span className="rounded-full bg-teal-500/10 px-3 py-1 text-teal-200">
                    Indigenous preference
                  </span>
                )}
                <span>
                  Status:{" "}
                  {entry.job?.active === false ? "Closed" : "Active"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

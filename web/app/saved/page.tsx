"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listSavedJobs } from "@/lib/firestore";
import type { SavedJob } from "@/lib/types";
import { FeedLayout } from "@/components/opportunity-graph";

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
      <FeedLayout>
        <div className="py-10">
          <p className="text-sm text-foreground0">Loading your account...</p>
        </div>
      </FeedLayout>
    );
  }

  if (!user) {
    return (
      <FeedLayout>
        <div className="py-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">Please sign in</h1>
          <p className="text-sm text-foreground0">
            Log in or register as a community member to see your saved jobs.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-md bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F766E]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-[#0D9488] hover:text-[#0D9488]"
            >
              Register
            </Link>
          </div>
        </div>
      </FeedLayout>
    );
  }

  if (role !== "community") {
    return (
      <FeedLayout>
        <div className="py-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Community member area
          </h1>
          <p className="text-sm text-foreground0">
            Switch to your community account to view saved jobs.
          </p>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#0D9488]">
              Saved jobs
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Keep track of opportunities
            </h1>
            <p className="mt-2 text-sm text-foreground0">
              Saved jobs stay here even after you leave the site. Use the filters
              to find active roles or revisit older listings.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link
                href="/member/dashboard"
                className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-[var(--text-secondary)] transition hover:border-[#0D9488] hover:text-[#0D9488]"
              >
                Go to Dashboard &rarr;
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search job or employer"
              className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0D9488] focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[#0D9488] focus:outline-none"
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Closed/paused</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {listLoading ? (
          <p className="text-sm text-foreground0">Loading saved jobs...</p>
        ) : filteredJobs.length === 0 ? (
          <p className="text-sm text-foreground0">
            No saved jobs match your filters. Save jobs from the Jobs page and
            they will appear here.
          </p>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <div>
                    <Link
                      href={`/careers/${entry.jobId}`}
                      className="text-lg font-semibold text-[var(--text-primary)] hover:text-[#0D9488]"
                    >
                      {entry.job?.title}
                    </Link>
                    <p className="mt-1 text-sm text-foreground0">
                      {entry.job?.employerName}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                    {entry.job?.employmentType}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground0">
                  {entry.job?.description?.slice(0, 180)}
                  {entry.job?.description &&
                  entry.job.description.length > 180
                    ? "..."
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground0">
                  <span>{entry.job?.location}</span>
                  {entry.job?.remoteFlag && <span>Remote friendly</span>}
                  {entry.job?.indigenousPreference && (
                    <span className="rounded-full bg-[#0D9488]/10 px-3 py-1 text-[#0D9488]">
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
    </FeedLayout>
  );
}

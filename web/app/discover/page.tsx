"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listJobPostingsPaginated } from "@/lib/firestore/jobs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Av } from "@/components/ui/Av";
import { Tag } from "@/components/ui/Tag";
import type { JobPosting } from "@/lib/types";

const TABS = ["All", "Jobs", "Training", "Events", "Scholarships"] as const;
type Tab = (typeof TABS)[number];

export default function DiscoverPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("All");
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listJobPostingsPaginated({
        activeOnly: true,
        pageSize: 20,
      });
      setJobs(result.jobs);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const userName = user?.displayName?.split(" ")[0] || "Guest";
  const userAvatar = user?.photoURL || undefined;

  const filteredJobs = jobs.filter((job) => {
    if (tab !== "All" && tab !== "Jobs") return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        job.title.toLowerCase().includes(s) ||
        job.location?.toLowerCase().includes(s) ||
        job.employerName?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const featuredJob = filteredJobs.find((j) => j.featured) || filteredJobs[0];
  const regularJobs = filteredJobs.filter((j) => j !== featuredJob);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="text-xl font-black tracking-tight text-accent">
            IOPPS
          </Link>
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, events, programs..."
              className="w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-accent focus:outline-none"
            />
          </div>
          <ThemeToggle />
          <Link href={user ? "/member/dashboard" : "/login"}>
            <Av name={userName} src={userAvatar} size={32} />
          </Link>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="sticky top-14 z-40 border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t
                  ? "bg-accent text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--border-lt)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Welcome */}
        {user && (
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Welcome back, {userName}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {jobs.length} opportunities available
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Featured Card */}
            {featuredJob && (
              <Link
                href={`/careers/${featuredJob.id}`}
                className="mb-6 block rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-[var(--accent-bg)] to-[var(--card-bg)] p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Tag variant="teal" size="sm">Featured</Tag>
                  {featuredJob.featured && <Tag variant="warn" size="sm">Hot</Tag>}
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {featuredJob.title}
                </h2>
                <p className="mt-1 text-sm text-accent font-medium">
                  {featuredJob.employerName || "Employer"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {featuredJob.location}
                  </span>
                  <span>{featuredJob.employmentType}</span>
                  {featuredJob.salaryRange && typeof featuredJob.salaryRange === "object" && featuredJob.salaryRange.min && (
                    <span>${(featuredJob.salaryRange.min / 1000).toFixed(0)}k - ${((featuredJob.salaryRange.max || featuredJob.salaryRange.min) / 1000).toFixed(0)}k</span>
                  )}
                </div>
              </Link>
            )}

            {/* Job List */}
            {regularJobs.length === 0 && !featuredJob && (
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
                <p className="text-[var(--text-muted)]">
                  {search ? `No results for "${search}"` : "No opportunities found"}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {regularJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.id}`}
                  className="block rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition hover:border-accent/30 hover:shadow-sm card-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate">
                        {job.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-accent font-medium">
                        {job.employerName || "Employer"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {job.location}
                        </span>
                        <span>{job.employmentType}</span>
                        {job.locationType && <Tag size="sm">{job.locationType}</Tag>}
                      </div>
                    </div>
                    {job.companyLogoUrl && (
                      <img
                        src={job.companyLogoUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-[var(--border)] object-contain"
                      />
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Load more */}
            {regularJobs.length > 0 && (
              <div className="mt-6 text-center">
                <button className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-accent/30 transition">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card-bg)] sm:hidden">
        <div className="flex justify-around py-2">
          {[
            { icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Home", href: "/discover", active: true },
            { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", label: "Search", href: "/careers" },
            { icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z", label: "Saved", href: "/saved" },
            { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "Profile", href: user ? "/member/dashboard" : "/login" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium ${
                item.active ? "text-accent" : "text-[var(--text-muted)]"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

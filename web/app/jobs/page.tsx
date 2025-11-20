"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  listJobPostings,
  listSavedJobIds,
  toggleSavedJob,
} from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";
import { useSearchParams } from "@/lib/useSearchParams";

type MaybeDateInput =
  | string
  | Date
  | { toDate: () => Date }
  | null
  | undefined;

// Sample data removed - using live data only

const employmentTypeOptions = [
  "All",
  "Full-time",
  "Part-time",
  "Contract",
  "Seasonal",
  "Internship",
  "Hybrid",
  "Remote",
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "closing", label: "Closing soon" },
  { value: "alphabetical", label: "A-Z" },
];

const getTimeValue = (
  value: MaybeDateInput,
  fallback = Number.MAX_SAFE_INTEGER
) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "object" && "toDate" in value) {
    const maybeDate = value.toDate();
    return maybeDate instanceof Date ? maybeDate.getTime() : fallback;
  }
  return fallback;
};

const formatDate = (value: MaybeDateInput) => {
  const time = getTimeValue(value, Number.NaN);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = useAuth();
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // URL-synced filter parameters
  const { params, updateParam, resetParams } = useSearchParams({
    keyword: "",
    locationFilter: "",
    typeFilter: "All" as typeof employmentTypeOptions[number],
    remoteOnly: false,
    indigenousOnly: false,
    activeOnly: true,
    savedOnly: false,
    minSalary: "" as number | "",
    maxSalary: "" as number | "",
    sortBy: "newest" as typeof sortOptions[number]["value"],
  });

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        setError(null);
        const data = await listJobPostings({
          employmentType: params.typeFilter !== "All" ? params.typeFilter : undefined,
          remoteOnly: params.remoteOnly,
          indigenousOnly: params.indigenousOnly,
          activeOnly: params.activeOnly,
        });
        setJobs(data);
      } catch (err) {
        console.error("Failed to load jobs", err);
        setError(
          "We couldn't load jobs right now. Please try again in a moment."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [params.activeOnly, params.indigenousOnly, params.remoteOnly, params.typeFilter]);

  const listings = jobs;

  useEffect(() => {
    const loadSaved = async () => {
      if (user && role === "community") {
        const ids = await listSavedJobIds(user.uid);
        setSavedJobIds(new Set(ids));
      } else {
        setSavedJobIds(new Set());
      }
    };
    loadSaved();
  }, [role, user]);

  const handleToggleSave = async (jobId: string) => {
    if (!user || role !== "community") return;
    const shouldSave = !savedJobIds.has(jobId);
    setSavingJobId(jobId);
    try {
      await toggleSavedJob(user.uid, jobId, shouldSave);
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        if (shouldSave) {
          next.add(jobId);
        } else {
          next.delete(jobId);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle saved job", err);
      setError("We couldn't update saved jobs. Please try again.");
    } finally {
      setSavingJobId(null);
    }
  };

  const filteredJobs = useMemo(() => {
    return listings.filter((job) => {
      const text = `${job.title ?? ""} ${job.employerName ?? ""} ${
        job.description ?? ""
      } ${job.location ?? ""}`.toLowerCase();
      const matchesKeyword = params.keyword
        ? text.includes(params.keyword.toLowerCase())
        : true;
      const matchesLocation = params.locationFilter
        ? (job.location ?? "")
            .toLowerCase()
            .includes(params.locationFilter.toLowerCase())
        : true;
      const matchesType =
        params.typeFilter === "All" ||
        (job.employmentType ?? "").toLowerCase() === params.typeFilter.toLowerCase();
      const matchesRemote = !params.remoteOnly
        ? true
        : job.remoteFlag ||
          (job.location ?? "").toLowerCase().includes("remote");
      const matchesIndigenous = !params.indigenousOnly
        ? true
        : Boolean(job.indigenousPreference);
      const matchesActive = !params.activeOnly ? true : job.active;
      const matchesSaved = !params.savedOnly ? true : savedJobIds.has(job.id);

      // Salary range filtering
      const matchesSalary = (() => {
        if (!params.minSalary && !params.maxSalary) return true;
        if (!job.salaryRange) return false;

        // Extract numbers from salary range (e.g., "$50,000 - $70,000" or "$60K-$80K")
        const salaryNumbers = job.salaryRange.match(/\d+[,\d]*/g);
        if (!salaryNumbers || salaryNumbers.length === 0) return false;

        const jobSalaries = salaryNumbers.map(s => {
          const num = parseFloat(s.replace(/,/g, ''));
          // If salary is in K format (e.g., "60K"), multiply by 1000
          if (job.salaryRange?.toLowerCase().includes('k')) {
            return num * 1000;
          }
          return num;
        });

        const jobMinSalary = Math.min(...jobSalaries);
        const jobMaxSalary = Math.max(...jobSalaries);

        if (params.minSalary && jobMaxSalary < params.minSalary) return false;
        if (params.maxSalary && jobMinSalary > params.maxSalary) return false;

        return true;
      })();

      return (
        matchesKeyword &&
        matchesLocation &&
        matchesType &&
        matchesRemote &&
        matchesIndigenous &&
        matchesActive &&
        matchesSaved &&
        matchesSalary
      );
    });
  }, [
    params.activeOnly,
    params.indigenousOnly,
    params.keyword,
    listings,
    params.locationFilter,
    params.remoteOnly,
    params.typeFilter,
    params.savedOnly,
    savedJobIds,
    params.minSalary,
    params.maxSalary,
  ]);

  const sortedJobs = useMemo(() => {
    const copy = [...filteredJobs];
    switch (params.sortBy) {
      case "closing":
        return copy.sort((a, b) => {
          const aDate = getTimeValue(a.closingDate ?? null);
          const bDate = getTimeValue(b.closingDate ?? null);
          return aDate - bDate;
        });
      case "alphabetical":
        return copy.sort((a, b) =>
          (a.title ?? "").localeCompare(b.title ?? "")
        );
      case "newest":
      default:
        return copy.sort((a, b) => {
          const aDate = getTimeValue(a.createdAt ?? null, 0);
          const bDate = getTimeValue(b.createdAt ?? null, 0);
          return bDate - aDate;
        });
    }
  }, [filteredJobs, params.sortBy]);

  const displayedJobs = useMemo(
    () => sortedJobs.slice(0, displayLimit),
    [displayLimit, sortedJobs]
  );

  const hasMore = displayLimit < sortedJobs.length;

  const handleLoadMore = () => setDisplayLimit((prev) => prev + 20);

  const resetFilters = () => {
    resetParams();
    setDisplayLimit(20);
  };

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Jobs & Careers"
        title="Build your career with these employers"
        subtitle="Explore roles across Turtle Island with employers committed to Indigenous talent and community success."
      />

      <FilterCard className="mt-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={params.keyword}
              onChange={(e) => updateParam("keyword", e.target.value)}
              placeholder="Project manager, health, remote..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Location
            </label>
            <input
              type="text"
              value={params.locationFilter}
              onChange={(e) => updateParam("locationFilter", e.target.value)}
              placeholder="City, province, or remote"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Job type
            </label>
            <select
              value={params.typeFilter}
              onChange={(e) => updateParam("typeFilter", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {employmentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Sort by
            </label>
            <select
              value={params.sortBy}
              onChange={(e) =>
                updateParam("sortBy", e.target.value as (typeof sortOptions)[number]["value"])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Salary Range Filter */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Min Salary
            </label>
            <input
              type="number"
              value={params.minSalary}
              onChange={(e) => updateParam("minSalary", e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 50000"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Max Salary
            </label>
            <input
              type="number"
              value={params.maxSalary}
              onChange={(e) => updateParam("maxSalary", e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 100000"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Filters - Toggle Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Filters:
          </span>

          {/* Active Only Toggle */}
          <button
            type="button"
            onClick={() => updateParam("activeOnly", !params.activeOnly)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              params.activeOnly
                ? "bg-[#14B8A6] text-slate-900"
                : "border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            {params.activeOnly && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            Active only
          </button>

          {/* Remote Only Toggle */}
          <button
            type="button"
            onClick={() => updateParam("remoteOnly", !params.remoteOnly)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              params.remoteOnly
                ? "bg-blue-500 text-white"
                : "border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            {params.remoteOnly && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            Remote / Hybrid
          </button>

          {/* Indigenous Preference Toggle */}
          <button
            type="button"
            onClick={() => updateParam("indigenousOnly", !params.indigenousOnly)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              params.indigenousOnly
                ? "bg-[#14B8A6] text-slate-900"
                : "border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            {params.indigenousOnly && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            Indigenous preference
          </button>

          {/* Saved Jobs Toggle (Community Members Only) */}
          {role === "community" && (
            <button
              type="button"
              onClick={() => updateParam("savedOnly", !params.savedOnly)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                params.savedOnly
                  ? "bg-amber-500 text-slate-900"
                  : "border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              {params.savedOnly && (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              Saved only
            </button>
          )}

          {/* Reset Button - Only show if filters are active */}
          {(params.activeOnly || params.remoteOnly || params.indigenousOnly || params.savedOnly || params.keyword || params.locationFilter || params.typeFilter !== "All" || params.minSalary || params.maxSalary) && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </button>
          )}
        </div>
      </FilterCard>

      {error && (
        <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 text-sm text-slate-400">
        {loading
          ? "Loading jobs..."
          : sortedJobs.length === 0
          ? "No jobs match your filters right now."
          : `Showing ${displayedJobs.length} of ${sortedJobs.length} job${
              sortedJobs.length === 1 ? "" : "s"
            }`}
      </div>

      <section className="mt-8 space-y-4">
        {displayedJobs.map((job) => {
          const deadline = formatDate(job.closingDate ?? null);
          return (
            <article
              key={job.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 transition-all duration-300 hover:border-[#14B8A6]"
            >
              <div className="space-y-4">
                {/* Title and Saved badge */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-xl font-bold text-slate-50 transition-colors duration-200 group-hover:text-[#14B8A6]"
                    >
                      {job.title}
                    </Link>
                    {savedJobIds.has(job.id) && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Employer and Location */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {job.employerName && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#14B8A6]/20 to-blue-500/20 text-xs font-bold text-[#14B8A6]">
                        {job.employerName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-300">{job.employerName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{job.location}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300">
                    {job.employmentType || "Job type"}
                  </span>
                  {job.remoteFlag && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Remote
                    </span>
                  )}
                  {job.indigenousPreference && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2.5 py-1 text-xs font-medium text-[#14B8A6]">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      Indigenous preference
                    </span>
                  )}
                  {job.salaryRange && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-xs font-medium text-slate-300">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.salaryRange}
                    </span>
                  )}
                  {deadline && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2.5 py-1 text-xs font-medium text-[#14B8A6]">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Closes {deadline}
                    </span>
                  )}
                </div>

                {/* Description snippet */}
                {job.description && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">
                    {job.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
                  >
                    {role === "community" ? "Apply Now" : "View job"}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  {role === "community" && (
                    <button
                      onClick={() => handleToggleSave(job.id)}
                      disabled={savingJobId === job.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all ${
                        savedJobIds.has(job.id)
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          : "border-slate-700/60 bg-slate-800/60 text-slate-300 hover:border-amber-400/40 hover:bg-slate-800 hover:text-amber-400"
                      }`}
                      aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                    >
                      <svg
                        className="h-4 w-4"
                        fill={savedJobIds.has(job.id) ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                      {savedJobIds.has(job.id) ? "Saved" : "Save"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!loading && jobs.length === 0 && params.keyword === "" && params.locationFilter === "" && params.typeFilter === "All" && !params.remoteOnly && !params.indigenousOnly && !params.savedOnly && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/40">
              <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-200">No jobs posted yet</h3>
            <p className="mt-3 text-sm text-slate-400">
              Check back soon for opportunities! Employers are starting to post jobs daily.
            </p>
            {role === "employer" && (
              <Link
                href="/employer/jobs/new"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Post a job
              </Link>
            )}
          </div>
        )}
        {!loading && sortedJobs.length === 0 && (params.keyword !== "" || params.locationFilter !== "" || params.typeFilter !== "All" || params.remoteOnly || params.indigenousOnly || params.savedOnly) && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#08090C] px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/40">
              <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-200">No jobs match your filters</h3>
            <p className="mt-3 text-sm text-slate-400">
              Try clearing filters or check back soon as employers add new opportunities.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-[#16cdb8]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear all filters
            </button>
          </div>
        )}
      </section>

      {!loading && hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleLoadMore}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-[#08090C] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Load more jobs
            <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </PageShell>
  );
}

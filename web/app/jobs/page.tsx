"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  BriefcaseIcon,
  MapPinIcon,
  BookmarkIcon,
  BellIcon,
  CurrencyDollarIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { BookmarkIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import {
  listJobPostings,
  listSavedJobIds,
  toggleSavedJob,
} from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import CreateJobAlertModal from "@/components/CreateJobAlertModal";

const JOB_TYPES = ["All", "Full-time", "Part-time", "Contract", "Seasonal", "Internship"] as const;
type JobType = typeof JOB_TYPES[number];

type MaybeDateInput = string | Date | { toDate: () => Date } | null | undefined;

const getTimeValue = (value: MaybeDateInput, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (value instanceof Date) return value.getTime();
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

function JobsContent() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, role } = useAuth();
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState<JobType>("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        setError(null);
        const data = await listJobPostings({ activeOnly: true });
        setJobs(data);
      } catch (err) {
        console.error("Failed to load jobs", err);
        setError("Unable to load jobs right now.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        if (shouldSave) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle saved job", err);
    } finally {
      setSavingJobId(null);
    }
  };

  // Filtered jobs
  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.active) return false;

      const matchesSearch = search
        ? `${job.title ?? ""} ${job.employerName ?? ""} ${job.description ?? ""} ${job.location ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesLocation = location
        ? (job.location ?? "").toLowerCase().includes(location.toLowerCase())
        : true;

      const matchesType = jobType === "All" ||
        (job.employmentType ?? "").toLowerCase() === jobType.toLowerCase();

      const matchesRemote = !remoteOnly ||
        job.remoteFlag ||
        (job.location ?? "").toLowerCase().includes("remote");

      const matchesIndigenous = !indigenousOnly || Boolean(job.indigenousPreference);

      const matchesSaved = !savedOnly || savedJobIds.has(job.id);

      return matchesSearch && matchesLocation && matchesType && matchesRemote && matchesIndigenous && matchesSaved;
    });
  }, [jobs, search, location, jobType, remoteOnly, indigenousOnly, savedOnly, savedJobIds]);

  // Sort by newest first
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aDate = getTimeValue(a.createdAt ?? null, 0);
      const bDate = getTimeValue(b.createdAt ?? null, 0);
      return bDate - aDate;
    });
  }, [filtered]);

  // Get featured jobs (Indigenous preference or remote)
  const featuredJobs = useMemo(() => {
    return sorted.filter((job) => job.indigenousPreference).slice(0, 3);
  }, [sorted]);

  const displayedJobs = useMemo(
    () => sorted.slice(0, displayLimit),
    [displayLimit, sorted]
  );

  const hasMore = displayLimit < sorted.length;
  const hasFilters = search || location || jobType !== "All" || remoteOnly || indigenousOnly || savedOnly;

  const clearFilters = () => {
    setSearch("");
    setLocation("");
    setJobType("All");
    setRemoteOnly(false);
    setIndigenousOnly(false);
    setSavedOnly(false);
    setDisplayLimit(12);
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="jobs-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#jobs-grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Jobs & Careers
          </h1>
          <p className="mt-4 text-lg text-orange-100 sm:text-xl">
            Build your career with employers committed to Indigenous talent and community success.
            Find opportunities across Turtle Island.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 text-white transition-colors hover:bg-white/20"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
              {hasFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-orange-600">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Quick Actions */}
          {role === "community" && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setShowAlertModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
              >
                <BellIcon className="h-4 w-4" />
                Create Job Alert
              </button>
              <button
                onClick={() => setSavedOnly(!savedOnly)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  savedOnly
                    ? "bg-white text-orange-600"
                    : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
                }`}
              >
                <BookmarkIcon className="h-4 w-4" />
                Saved Jobs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Location */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, province, or remote"
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Job Type */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Job Type</label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.slice(0, 4).map((type) => (
                  <button
                    key={type}
                    onClick={() => setJobType(type)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      jobType === type
                        ? "bg-orange-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Remote Toggle */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Work Style</label>
              <button
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  remoteOnly
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Remote / Hybrid Only
              </button>
            </div>

            {/* Indigenous Preference */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Preference</label>
              <button
                onClick={() => setIndigenousOnly(!indigenousOnly)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  indigenousOnly
                    ? "bg-teal-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Indigenous Preference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Jobs Section */}
      {!hasFilters && featuredJobs.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Indigenous Preference Jobs</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                featured
                isSaved={savedJobIds.has(job.id)}
                onToggleSave={() => handleToggleSave(job.id)}
                saving={savingJobId === job.id}
                showSaveButton={role === "community"}
              />
            ))}
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* All Jobs */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {hasFilters ? "Search Results" : "All Jobs"}
          </h2>
          <span className="text-sm text-slate-400">
            {loading ? "Loading..." : `${sorted.length} ${sorted.length === 1 ? "job" : "jobs"}`}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-72" />
            ))}
          </div>
        ) : jobs.length === 0 && !hasFilters ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <BriefcaseIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No jobs posted yet</h3>
            <p className="text-slate-400">
              Check back soon! Employers are adding new opportunities regularly.
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-slate-400 mb-4">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={savedJobIds.has(job.id)}
                  onToggleSave={() => handleToggleSave(job.id)}
                  saving={savingJobId === job.id}
                  showSaveButton={role === "community"}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-orange-500 hover:text-orange-400"
                >
                  Load more jobs
                  <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA Section */}
      <section className="mt-16 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Hiring Indigenous Talent?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Post your job on IOPPS. Reach Indigenous professionals and community members across North America.
        </p>
        <a
          href="/organization/jobs/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105"
        >
          Post a Job
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </section>

      {/* Job Alert Modal */}
      {showAlertModal && (
        <CreateJobAlertModal
          initialKeywords={search}
          initialLocation={location}
          onClose={() => setShowAlertModal(false)}
        />
      )}
    </PageShell>
  );
}

// Job Card Component
function JobCard({
  job,
  featured = false,
  isSaved,
  onToggleSave,
  saving,
  showSaveButton,
}: {
  job: JobPosting;
  featured?: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
  saving: boolean;
  showSaveButton: boolean;
}) {
  const deadline = formatDate(job.closingDate ?? null);

  const getSalaryDisplay = () => {
    if (!job.salaryRange) return null;
    if (typeof job.salaryRange === "string") return job.salaryRange;
    if (job.salaryRange.disclosed === false) return "Competitive";
    if (job.salaryRange.min && job.salaryRange.max) {
      return `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()}`;
    }
    if (job.salaryRange.min) return `From $${job.salaryRange.min.toLocaleString()}`;
    if (job.salaryRange.max) return `Up to $${job.salaryRange.max.toLocaleString()}`;
    return null;
  };

  const salary = getSalaryDisplay();

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${
        featured
          ? "border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-emerald-500/5"
          : "border-slate-700 bg-slate-800/50 hover:border-orange-500/50"
      }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-orange-500/20 to-amber-500/10 px-5 py-5">
        {/* Save Button */}
        {showSaveButton && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleSave();
            }}
            disabled={saving}
            className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              isSaved
                ? "bg-amber-500 text-white"
                : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
            }`}
          >
            {isSaved ? (
              <BookmarkSolidIcon className="h-4 w-4" />
            ) : (
              <BookmarkIcon className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Indigenous Preference Badge */}
        {job.indigenousPreference && (
          <div className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-2.5 py-1 text-xs font-semibold text-teal-300 mb-2">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Indigenous Preference
          </div>
        )}

        {/* Employment Type & Remote */}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
            {job.employmentType || "Full-time"}
          </span>
          {job.remoteFlag && (
            <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-300">
              Remote
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {job.employerName && (
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">
            {job.employerName}
          </p>
        )}

        <Link href={`/jobs/${job.id}`}>
          <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-orange-300 transition-colors cursor-pointer">
            {job.title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{job.location}</span>
        </div>

        {salary && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
            <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0" />
            <span>{salary}</span>
          </div>
        )}

        {job.description && (
          <p className="mt-3 text-sm text-slate-300 line-clamp-2 flex-1">
            {job.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
          {deadline ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarIcon className="h-4 w-4" />
              <span>Closes {deadline}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Open until filled</span>
          )}
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-400 group-hover:gap-2 transition-all"
          >
            View
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="mx-auto max-w-7xl">
            <div className="h-64 w-full animate-pulse rounded-3xl bg-slate-800/50 mb-12" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-slate-800/50"
                />
              ))}
            </div>
          </div>
        </PageShell>
      }
    >
      <JobsContent />
    </Suspense>
  );
}

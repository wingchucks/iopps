"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { listJobPostings, listSavedJobIds, toggleSavedJob } from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

const sampleJobs: JobPosting[] = [
  {
    id: "job-1",
    employerId: "demo",
    employerName: "Northern Lights Friendship Centre",
    title: "Community Wellness Coordinator",
    location: "Thunder Bay, ON",
    employmentType: "Full-time",
    description:
      "Lead cultural programming, coordinate workshops, and connect community members with health resources.",
    responsibilities: [],
    qualifications: [],
    salaryRange: "$62,000 - $70,000",
    indigenousPreference: true,
    active: true,
  },
  {
    id: "job-2",
    employerId: "demo",
    employerName: "PrairieTech Solutions",
    title: "Indigenous Partnerships Advisor",
    location: "Calgary, AB (Hybrid)",
    employmentType: "Hybrid",
    description:
      "Shape strategic partnerships with Indigenous communities and support reconciliation initiatives.",
    responsibilities: [],
    qualifications: [],
    remoteFlag: true,
    salaryRange: "$85,000 - $96,000",
    active: true,
  },
];

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

type MaybeDateInput =
  | string
  | Date
  | { toDate: () => Date }
  | null
  | undefined;

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

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["value"]>(
    "newest"
  );
  const { user, role } = useAuth();
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        setError(null);
        const data = await listJobPostings({
          employmentType: typeFilter !== "All" ? typeFilter : undefined,
          remoteOnly,
          indigenousOnly,
          activeOnly,
        });
        setJobs(data);
      } catch (err) {
        console.error("Failed to load jobs", err);
        setError("We couldn't load jobs right now. Please try again in a moment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeOnly, indigenousOnly, remoteOnly, typeFilter]);

  const listings = jobs.length > 0 ? jobs : sampleJobs;

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
      const matchesKeyword = keyword
        ? text.includes(keyword.toLowerCase())
        : true;
      const matchesLocation = locationFilter
        ? (job.location ?? "")
            .toLowerCase()
            .includes(locationFilter.toLowerCase())
        : true;
      const matchesType =
        typeFilter === "All" ||
        (job.employmentType ?? "").toLowerCase() ===
          typeFilter.toLowerCase();
      const matchesRemote = !remoteOnly
        ? true
        : job.remoteFlag ||
          (job.location ?? "").toLowerCase().includes("remote");
      const matchesIndigenous = !indigenousOnly
        ? true
        : Boolean(job.indigenousPreference);

      const matchesActive = !activeOnly ? true : job.active;
      return (
        matchesKeyword &&
        matchesLocation &&
        matchesType &&
        matchesRemote &&
        matchesIndigenous &&
        matchesActive
      );
    });
  }, [
    activeOnly,
    indigenousOnly,
    keyword,
    listings,
    locationFilter,
    remoteOnly,
    typeFilter,
  ]);

  const sortedJobs = useMemo(() => {
    const copy = [...filteredJobs];
    switch (sortBy) {
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
  }, [filteredJobs, sortBy]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Indigenous job board
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Opportunities shared by partners across Turtle Island. When employers
            publish a job it appears here and in the upcoming mobile app.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          {loading ? "Loading jobs..." : `Showing ${sortedJobs.length} jobs`}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search title or organization"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Location
            </label>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="City / province / remote"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Job type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {employmentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as (typeof sortOptions)[number]["value"]
                )
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            Remote/hybrid only
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={indigenousOnly}
              onChange={(e) => setIndigenousOnly(e.target.checked)}
            />
            Indigenous preference only
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active roles only
          </label>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setLocationFilter("");
              setTypeFilter("All");
              setRemoteOnly(false);
              setIndigenousOnly(false);
              setActiveOnly(true);
              setSortBy("newest");
            }}
            className="text-xs text-teal-300 underline"
          >
            Reset filters
          </button>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200 shadow-inner shadow-black/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              For employers
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-50">
              Ready to post jobs across Indigenous communities?
            </h2>
            <p className="text-slate-300">
              Share roles, conferences, and scholarships from your employer
              dashboard and meet Indigenous talent nationwide.
            </p>
          </div>
            <div className="flex flex-col gap-2 text-xs font-semibold sm:flex-row">
              <ButtonLink href="/employer">Go to employer portal</ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Talk to IOPPS
              </ButtonLink>
            </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4">
        {sortedJobs.map((job) => (
          <article
            key={job.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-teal-500"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <div>
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-lg font-semibold text-slate-50 hover:text-teal-300"
                >
                  {job.title}
                </Link>
                <p className="text-sm text-slate-300">
                  {job.employerName || "Employer"}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200">
                {job.employmentType}
              </span>
            </div>
            {role === "community" && (
              <button
                onClick={() => handleToggleSave(job.id)}
                disabled={savingJobId === job.id}
                className={`mt-2 w-max rounded-md border px-3 py-1 text-xs ${
                  savedJobIds.has(job.id)
                    ? "border-teal-400 text-teal-200"
                    : "border-slate-700 text-slate-300 hover:border-teal-400 hover:text-teal-200"
                }`}
              >
                {savedJobIds.has(job.id)
                  ? savingJobId === job.id
                    ? "Updating..."
                    : "Saved"
                  : savingJobId === job.id
                  ? "Saving..."
                  : "Save"}
              </button>
            )}
            <p className="mt-3 text-sm text-slate-300">
              {job.description?.slice(0, 180)}
              {job.description && job.description.length > 180 ? "..." : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>{job.location}</span>
              {job.remoteFlag && <span>Remote friendly</span>}
              {job.indigenousPreference && (
                <span className="rounded-full bg-teal-500/10 px-3 py-1 text-teal-200">
                  Indigenous preference
                </span>
              )}
              {job.salaryRange && <span>{job.salaryRange}</span>}
            </div>
          </article>
        ))}
        {!loading && sortedJobs.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-300">
            No jobs match your filters yet. Try clearing filters or check back
            soon as employers add new opportunities.
          </div>
        )}
      </div>
    </div>
  );
}

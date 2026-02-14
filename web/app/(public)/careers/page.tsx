"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Input,
  Select,
  Badge,
  Button,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import type { JobPosting } from "@/lib/firestore/jobs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "Full-time", value: "Full-time" },
  { label: "Part-time", value: "Part-time" },
  { label: "Contract", value: "Contract" },
  { label: "Internship", value: "Internship" },
  { label: "Casual", value: "Casual" },
];

const CATEGORY_OPTIONS = [
  { label: "All Categories", value: "" },
  { label: "Technology", value: "Technology" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "Education", value: "Education" },
  { label: "Construction", value: "Construction" },
  { label: "Finance", value: "Finance" },
  { label: "Government", value: "Government" },
  { label: "Non-Profit", value: "Non-Profit" },
  { label: "Trades", value: "Trades" },
  { label: "Arts & Culture", value: "Arts & Culture" },
  { label: "Environment", value: "Environment" },
  { label: "Legal", value: "Legal" },
];

const LOCATION_OPTIONS = [
  { label: "All Locations", value: "" },
  { label: "Alberta", value: "Alberta" },
  { label: "British Columbia", value: "British Columbia" },
  { label: "Manitoba", value: "Manitoba" },
  { label: "New Brunswick", value: "New Brunswick" },
  { label: "Newfoundland and Labrador", value: "Newfoundland and Labrador" },
  { label: "Northwest Territories", value: "Northwest Territories" },
  { label: "Nova Scotia", value: "Nova Scotia" },
  { label: "Nunavut", value: "Nunavut" },
  { label: "Ontario", value: "Ontario" },
  { label: "Prince Edward Island", value: "Prince Edward Island" },
  { label: "Quebec", value: "Quebec" },
  { label: "Saskatchewan", value: "Saskatchewan" },
  { label: "Yukon", value: "Yukon" },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Firestore timestamp-like value into a human-readable relative date */
function formatRelativeDate(
  timestamp: unknown,
): string {
  if (!timestamp) return "";

  let date: Date | null = null;

  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string") {
    date = new Date(timestamp);
  } else if (typeof timestamp === "object" && timestamp !== null) {
    const ts = timestamp as Record<string, unknown>;
    if (typeof ts._seconds === "number") {
      date = new Date(ts._seconds * 1000);
    } else if (typeof ts.seconds === "number") {
      date = new Date((ts.seconds as number) * 1000);
    }
  }

  if (!date || isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

/** Format salary range for display */
function formatSalaryRange(
  salary: JobPosting["salaryRange"],
): string {
  if (!salary) return "";
  if (typeof salary === "string") return salary;
  if (salary.disclosed === false) return "";

  const { min, max, period } = salary;
  const currency = salary.currency || "CAD";
  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const periodLabel = period ? `/${period}` : "/year";

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}${periodLabel}`;
  }
  if (min) return `From ${formatter.format(min)}${periodLabel}`;
  if (max) return `Up to ${formatter.format(max)}${periodLabel}`;
  return "";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JobCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton variant="rectangular" className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCard({ job }: { job: JobPosting }) {
  const salary = formatSalaryRange(job.salaryRange);
  const postedDate = formatRelativeDate(job.createdAt);
  const companyName = job.employerName || job.companyName || "Company";

  return (
    <Link href={`/careers/${job.id}`} className="block group">
      <Card className="transition-all duration-200 hover:border-accent/40 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Company logo or fallback */}
            {job.companyLogoUrl ? (
              <img
                src={job.companyLogoUrl}
                alt={`${companyName} logo`}
                className="h-12 w-12 rounded-lg border border-card-border object-contain bg-surface"
                loading="lazy"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-card-border bg-surface text-lg font-bold text-text-muted">
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                {job.title}
              </h3>
              <p className="mt-0.5 text-sm text-text-secondary truncate">
                {companyName}
              </p>

              {/* Metadata row */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {job.employmentType && (
                  <Badge>{job.employmentType}</Badge>
                )}
                {job.location && (
                  <Badge variant="info">{job.location}</Badge>
                )}
                {job.remoteFlag && (
                  <Badge variant="success">Remote</Badge>
                )}
                {job.indigenousPreference && (
                  <Badge variant="warning">Indigenous Preference</Badge>
                )}
              </div>

              {/* Salary and date */}
              <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                <span>{salary || "Salary not disclosed"}</span>
                {postedDate && <span>{postedDate}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

interface JobsApiResponse {
  jobs: JobPosting[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    pageSize: number;
  };
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchJobs = useCallback(
    async (loadMore = false) => {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));

        if (debouncedSearch) params.set("q", debouncedSearch);
        if (employmentType) params.set("type", employmentType);
        if (category) params.set("category", category);
        if (location) params.set("location", location);
        if (loadMore && cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/jobs?${params.toString()}`);

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data: JobsApiResponse = await res.json();

        if (loadMore) {
          setJobs((prev) => [...prev, ...data.jobs]);
        } else {
          setJobs(data.jobs);
        }

        setCursor(data.pagination.cursor);
        setHasMore(data.pagination.hasMore);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, employmentType, category, location, cursor],
  );

  // Reset pagination and fetch when filters change
  useEffect(() => {
    setCursor(null);
    fetchJobs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, employmentType, category, location]);

  const handleLoadMore = () => {
    fetchJobs(true);
  };

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    employmentType.length > 0 ||
    category.length > 0 ||
    location.length > 0;

  const clearFilters = () => {
    setSearch("");
    setEmploymentType("");
    setCategory("");
    setLocation("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Careers</h1>
          <p className="mt-2 text-text-secondary">
            Discover Indigenous job opportunities across Canada.
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          <Input
            placeholder="Search by job title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="job-search"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              options={EMPLOYMENT_TYPE_OPTIONS}
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              name="employment-type"
            />
            <Select
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              name="category"
            />
            <Select
              options={LOCATION_OPTIONS}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              name="location"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {loading ? "Searching..." : `${jobs.length} result${jobs.length !== 1 ? "s" : ""} found`}
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Job listings */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            }
            title="No jobs found"
            description={
              hasActiveFilters
                ? "Try adjusting your search or filters to find more opportunities."
                : "No job postings are available right now. Check back soon."
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  loading={loadingMore}
                >
                  Load more jobs
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

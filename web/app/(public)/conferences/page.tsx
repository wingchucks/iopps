"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import type { Conference } from "@/lib/firestore/conferences";

// ============================================
// CONSTANTS
// ============================================

const FORMAT_OPTIONS = [
  { label: "All Formats", value: "" },
  { label: "In-Person", value: "in-person" },
  { label: "Virtual", value: "virtual" },
  { label: "Hybrid", value: "hybrid" },
] as const;

const PAGE_SIZE = 12;

// ============================================
// HELPERS
// ============================================

function toDateSafe(
  value: Conference["startDate"],
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof value.toDate === "function") {
      return value.toDate();
    }
    if ("_seconds" in value) {
      return new Date(
        (value as { _seconds: number })._seconds * 1000,
      );
    }
    if ("seconds" in value) {
      return new Date(
        (value as { seconds: number }).seconds * 1000,
      );
    }
  }
  return null;
}

function formatDateRange(
  startDate: Conference["startDate"],
  endDate: Conference["endDate"],
): string {
  const start = toDateSafe(startDate);
  const end = toDateSafe(endDate);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (start && end) {
    return `${start.toLocaleDateString("en-CA", opts)} - ${end.toLocaleDateString("en-CA", opts)}`;
  }
  if (start) {
    return start.toLocaleDateString("en-CA", opts);
  }
  return "Date TBD";
}

// ============================================
// TYPES
// ============================================

interface ConferencesApiResponse {
  conferences: Conference[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// COMPONENT
// ============================================

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<ConferencesApiResponse["pagination"] | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("");

  const fetchConferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/conferences?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch conferences");

      const data: ConferencesApiResponse = await res.json();
      setConferences(data.conferences);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to load conferences:", err);
      setError("Unable to load conferences right now. Please try again.");
      setConferences([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchConferences();
  }, [fetchConferences]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [format]);

  // Client-side filtering for search and format
  const filtered = useMemo(() => {
    return conferences.filter((conf) => {
      const matchesSearch = search.trim()
        ? `${conf.title} ${conf.description} ${conf.location} ${conf.organizerName ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesFormat = format
        ? conf.eventType === format
        : true;

      return matchesSearch && matchesFormat;
    });
  }, [conferences, search, format]);

  const hasActiveFilters = Boolean(search || format);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFormat("");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 pb-24">
        {/* Hero Section */}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
            Conferences &amp; Summits
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
            Connect, learn, and celebrate Indigenous leadership at professional
            gatherings across Turtle Island.
          </p>
        </section>

        {/* Filters */}
        <section className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by title, location, or organizer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              options={[...FORMAT_OPTIONS]}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="Event Format"
            />
          </div>
        </section>

        {hasActiveFilters && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {filtered.length} {filtered.length === 1 ? "result" : "results"}{" "}
              found
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="mb-6 border-error/30 bg-error/5">
            <CardContent className="p-4 text-sm text-error">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-3 h-6 w-3/4" />
                  <Skeleton className="mb-2 h-4 w-1/2" />
                  <Skeleton className="mb-2 h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <EmptyState
            title="No conferences found"
            description={
              hasActiveFilters
                ? "Try adjusting your search or filters."
                : "No conferences scheduled right now. Check back soon!"
            }
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Conference Cards Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((conference) => (
              <ConferenceCard key={conference.id} conference={conference} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <section className="mt-16 rounded-2xl border border-card-border bg-card p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold text-text-primary">
            Hosting a Conference?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-text-secondary">
            List your conference or summit on IOPPS and reach Indigenous
            professionals across Canada. Conference posting is free.
          </p>
          <div className="mt-6">
            <Button href="/organization/conferences/new" size="lg">
              Post a Conference
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================
// CONFERENCE CARD
// ============================================

function ConferenceCard({ conference }: { conference: Conference }) {
  const dateStr = formatDateRange(conference.startDate, conference.endDate);

  return (
    <Link href={`/conferences/${conference.id}`} className="group">
      <Card className="h-full transition-all duration-200 hover:border-card-border-hover hover:shadow-md">
        <CardContent className="p-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2">
              {conference.title}
            </h2>
            {conference.featured && (
              <Badge variant="warning" className="shrink-0">
                Featured
              </Badge>
            )}
          </div>

          {(conference.organizerName || conference.employerName) && (
            <p className="mb-1 text-sm text-accent">
              {conference.organizerName || conference.employerName}
            </p>
          )}

          <div className="mb-3 flex items-center gap-1.5 text-sm text-text-secondary">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <span>{dateStr}</span>
          </div>

          <div className="mb-3 flex items-center gap-1.5 text-sm text-text-secondary">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <span className="line-clamp-1">{conference.location}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {conference.eventType && (
              <Badge variant="info" className="capitalize">
                {conference.eventType}
              </Badge>
            )}
            {conference.cost && (
              <Badge variant="default">{conference.cost}</Badge>
            )}
            {conference.indigenousFocused && (
              <Badge variant="success">Indigenous Focused</Badge>
            )}
          </div>

          {conference.description && (
            <p className="mt-3 text-sm text-text-muted line-clamp-2">
              {conference.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

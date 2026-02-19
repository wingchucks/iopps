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
import type { Scholarship } from "@/lib/firestore/scholarships";

// ============================================
// CONSTANTS
// ============================================

const AWARD_TYPES = [
  { label: "All Types", value: "" },
  { label: "Scholarship", value: "Scholarship" },
  { label: "Grant", value: "Grant" },
  { label: "Bursary", value: "Bursary" },
] as const;

const EDUCATION_LEVELS = [
  { label: "All Levels", value: "" },
  { label: "High School", value: "High School" },
  { label: "Post-secondary", value: "Post-secondary" },
  { label: "Graduate", value: "Graduate" },
  { label: "Community", value: "Community" },
] as const;

const DEADLINE_OPTIONS = [
  { label: "All Deadlines", value: "all" },
  { label: "This Month", value: "month" },
  { label: "Next 3 Months", value: "quarter" },
  { label: "This Year", value: "year" },
] as const;

const PAGE_SIZE = 12;

type DeadlineRange = (typeof DEADLINE_OPTIONS)[number]["value"];

// ============================================
// HELPERS
// ============================================

/**
 * Convert a Firestore timestamp-like value to a Date.
 * Handles _seconds objects, string dates, and native Dates.
 */
function toDateSafe(
  value: Scholarship["deadline"],
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

function formatDeadline(value: Scholarship["deadline"]): string | null {
  const date = toDateSafe(value);
  if (!date) return null;
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDeadlineUrgency(
  value: Scholarship["deadline"],
): "expired" | "urgent" | "soon" | "normal" | null {
  const date = toDateSafe(value);
  if (!date) return null;
  const now = new Date();
  const daysUntil = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "urgent";
  if (daysUntil <= 30) return "soon";
  return "normal";
}

function isWithinDeadlineRange(
  deadline: Scholarship["deadline"],
  range: DeadlineRange,
): boolean {
  if (range === "all") return true;
  const date = toDateSafe(deadline);
  if (!date) return true; // Include items without deadlines
  const now = new Date();
  if (date < now) return false;
  switch (range) {
    case "month":
      return date <= new Date(now.getFullYear(), now.getMonth() + 1, 0);
    case "quarter": {
      const endOfQuarter = new Date(now);
      endOfQuarter.setMonth(now.getMonth() + 3);
      return date <= endOfQuarter;
    }
    case "year":
      return date <= new Date(now.getFullYear(), 11, 31);
    default:
      return true;
  }
}

function formatAmount(amount: Scholarship["amount"]): string | null {
  if (!amount) return null;
  if (typeof amount === "string") return amount;
  if (typeof amount === "number") {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
    }).format(amount);
  }
  return null;
}

// ============================================
// TYPES
// ============================================

interface ScholarshipsApiResponse {
  scholarships: Scholarship[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================
// COMPONENT
// ============================================

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // Filter state
  const [search, setSearch] = useState("");
  const [awardType, setAwardType] = useState("");
  const [level, setLevel] = useState("");
  const [deadlineRange, setDeadlineRange] = useState<DeadlineRange>("all");

  useEffect(() => {
    async function loadScholarships() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all active scholarships; client-side filtering mirrors v1 approach
        const params = new URLSearchParams();
        if (awardType) params.set("type", awardType);
        if (level) params.set("level", level);
        params.set("limit", "200");
        params.set("page", "1");

        const res = await fetch(
          `/api/education/scholarships?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to fetch scholarships");

        const data: ScholarshipsApiResponse = await res.json();
        setScholarships(data.scholarships);
      } catch (err) {
        console.error("Failed to load scholarships:", err);
        setError("Unable to load scholarships right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void loadScholarships();
  }, [awardType, level]);

  // Client-side text search and deadline filtering
  const filtered = useMemo(() => {
    return scholarships.filter((item) => {
      const matchesSearch = search
        ? `${item.title} ${item.provider} ${item.description ?? ""} ${item.region ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;
      const matchesDeadline = isWithinDeadlineRange(
        item.deadline,
        deadlineRange,
      );
      return matchesSearch && matchesDeadline;
    });
  }, [scholarships, search, deadlineRange]);

  // Sort by deadline (soonest first), items without deadline at the end
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aDate = toDateSafe(a.deadline);
      const bDate = toDateSafe(b.deadline);
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
  }, [filtered]);

  const displayed = useMemo(
    () => sorted.slice(0, displayLimit),
    [sorted, displayLimit],
  );

  const hasMore = displayLimit < sorted.length;

  const hasActiveFilters = Boolean(
    search || awardType || level || deadlineRange !== "all",
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setAwardType("");
    setLevel("");
    setDeadlineRange("all");
    setDisplayLimit(PAGE_SIZE);
  }, []);

  return (
    <div className="bg-background min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-card-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-text-muted">
            <Link
              href="/"
              className="hover:text-text-primary transition-colors"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/education"
              className="hover:text-text-primary transition-colors"
            >
              Education
            </Link>
            <span>/</span>
            <span className="text-text-primary">Scholarships</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-text-primary">
          Scholarships & Funding
        </h1>
        <p className="mt-2 text-text-secondary">
          Funding Indigenous learners and community leaders. Browse
          scholarships, bursaries, and grants.
        </p>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <Input
                  placeholder="Search scholarships..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                options={[...AWARD_TYPES]}
                value={awardType}
                onChange={(e) => setAwardType(e.target.value)}
                placeholder="Award Type"
              />
              <Select
                options={[...EDUCATION_LEVELS]}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="Education Level"
              />
              <Select
                options={[...DEADLINE_OPTIONS]}
                value={deadlineRange}
                onChange={(e) =>
                  setDeadlineRange(e.target.value as DeadlineRange)
                }
                placeholder="Deadline"
              />
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  {sorted.length}{" "}
                  {sorted.length === 1 ? "result" : "results"} found
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Error state */}
        {error && (
          <Card className="mb-6 border-error/30 bg-error/5">
            <CardContent className="p-4 text-sm text-error">
              {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton variant="rectangular" className="mb-4 h-10 w-24" />
                  <Skeleton className="mb-2 h-5" />
                  <Skeleton className="mb-4 w-2/3" />
                  <Skeleton className="h-4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            }
            title={
              hasActiveFilters
                ? "No scholarships match your filters"
                : "No scholarships available"
            }
            description={
              hasActiveFilters
                ? "Try adjusting your search terms or filters."
                : "Check back soon! Organizations are adding scholarship opportunities regularly."
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
            {/* Results header */}
            {!hasActiveFilters && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">
                  All Scholarships
                </h2>
                <span className="text-sm text-text-muted">
                  {sorted.length}{" "}
                  {sorted.length === 1 ? "scholarship" : "scholarships"}
                </span>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((scholarship) => (
                <ScholarshipCard
                  key={scholarship.id}
                  scholarship={scholarship}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setDisplayLimit((prev) => prev + PAGE_SIZE)
                  }
                >
                  Load more scholarships
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Section */}
      <section className="border-t border-card-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
            Offering a Scholarship or Grant?
          </h2>
          <p className="mt-3 text-text-secondary max-w-2xl mx-auto">
            List your scholarship, bursary, or community grant on IOPPS. Help
            fund the next generation of Indigenous leaders.
          </p>
          <div className="mt-6">
            <Button href="/organization/scholarships/new" size="lg">
              Post a Scholarship
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================
// SCHOLARSHIP CARD
// ============================================

function ScholarshipCard({ scholarship }: { scholarship: Scholarship }) {
  const deadline = formatDeadline(scholarship.deadline);
  const urgency = getDeadlineUrgency(scholarship.deadline);
  const isExpired = urgency === "expired";
  const formattedAmount = formatAmount(scholarship.amount);

  const urgencyStyles: Record<string, string> = {
    expired: "text-error",
    urgent: "text-warning",
    soon: "text-amber",
    normal: "text-text-secondary",
  };

  return (
    <Link
      href={`/education/scholarships/${scholarship.id}`}
      className="group"
    >
      <Card className="flex h-full flex-col transition-all duration-200 hover:border-card-border-hover hover:-translate-y-1">
        {/* Amount header */}
        <div className="border-b border-card-border bg-accent-bg p-5">
          {formattedAmount && (
            <div className="text-2xl font-bold text-accent">
              {formattedAmount}
            </div>
          )}
          {scholarship.type && (
            <Badge
              variant="default"
              className="mt-2"
            >
              {scholarship.type}
            </Badge>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors">
            {scholarship.title}
          </h3>
          <p className="mt-1 text-sm text-text-muted">{scholarship.provider}</p>

          {scholarship.description && (
            <p className="mt-3 text-sm text-text-secondary line-clamp-2 flex-1">
              {scholarship.description}
            </p>
          )}

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {scholarship.level && (
              <Badge variant="info">{scholarship.level}</Badge>
            )}
            {scholarship.region && (
              <Badge variant="default">{scholarship.region}</Badge>
            )}
          </div>

          {/* Deadline */}
          {deadline && (
            <div className="mt-4 flex items-center gap-2 border-t border-card-border pt-4">
              <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span
                className={`text-sm font-medium ${urgency ? urgencyStyles[urgency] : "text-text-secondary"}`}
              >
                {isExpired ? "Expired" : `Due ${deadline}`}
              </span>
              {urgency === "urgent" && (
                <Badge variant="warning">Closing Soon</Badge>
              )}
            </div>
          )}

          {/* Recurring indicator */}
          {scholarship.isRecurring && scholarship.recurringSchedule && (
            <div className="mt-3 flex items-center gap-2 text-sm text-info">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              <span className="font-medium">
                Recurring: {scholarship.recurringSchedule}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

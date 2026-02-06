"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, MapPinIcon, TicketIcon } from "@heroicons/react/24/outline";
import { listConferences } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SimplePageHeader } from "@/components/SimplePageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  SearchBarRow,
  FiltersDrawer,
  ResultsHeader,
  DiscoveryGrid,
  LoadingGrid,
  LoadMoreButton,
  FilterGroup,
} from "@/components/discovery";

const TIMEFRAME_OPTIONS = [
  { label: "All Dates", value: "all" },
  { label: "This Month", value: "month" },
  { label: "Next 3 Months", value: "quarter" },
  { label: "This Year", value: "year" },
] as const;

const COST_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "Paid", value: "paid" },
] as const;

type TimeframeValue = typeof TIMEFRAME_OPTIONS[number]["value"];
type CostValue = typeof COST_OPTIONS[number]["value"];

type MaybeDate = string | Date | { toDate: () => Date } | null | undefined;

// Helper to parse date string as local time (not UTC) for date-only strings
const parseDateString = (value: string): Date => {
  // If it's a date-only string (YYYY-MM-DD), parse as local time not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const getTimeValue = (value: MaybeDate, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    const ms = parseDateString(value).getTime();
    return Number.isNaN(ms) ? fallback : ms;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && "toDate" in value) {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : fallback;
  }
  return fallback;
};

const formatDate = (value: MaybeDate): string | null => {
  if (!value) return null;
  try {
    let date: Date;
    if (typeof value === "string") {
      date = parseDateString(value);
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "object" && "toDate" in value) {
      date = value.toDate();
    } else {
      return null;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return typeof value === "string" ? value : null;
  }
};

function ConferencesContent() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Filter state
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeValue>("all");
  const [costFilter, setCostFilter] = useState<CostValue>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listConferences();
        setConferences(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load conferences right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Check if conference is within timeframe
  const isWithinTimeframe = (startDate: MaybeDate, tf: TimeframeValue): boolean => {
    if (tf === "all") return true;

    const startTime = getTimeValue(startDate);
    if (startTime === Number.MAX_SAFE_INTEGER) return true;

    const now = Date.now();
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    const endOfQuarter = new Date();
    endOfQuarter.setMonth(endOfQuarter.getMonth() + 3);
    const endOfYear = new Date(new Date().getFullYear(), 11, 31);

    switch (tf) {
      case "month":
        return startTime <= endOfMonth.getTime() && startTime >= now;
      case "quarter":
        return startTime <= endOfQuarter.getTime() && startTime >= now;
      case "year":
        return startTime <= endOfYear.getTime() && startTime >= now;
      default:
        return true;
    }
  };

  // Check cost filter
  const matchesCost = (cost: string | undefined, filter: CostValue): boolean => {
    if (filter === "all") return true;
    const isFree = !cost || cost.toLowerCase().includes("free") || cost.toLowerCase().includes("no cost");
    return filter === "free" ? isFree : !isFree;
  };

  // Filtered conferences
  const filtered = useMemo(() => {
    return conferences.filter((conf) => {
      if (!conf.active) return false;

      const matchesSearch = search
        ? `${conf.title} ${conf.employerName ?? ""} ${conf.description ?? ""} ${conf.location ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesTimeframe = isWithinTimeframe(conf.startDate, timeframe);
      const matchesCostFilter = matchesCost(conf.cost, costFilter);

      return matchesSearch && matchesTimeframe && matchesCostFilter;
    });
  }, [conferences, search, timeframe, costFilter]);

  // Sort by start date (soonest first), featured at top
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Featured first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      // Then by start date
      return getTimeValue(a.startDate) - getTimeValue(b.startDate);
    });
  }, [filtered]);

  // Get featured conferences
  const featuredConferences = useMemo(() => {
    return sorted.filter((conf) => conf.featured).slice(0, 3);
  }, [sorted]);

  const displayedConferences = useMemo(
    () => sorted.slice(0, displayLimit),
    [displayLimit, sorted]
  );

  const hasMore = displayLimit < sorted.length;
  const hasFilters = Boolean(search || timeframe !== "all" || costFilter !== "all");

  const clearFilters = () => {
    setSearch("");
    setTimeframe("all");
    setCostFilter("all");
    setDisplayLimit(12);
  };

  // Filter groups for FiltersDrawer
  const filterGroups: FilterGroup[] = [
    {
      id: "timeframe",
      label: "When",
      type: "chips",
      options: TIMEFRAME_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
      value: timeframe,
      onChange: (v) => setTimeframe(v as TimeframeValue),
    },
    {
      id: "cost",
      label: "Cost",
      type: "chips",
      options: COST_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
      value: costFilter,
      onChange: (v) => setCostFilter(v as CostValue),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SimplePageHeader
        title="Conferences & Summits"
        subtitle="Connect, learn, and celebrate Indigenous leadership. Explore professional gatherings from organizations across Turtle Island."
      />

      <PageShell>
        <SearchBarRow
          placeholder="Search conferences..."
          value={search}
          onChange={setSearch}
          onFiltersClick={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasFilters}
        />
        {/* Filters Panel */}
        <FiltersDrawer
          isOpen={showFilters}
          filters={filterGroups}
          onClearAll={clearFilters}
          hasActiveFilters={hasFilters}
        />

        {/* Featured Conferences Section */}
        {!hasFilters && featuredConferences.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Featured Conferences</h2>
            </div>
            <DiscoveryGrid>
              {featuredConferences.map((conf) => (
                <ConferenceCard key={conf.id} conference={conf} featured />
              ))}
            </DiscoveryGrid>
          </section>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* All Conferences */}
        <section>
          <ResultsHeader
            title="All Conferences"
            count={sorted.length}
            loading={loading}
            hasFilters={hasFilters}
          />

          {loading ? (
            <LoadingGrid count={6} height="h-72" />
          ) : conferences.length === 0 && !hasFilters ? (
            <EmptyState
              icon="conferences"
              title="No conferences scheduled yet"
              description="Check back soon! Organizations are adding conferences and summits regularly."
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon="search"
              title="No conferences found"
              description="Try adjusting your filters or search terms."
              action={{ label: "Clear filters", href: "#" }}
            />
          ) : (
            <>
              <DiscoveryGrid>
                {displayedConferences.map((conf) => (
                  <ConferenceCard key={conf.id} conference={conf} />
                ))}
              </DiscoveryGrid>
              {hasMore && (
                <LoadMoreButton
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  label="Load more conferences"
                />
              )}
            </>
          )}
        </section>
      </PageShell>

      {/* CTA Section - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Hosting a Conference or Summit?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                List your conference on IOPPS. Reach Indigenous professionals and community leaders across North America.
              </p>
              <Link
                href="/organization/conferences/new"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-lg font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Post a Conference
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Conference Card Component
function ConferenceCard({ conference, featured = false }: { conference: Conference; featured?: boolean }) {
  const startDate = formatDate(conference.startDate);
  const endDate = formatDate(conference.endDate);

  const isFree = !conference.cost ||
    conference.cost.toLowerCase().includes("free") ||
    conference.cost.toLowerCase().includes("no cost");

  return (
    <Link
      href={`/conferences/${conference.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${
        featured
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          : "border-slate-700 bg-slate-800/50 hover:border-[#14B8A6]/50"
      }`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#14B8A6]/20 to-cyan-600/10 px-5 py-6">
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </div>
        )}

        {/* Date */}
        {startDate && (
          <div className="flex items-center gap-2 text-[#14B8A6]">
            <CalendarDaysIcon className="h-5 w-5" />
            <span className="text-sm font-medium">
              {startDate}
              {endDate && endDate !== startDate && ` - ${endDate}`}
            </span>
          </div>
        )}

        {/* Cost Badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isFree
              ? "bg-[#14B8A6]/20 text-[#14B8A6]"
              : "bg-[#14B8A6]/20 text-[#14B8A6]"
          }`}>
            <TicketIcon className="h-3 w-3" />
            {isFree ? "Free" : conference.cost}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {conference.employerName && (
          <p className="text-xs font-semibold uppercase tracking-wider text-[#14B8A6] mb-1">
            {conference.employerName}
          </p>
        )}

        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
          {conference.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{conference.location}</span>
        </div>

        <p className="mt-3 text-sm text-slate-300 line-clamp-2 flex-1">
          {conference.description}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
          {conference.registrationLink ? (
            <span className="text-xs font-medium text-[#14B8A6]">
              Registration Open
            </span>
          ) : (
            <span className="text-xs text-slate-500">Details available</span>
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#14B8A6] group-hover:gap-2 transition-all">
            View details
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ConferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <SimplePageHeader
            title="Conferences & Summits"
            subtitle="Connect, learn, and celebrate Indigenous leadership."
          />
          <PageShell>
            <LoadingGrid count={6} height="h-72" />
          </PageShell>
        </div>
      }
    >
      <ConferencesContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, CalendarDaysIcon, MapPinIcon, TicketIcon } from "@heroicons/react/24/outline";
import { listConferences } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";

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

const getTimeValue = (value: MaybeDate, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
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
      date = new Date(value);
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
  const hasFilters = search || timeframe !== "all" || costFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTimeframe("all");
    setCostFilter("all");
    setDisplayLimit(12);
  };

  return (
    <div className="min-h-screen text-slate-100">
      {/* Gradient Hero - Mockup Style */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              Upcoming
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white/70 hover:bg-white/10 transition-colors">
              My RSVPs
            </button>
          </div>

          {/* Featured Conference Hero Card */}
          {featuredConferences.length > 0 && (
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/20 p-6 sm:p-8">
              <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-fuchsia-500/80 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Featured Conference
              </div>

              <div className="pt-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {featuredConferences[0].title}
                </h1>
                <p className="text-white/80 text-sm mb-4">
                  {formatDate(featuredConferences[0].startDate)}
                  {featuredConferences[0].endDate && formatDate(featuredConferences[0].endDate) !== formatDate(featuredConferences[0].startDate) &&
                    ` - ${formatDate(featuredConferences[0].endDate)}`
                  }
                  <span className="mx-2">•</span>
                  {featuredConferences[0].location}
                </p>

                {/* Connection Signal */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex -space-x-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`inline-block h-6 w-6 rounded-full ring-2 ring-fuchsia-500 ${['bg-orange-400', 'bg-blue-400', 'bg-purple-400'][i % 3]
                        }`} />
                    ))}
                  </div>
                  <span className="text-sm text-teal-300 font-medium">18 connections attending</span>
                  <span className="text-xs text-white/50">• 450+ registered</span>
                </div>

                {/* CTA */}
                <Link
                  href={`/conferences/${featuredConferences[0].id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <PageShell>

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

            <div className="grid gap-6 md:grid-cols-2">
              {/* Timeframe */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">When</label>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTimeframe(option.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${timeframe === option.value
                          ? "bg-[#14B8A6] text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Cost</label>
                <div className="flex flex-wrap gap-2">
                  {COST_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCostFilter(option.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${costFilter === option.value
                          ? "bg-[#14B8A6] text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredConferences.map((conf) => (
                <ConferenceCard key={conf.id} conference={conf} featured />
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

        {/* All Conferences */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {hasFilters ? "Search Results" : "All Conferences"}
            </h2>
            <span className="text-sm text-slate-400">
              {loading ? "Loading..." : `${sorted.length} ${sorted.length === 1 ? "conference" : "conferences"}`}
            </span>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-72" />
              ))}
            </div>
          ) : conferences.length === 0 && !hasFilters ? (
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <CalendarDaysIcon className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No conferences scheduled yet</h3>
              <p className="text-slate-400">
                Check back soon! Organizations are adding conferences and summits regularly.
              </p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No conferences found</h3>
              <p className="text-slate-400 mb-4">
                Try adjusting your filters or search terms.
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d9488] transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayedConferences.map((conf) => (
                  <ConferenceCard key={conf.id} conference={conf} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 12)}
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
                  >
                    Load more conferences
                    <svg className="h-4 w-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
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
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${featured
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
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isFree
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
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            eyebrow="Conferences & Summits"
            title="Connect & Learn"
            subtitle="Connect, learn, and celebrate Indigenous leadership. Explore conferences, summits, and professional gatherings from organizations across Turtle Island."
            size="md"
          />
          <PageShell>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-slate-800/50"
                />
              ))}
            </div>
          </PageShell>
        </div>
      }
    >
      <ConferencesContent />
    </Suspense>
  );
}

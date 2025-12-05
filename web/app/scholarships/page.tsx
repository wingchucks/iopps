"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, AcademicCapIcon, CurrencyDollarIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { listScholarships } from "@/lib/firestore";
import type { Scholarship } from "@/lib/types";
import { PageShell } from "@/components/PageShell";

const AWARD_TYPES = ["All", "Scholarship", "Grant", "Bursary"] as const;
const EDUCATION_LEVELS = ["All", "High School", "Post-secondary", "Graduate", "Community"] as const;
const DEADLINE_RANGES = [
  { label: "All Deadlines", value: "all" },
  { label: "This Month", value: "month" },
  { label: "Next 3 Months", value: "quarter" },
  { label: "This Year", value: "year" },
] as const;

type AwardType = typeof AWARD_TYPES[number];
type EducationLevel = typeof EDUCATION_LEVELS[number];
type DeadlineRange = typeof DEADLINE_RANGES[number]["value"];

const toDateValue = (value: Scholarship["deadline"]): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }
  return null;
};

function ScholarshipsContent() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Filter state
  const [search, setSearch] = useState("");
  const [awardType, setAwardType] = useState<AwardType>("All");
  const [level, setLevel] = useState<EducationLevel>("All");
  const [deadlineRange, setDeadlineRange] = useState<DeadlineRange>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listScholarships();
        setScholarships(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load scholarships right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Check if deadline is within range
  const isWithinDeadlineRange = (deadline: Scholarship["deadline"], range: DeadlineRange): boolean => {
    if (range === "all") return true;

    const deadlineDate = toDateValue(deadline);
    if (!deadlineDate) return true; // Include items without deadlines

    const now = new Date();
    if (deadlineDate < now) return false; // Expired

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endOfQuarter = new Date(now);
    endOfQuarter.setMonth(now.getMonth() + 3);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    switch (range) {
      case "month":
        return deadlineDate <= endOfMonth;
      case "quarter":
        return deadlineDate <= endOfQuarter;
      case "year":
        return deadlineDate <= endOfYear;
      default:
        return true;
    }
  };

  // Filtered scholarships
  const filtered = useMemo(() => {
    return scholarships.filter((item) => {
      if (!item.active) return false;

      const matchesSearch = search
        ? `${item.title} ${item.provider} ${item.description ?? ""} ${item.region ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesType = awardType === "All" || item.type === awardType;
      const matchesLevel = level === "All" || item.level === level;
      const matchesDeadline = isWithinDeadlineRange(item.deadline, deadlineRange);

      return matchesSearch && matchesType && matchesLevel && matchesDeadline;
    });
  }, [scholarships, search, awardType, level, deadlineRange]);

  // Sort by deadline (soonest first)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aDeadline = toDateValue(a.deadline);
      const bDeadline = toDateValue(b.deadline);
      if (!aDeadline) return 1;
      if (!bDeadline) return -1;
      return aDeadline.getTime() - bDeadline.getTime();
    });
  }, [filtered]);

  // Get featured/high-value scholarships
  const featuredScholarships = useMemo(() => {
    return sorted
      .filter((s) => {
        const amounts = s.amount?.match(/\d+[,\d]*/g);
        if (!amounts) return false;
        const maxAmount = Math.max(...amounts.map((a) => parseFloat(a.replace(/,/g, ""))));
        return maxAmount >= 5000;
      })
      .slice(0, 3);
  }, [sorted]);

  const displayedScholarships = useMemo(
    () => sorted.slice(0, displayLimit),
    [displayLimit, sorted]
  );

  const hasMore = displayLimit < sorted.length;
  const hasFilters = search || awardType !== "All" || level !== "All" || deadlineRange !== "all";

  const clearFilters = () => {
    setSearch("");
    setAwardType("All");
    setLevel("All");
    setDeadlineRange("all");
    setDisplayLimit(12);
  };

  const formatDeadline = (value: Scholarship["deadline"]) => {
    const date = toDateValue(value);
    if (date) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return typeof value === "string" ? value : null;
  };

  const getDeadlineUrgency = (value: Scholarship["deadline"]) => {
    const date = toDateValue(value);
    if (!date) return null;

    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return "expired";
    if (daysUntil <= 7) return "urgent";
    if (daysUntil <= 30) return "soon";
    return "normal";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Scholarship":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Grant":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Bursary":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="scholarship-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#scholarship-grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Scholarships & Grants
          </h1>
          <p className="mt-4 text-lg text-emerald-100 sm:text-xl">
            Funding Indigenous learners and community leaders. Browse scholarships, bursaries,
            and grants from organizations across Turtle Island.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholarships..."
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
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-600">
                  !
                </span>
              )}
            </button>
          </div>
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

          <div className="grid gap-6 md:grid-cols-3">
            {/* Award Type */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Award Type</label>
              <div className="flex flex-wrap gap-2">
                {AWARD_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setAwardType(type)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      awardType === type
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Education Level */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Education Level</label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      level === lvl
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline Range */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Deadline</label>
              <div className="flex flex-wrap gap-2">
                {DEADLINE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setDeadlineRange(range.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      deadlineRange === range.value
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Scholarships Section */}
      {!hasFilters && featuredScholarships.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <CurrencyDollarIcon className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">High-Value Awards</h2>
            <span className="text-sm text-slate-400">$5,000+</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredScholarships.map((item) => (
              <ScholarshipCard key={item.id} scholarship={item} featured />
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

      {/* All Scholarships */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {hasFilters ? "Search Results" : "All Scholarships"}
          </h2>
          <span className="text-sm text-slate-400">
            {loading ? "Loading..." : `${sorted.length} ${sorted.length === 1 ? "scholarship" : "scholarships"}`}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
            ))}
          </div>
        ) : scholarships.length === 0 && !hasFilters ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <AcademicCapIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No scholarships available yet</h3>
            <p className="text-slate-400">
              Check back soon! Organizations are adding scholarship opportunities regularly.
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No scholarships found</h3>
            <p className="text-slate-400 mb-4">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedScholarships.map((item) => (
                <ScholarshipCard key={item.id} scholarship={item} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-emerald-500 hover:text-emerald-400"
                >
                  Load more scholarships
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
          Offering a Scholarship or Grant?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          List your scholarship, bursary, or community grant on IOPPS. Help fund the next generation of Indigenous leaders.
        </p>
        <a
          href="/organization/scholarships/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
        >
          Post a Scholarship
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </section>
    </PageShell>
  );
}

// Scholarship Card Component
function ScholarshipCard({ scholarship, featured = false }: { scholarship: Scholarship; featured?: boolean }) {
  const formatDeadline = (value: Scholarship["deadline"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value as string);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const getDeadlineUrgency = (value: Scholarship["deadline"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value as string);
      const now = new Date();
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) return "expired";
      if (daysUntil <= 7) return "urgent";
      if (daysUntil <= 30) return "soon";
      return "normal";
    } catch {
      return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Scholarship":
        return "bg-emerald-500/20 text-emerald-300";
      case "Grant":
        return "bg-blue-500/20 text-blue-300";
      case "Bursary":
        return "bg-purple-500/20 text-purple-300";
      default:
        return "bg-slate-500/20 text-slate-300";
    }
  };

  const deadline = formatDeadline(scholarship.deadline);
  const urgency = getDeadlineUrgency(scholarship.deadline);

  return (
    <Link
      href={`/scholarships/${scholarship.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${
        featured
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
          : "border-slate-700 bg-slate-800/50 hover:border-emerald-500/50"
      }`}
    >
      {/* Header with Amount */}
      <div className="relative bg-gradient-to-br from-emerald-600/20 to-teal-600/10 px-5 py-6">
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <CurrencyDollarIcon className="h-3 w-3" />
            High Value
          </div>
        )}

        {/* Amount */}
        {scholarship.amount && (
          <div className="text-3xl font-bold text-emerald-400">
            {scholarship.amount}
          </div>
        )}

        {/* Type Badge */}
        <div className="mt-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getTypeColor(scholarship.type)}`}>
            {scholarship.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
          {scholarship.title}
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          {scholarship.provider}
        </p>

        <p className="mt-3 text-sm text-slate-300 line-clamp-2 flex-1">
          {scholarship.description}
        </p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-300">
            {scholarship.level}
          </span>
          {scholarship.region && (
            <span className="rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-400">
              {scholarship.region}
            </span>
          )}
        </div>

        {/* Deadline */}
        {deadline && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <span className={`font-medium ${
                urgency === "expired"
                  ? "text-red-400"
                  : urgency === "urgent"
                  ? "text-orange-400"
                  : urgency === "soon"
                  ? "text-yellow-400"
                  : "text-slate-300"
              }`}>
                {urgency === "expired" ? "Expired" : `Due ${deadline}`}
              </span>
            </div>
            {urgency === "urgent" && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">
                Closing Soon
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ScholarshipsPage() {
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
      <ScholarshipsContent />
    </Suspense>
  );
}

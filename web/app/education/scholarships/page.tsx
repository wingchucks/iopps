"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, AcademicCapIcon, CurrencyDollarIcon, CalendarIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { listScholarships } from "@/lib/firestore";
import type { Scholarship } from "@/lib/types";
import { FeedLayout, SectionHeader } from "@/components/opportunity-graph";

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
        if (s.amount && typeof s.amount === "object" && "value" in s.amount) {
          return (s.amount as any).value >= 5000;
        }
        const amountStr = typeof s.amount === "string" ? s.amount : (s.amount as any)?.display || "";
        const amounts = amountStr.match(/\d+[,\d]*/g);
        if (!amounts) return false;
        const maxAmount = Math.max(...amounts.map((a: string) => parseFloat(a.replace(/,/g, ""))));
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

  return (
    <FeedLayout activeNav="education">
      <SectionHeader title="Scholarships & Funding" subtitle="Funding Indigenous learners and community leaders. Browse scholarships, bursaries, and grants." icon="🎓" />

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground0" />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-white border border-slate-200 py-3 pl-12 pr-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-6 py-3 text-slate-900 transition-colors hover:bg-slate-100"
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
            {hasFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                !
              </span>
            )}
          </button>
        </div>
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-foreground0">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span className="mx-2">&rarr;</span>
          <Link href="/education" className="hover:text-slate-900 transition-colors">
            Education
          </Link>
          <span className="mx-2">&rarr;</span>
          <span className="text-slate-900">Scholarships</span>
        </nav>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 rounded-2xl bg-slate-50 backdrop-blur-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-foreground0 hover:text-slate-900 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Award Type */}
              <div>
                <label className="text-sm font-medium text-foreground0 mb-2 block">Award Type</label>
                <div className="flex flex-wrap gap-2">
                  {AWARD_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setAwardType(type)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${awardType === type
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Education Level */}
              <div>
                <label className="text-sm font-medium text-foreground0 mb-2 block">Education Level</label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${level === lvl
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline Range */}
              <div>
                <label className="text-sm font-medium text-foreground0 mb-2 block">Deadline</label>
                <div className="flex flex-wrap gap-2">
                  {DEADLINE_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setDeadlineRange(range.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${deadlineRange === range.value
                        ? "bg-accent text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              <h2 className="text-2xl font-bold text-slate-900">High-Value Awards</h2>
              <span className="text-sm text-foreground0">$5,000+</span>
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
            <h2 className="text-2xl font-bold text-slate-900">
              {hasFilters ? "Search Results" : "All Scholarships"}
            </h2>
            <span className="text-sm text-foreground0">
              {loading ? "Loading..." : `${sorted.length} ${sorted.length === 1 ? "scholarship" : "scholarships"}`}
            </span>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-50 h-64" />
              ))}
            </div>
          ) : scholarships.length === 0 && !hasFilters ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <AcademicCapIcon className="h-8 w-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No scholarships available yet</h3>
              <p className="text-foreground0">
                Check back soon! Organizations are adding scholarship opportunities regularly.
              </p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="h-8 w-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No scholarships found</h3>
              <p className="text-foreground0 mb-4">
                Try adjusting your filters or search terms.
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#0d9488] transition-colors"
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
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-8 py-3.5 text-sm font-semibold text-slate-800 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
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

      {/* CTA Section - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Offering a Scholarship or Grant?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                List your scholarship, bursary, or community grant on IOPPS. Help fund the next generation of Indigenous leaders.
              </p>
              <Link
                href="/organization/scholarships/new"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-lg font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Post a Scholarship
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </FeedLayout>
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
        return "bg-emerald-50 text-emerald-600";
      case "Grant":
        return "bg-blue-50 text-blue-600";
      case "Bursary":
        return "bg-purple-50 text-purple-600";
      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  const deadline = formatDeadline(scholarship.deadline);
  const urgency = getDeadlineUrgency(scholarship.deadline);
  const isExpired = urgency === "expired";

  // For recurring scholarships, show the schedule instead of single deadline
  const showRecurringSchedule = scholarship.isRecurring && scholarship.recurringSchedule;

  return (
    <Link
      href={`/education/scholarships/${scholarship.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${featured
        ? "border-amber-300 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
        : "border-slate-200 bg-slate-50 hover:border-[#14B8A6]/50"
        }`}
    >
      {/* Header with Amount */}
      <div className="relative bg-gradient-to-br from-[#14B8A6]/10 to-cyan-50 px-5 py-6">
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <CurrencyDollarIcon className="h-3 w-3" />
            High Value
          </div>
        )}

        {/* Recurring Badge */}
        {scholarship.isRecurring && !featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-blue-50 border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-600">
            <ArrowPathIcon className="h-3 w-3" />
            Recurring
          </div>
        )}

        {/* Amount */}
        {scholarship.amount && (
          <div className="text-3xl font-bold text-[#14B8A6]">
            {typeof scholarship.amount === "string" ? scholarship.amount : (scholarship.amount as any)?.display}
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
        <h3 className="text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
          {scholarship.title}
        </h3>

        <p className="mt-1 text-sm text-foreground0">
          {scholarship.provider}
        </p>

        <p className="mt-3 text-sm text-slate-600 line-clamp-2 flex-1">
          {scholarship.description}
        </p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {scholarship.level}
          </span>
          {scholarship.region && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-foreground0">
              {scholarship.region}
            </span>
          )}
        </div>

        {/* Deadline / Recurring Schedule */}
        {(deadline || showRecurringSchedule) && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="flex items-center gap-1.5 text-sm">
              {showRecurringSchedule ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 text-blue-400" />
                  <span className="font-medium text-blue-600">
                    Deadlines: {scholarship.recurringSchedule}
                  </span>
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4 text-foreground0" />
                  <span className={`font-medium ${urgency === "expired"
                    ? "text-red-600"
                    : urgency === "urgent"
                      ? "text-orange-600"
                      : urgency === "soon"
                        ? "text-yellow-600"
                        : "text-slate-600"
                    }`}>
                    {urgency === "expired" ? "Expired" : `Due ${deadline}`}
                  </span>
                </>
              )}
            </div>
            {!showRecurringSchedule && urgency === "urgent" && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                Closing Soon
              </span>
            )}
          </div>
        )}

        {/* Apply Now Button */}
        {scholarship.applicationMethod === "external_link" && scholarship.applicationUrl && !isExpired && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(scholarship.applicationUrl!, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8] cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Apply Now
            </span>
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
        <FeedLayout activeNav="education">
          <SectionHeader
            title="Scholarships & Funding"
            subtitle="Funding Indigenous learners and community leaders."
            icon="🎓"
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-slate-50"
              />
            ))}
          </div>
        </FeedLayout>
      }
    >
      <ScholarshipsContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listScholarships } from "@/lib/firestore";
import type { Scholarship } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";
import { useSearchParams } from "@/lib/useSearchParams";

const typeFilters = ["All", "Scholarship", "Grant", "Bursary"] as const;
const levelFilters = [
  "All",
  "High School",
  "Post-secondary",
  "Graduate",
  "Community",
] as const;
const sortOptions = [
  { value: "deadline", label: "Deadline (soonest first)" },
  { value: "amount", label: "Amount (highest first)" },
  { value: "newest", label: "Recently added" },
  { value: "alphabetical", label: "A-Z" },
] as const;

const toDateValue = (
  value: Scholarship["deadline"]
): Date | null => {
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
  const [displayLimit, setDisplayLimit] = useState(20);

  // Use URL-synced search params
  const { params, updateParam, resetParams } = useSearchParams({
    keyword: "",
    type: "All" as typeof typeFilters[number],
    level: "All" as typeof levelFilters[number],
    region: "",
    minAmount: "" as number | "",
    maxAmount: "" as number | "",
    deadlineBefore: "",
    sortBy: "deadline" as typeof sortOptions[number]["value"],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listScholarships();
        setScholarships(data);
      } catch (err) {
        console.error(err);
        setError("We couldn't load scholarships right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return scholarships.filter((item) => {
      const matchesKeyword = `${item.title} ${item.provider} ${item.description}`
        .toLowerCase()
        .includes(params.keyword.toLowerCase());
      const matchesType =
        params.type === "All" ? true : item.type === params.type;
      const matchesLevel =
        params.level === "All" ? true : item.level === params.level;
      const matchesRegion = params.region
        ? (item.region ?? "")
          .toLowerCase()
          .includes(params.region.toLowerCase())
        : true;

      // Amount filtering
      const matchesAmount = (() => {
        if (!params.minAmount && !params.maxAmount) return true;
        if (!item.amount) return false;

        // Extract numbers from amount string (e.g., "$5,000" or "$1000-$5000")
        const amounts = item.amount.match(/\d+[,\d]*/g);
        if (!amounts || amounts.length === 0) return false;

        const itemAmounts = amounts.map(a => parseFloat(a.replace(/,/g, '')));
        const maxItemAmount = Math.max(...itemAmounts);

        if (params.minAmount && maxItemAmount < params.minAmount) return false;
        if (params.maxAmount && maxItemAmount > params.maxAmount) return false;

        return true;
      })();

      // Deadline filtering
      const matchesDeadline = (() => {
        if (!params.deadlineBefore) return true;
        if (!item.deadline) return false;

        const deadlineDate = toDateValue(item.deadline);
        if (!deadlineDate) return false;

        const filterDate = new Date(params.deadlineBefore);
        return deadlineDate <= filterDate;
      })();

      return matchesKeyword && matchesType && matchesLevel && matchesRegion && matchesAmount && matchesDeadline;
    });
  }, [params, scholarships]);

  // Sorting
  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (params.sortBy) {
      case "amount":
        return copy.sort((a, b) => {
          const aAmount = a.amount ? parseFloat(a.amount.replace(/[^0-9]/g, '')) || 0 : 0;
          const bAmount = b.amount ? parseFloat(b.amount.replace(/[^0-9]/g, '')) || 0 : 0;
          return bAmount - aAmount;
        });
      case "newest":
        return copy.sort((a, b) => {
          const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt
            ? a.createdAt.toDate().getTime()
            : 0;
          const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt
            ? b.createdAt.toDate().getTime()
            : 0;
          return bTime - aTime;
        });
      case "alphabetical":
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case "deadline":
      default:
        return copy.sort((a, b) => {
          const aDeadline = toDateValue(a.deadline);
          const bDeadline = toDateValue(b.deadline);
          if (!aDeadline) return 1;
          if (!bDeadline) return -1;
          return aDeadline.getTime() - bDeadline.getTime();
        });
    }
  }, [filtered, params.sortBy]);

  const displayedScholarships = useMemo(
    () => sorted.slice(0, displayLimit),
    [displayLimit, sorted]
  );

  const hasMore = displayLimit < sorted.length;

  const formatDeadline = (value: Scholarship["deadline"]) => {
    const date = toDateValue(value);
    if (date) {
      return date.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return typeof value === "string" ? value : undefined;
  };

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Scholarships & Grants"
        title="Funding Indigenous learners and community leaders"
        subtitle="Browse scholarships, bursaries, and community grants submitted by employers and partners across Turtle Island."
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
              placeholder="Health, engineering, governance..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Award type
            </label>
            <select
              value={params.type}
              onChange={(e) =>
                updateParam("type", e.target.value as (typeof typeFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {typeFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Level
            </label>
            <select
              value={params.level}
              onChange={(e) =>
                updateParam("level", e.target.value as (typeof levelFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {levelFilters.map((option) => (
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
                updateParam("sortBy", e.target.value as typeof sortOptions[number]["value"])
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

        {/* Second row: Region, Amount Range, Deadline */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Region
            </label>
            <input
              type="text"
              value={params.region}
              onChange={(e) => updateParam("region", e.target.value)}
              placeholder="Prairies, BC, Atlantic..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Min Amount
            </label>
            <input
              type="number"
              value={params.minAmount}
              onChange={(e) => updateParam("minAmount", e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 1000"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Max Amount
            </label>
            <input
              type="number"
              value={params.maxAmount}
              onChange={(e) => updateParam("maxAmount", e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 10000"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Deadline Before
            </label>
            <input
              type="date"
              value={params.deadlineBefore}
              onChange={(e) => updateParam("deadlineBefore", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={resetParams}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#14B8A6] underline hover:text-[#14B8A6]/80"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset all filters
          </button>
        </div>
      </FilterCard>

      <section className="mt-8 space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        ) : scholarships.length === 0 && params.keyword === "" && params.type === "All" && params.level === "All" && params.region === "" ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-200">No scholarships available at this time</h3>
            <p className="mt-3 text-sm text-slate-400">
              Check back soon! Employers and organizations are adding scholarship opportunities regularly.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No scholarships match your filters yet. Employers will keep adding
            new opportunities—check back soon or adjust filters.
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-slate-400">
              Showing {displayedScholarships.length} of {sorted.length} scholarship{sorted.length === 1 ? "" : "s"}
            </div>
            <div className="space-y-4">
              {displayedScholarships.map((item) => (
                <Link
                  href={`/scholarships/${item.id}`}
                  key={item.id}
                >
                  <article
                    className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                          {item.type}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-50">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-300">
                          {item.provider}
                        </p>
                      </div>
                      <div className="text-sm text-right text-slate-300">
                        {item.amount && (
                          <p className="font-semibold text-[#14B8A6]">
                            {item.amount}
                          </p>
                        )}
                        {formatDeadline(item.deadline) && (
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Deadline {formatDeadline(item.deadline)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">
                      {item.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="rounded-full border border-slate-700 px-3 py-1">
                        {item.level}
                      </span>
                      {item.region && (
                        <span className="rounded-full border border-slate-700 px-3 py-1">
                          {item.region}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 20)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-[#08090C] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
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
    </PageShell>
  );
}

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="mx-auto max-w-7xl">
          <div className="h-32 w-full animate-pulse rounded-xl bg-slate-900/60 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-slate-800/80 bg-[#08090C]"
              />
            ))}
          </div>
        </div>
      </PageShell>
    }>
      <ScholarshipsContent />
    </Suspense>
  );
}

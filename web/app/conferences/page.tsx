"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listConferences } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";
import { useSearchParams } from "@/lib/useSearchParams";
import { ConferenceCard } from "@/components/conferences";

const timeframeFilters = ["All", "Next 7 days", "Next 30 days", "Next 90 days"] as const;
const eventTypeFilters = ["all", "in-person", "virtual", "hybrid"] as const;
const sortOptions = [
  { value: "soonest", label: "Starting soon" },
  { value: "recent", label: "Recently added" },
  { value: "popular", label: "Most popular" },
] as const;

type MaybeDate = string | Date | { toDate: () => Date } | null | undefined;

const getTimeValue = (
  value: MaybeDate,
  fallback = Number.MAX_SAFE_INTEGER
) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? fallback : ms;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "object" && "toDate" in value) {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : fallback;
  }
  return fallback;
};

function ConferencesContent() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL-synced filter parameters
  const { params, updateParam, resetParams } = useSearchParams({
    keyword: "",
    locationFilter: "",
    timeframeFilter: "All" as (typeof timeframeFilters)[number],
    costFilter: "all" as "all" | "free" | "paid",
    eventType: "all" as (typeof eventTypeFilters)[number],
    indigenousFocused: false,
    sortBy: "soonest" as (typeof sortOptions)[number]["value"],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listConferences();
        setConferences(data);
      } catch (err) {
        console.error(err);
        setError("We couldn't load conferences right now. Please try again soon.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return conferences.filter((conf) => {
      const text = `${conf.title} ${conf.employerName ?? ""} ${conf.description} ${conf.topics?.join(" ") ?? ""}`
        .toLowerCase();
      const matchesKeyword = params.keyword
        ? text.includes(params.keyword.toLowerCase())
        : true;
      const matchesLocation = params.locationFilter
        ? (conf.location?.toLowerCase().includes(params.locationFilter.toLowerCase()) ||
           conf.venue?.city?.toLowerCase().includes(params.locationFilter.toLowerCase()) ||
           conf.venue?.province?.toLowerCase().includes(params.locationFilter.toLowerCase()))
        : true;
      const startTime = getTimeValue(conf.startDate ?? null);
      const matchesTimeframe =
        params.timeframeFilter === "All"
          ? true
          : params.timeframeFilter === "Next 7 days"
            ? startTime >= now && startTime < now + 7 * 24 * 60 * 60 * 1000
            : params.timeframeFilter === "Next 30 days"
              ? startTime >= now && startTime < now + 30 * 24 * 60 * 60 * 1000
              : startTime >= now && startTime < now + 90 * 24 * 60 * 60 * 1000;
      const matchesCost =
        params.costFilter === "all"
          ? true
          : params.costFilter === "free"
            ? !conf.cost ||
            conf.cost.toLowerCase().includes("free") ||
            conf.cost.toLowerCase().includes("no cost")
            : Boolean(conf.cost && !conf.cost.toLowerCase().includes("free"));
      const matchesEventType =
        params.eventType === "all"
          ? true
          : conf.eventType === params.eventType;
      const matchesIndigenousFocused =
        !params.indigenousFocused || conf.indigenousFocused === true;
      return matchesKeyword && matchesLocation && matchesTimeframe && matchesCost && matchesEventType && matchesIndigenousFocused;
    });
  }, [conferences, params.costFilter, params.keyword, params.locationFilter, params.timeframeFilter, params.eventType, params.indigenousFocused]);

  const sortedConferences = useMemo(() => {
    const copy = [...filtered];

    // Sort by selected criteria
    if (params.sortBy === "recent") {
      copy.sort(
        (a, b) =>
          getTimeValue(b.createdAt ?? null, 0) -
          getTimeValue(a.createdAt ?? null, 0)
      );
    } else if (params.sortBy === "popular") {
      copy.sort(
        (a, b) =>
          ((b.savedCount ?? 0) + (b.registrationClicks ?? 0)) -
          ((a.savedCount ?? 0) + (a.registrationClicks ?? 0))
      );
    } else {
      copy.sort(
        (a, b) => getTimeValue(a.startDate ?? null) - getTimeValue(b.startDate ?? null)
      );
    }

    // Then prioritize featured at the top
    return copy.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [filtered, params.sortBy]);

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Conferences & Gatherings"
        title="Connect, learn, and celebrate Indigenous leadership"
        subtitle="Explore conferences, summits, and gatherings from employers, Nations, and education partners."
      />

      <FilterCard className="mt-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={params.keyword}
              onChange={(e) => updateParam("keyword", e.target.value)}
              placeholder="Summit, health, education..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Location
            </label>
            <input
              type="text"
              value={params.locationFilter}
              onChange={(e) => updateParam("locationFilter", e.target.value)}
              placeholder="City / province"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Timeframe
            </label>
            <select
              value={params.timeframeFilter}
              onChange={(e) =>
                updateParam("timeframeFilter", e.target.value as (typeof timeframeFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {timeframeFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Event Type
            </label>
            <select
              value={params.eventType}
              onChange={(e) =>
                updateParam("eventType", e.target.value as (typeof eventTypeFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="in-person">In-Person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Sort by
            </label>
            <select
              value={params.sortBy}
              onChange={(e) =>
                updateParam("sortBy", e.target.value as (typeof sortOptions)[number]["value"])
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
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-200">
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cost-filter"
                value="all"
                checked={params.costFilter === "all"}
                onChange={() => updateParam("costFilter", "all")}
                className="accent-[#14B8A6]"
              />
              All costs
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cost-filter"
                value="free"
                checked={params.costFilter === "free"}
                onChange={() => updateParam("costFilter", "free")}
                className="accent-[#14B8A6]"
              />
              Free / community
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cost-filter"
                value="paid"
                checked={params.costFilter === "paid"}
                onChange={() => updateParam("costFilter", "paid")}
                className="accent-[#14B8A6]"
              />
              Paid
            </label>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={params.indigenousFocused === true}
              onChange={(e) => updateParam("indigenousFocused", e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-[#14B8A6]"
            />
            <span className="text-[#14B8A6]">Indigenous Focused Only</span>
          </label>
          <div className="ml-auto">
            <button
              type="button"
              onClick={resetParams}
              className="text-xs font-semibold text-[#14B8A6] underline hover:text-[#14B8A6]/80"
            >
              Reset filters
            </button>
          </div>
        </div>
      </FilterCard>

      {/* Results count */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {loading ? "Loading..." : `${sortedConferences.length} conference${sortedConferences.length !== 1 ? "s" : ""} found`}
        </p>
        {sortedConferences.some(c => c.featured) && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured events shown first
          </div>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-800/80 bg-[#08090C] p-5 sm:p-6 text-sm text-slate-200 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              For employers & partners
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-50">
              Promote your conference or learning series on IOPPS.
            </h2>
            <p className="text-slate-300">
              Publish agendas, highlight TRC #92 commitments, and reach Indigenous
              professionals across Canada.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs font-semibold sm:flex-row">
            <Link
              href="/employer#opportunities"
              className="rounded-full bg-[#14B8A6] px-4 py-2 text-center text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
            >
              Go to employer portal
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-slate-700 px-4 py-2 text-center text-slate-100 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors"
            >
              Talk to IOPPS
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-[#08090C]"
              >
                <div className="h-40 animate-pulse bg-slate-900/60" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
                  <div className="flex gap-2">
                    <div className="h-6 w-20 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-6 w-20 animate-pulse rounded-full bg-slate-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedConferences.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200">No conferences found</h3>
            <p className="mt-2 text-sm text-slate-400">
              No conferences match your filters yet. Employers add new events every week, so check back soon!
            </p>
            <button
              onClick={resetParams}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#14B8A6]/90"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedConferences.map((conf) => (
              <ConferenceCard
                key={conf.id}
                conference={conf}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default function ConferencesPage() {
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
      <ConferencesContent />
    </Suspense>
  );
}

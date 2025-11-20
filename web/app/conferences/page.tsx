"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listConferences } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";
import { useSearchParams } from "@/lib/useSearchParams";

const timeframeFilters = ["All", "Next 30 days", "Next 90 days"] as const;
const sortOptions = [
  { value: "soonest", label: "Starting soon" },
  { value: "recent", label: "Recently added" },
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

export default function ConferencesPage() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL-synced filter parameters
  const { params, updateParam, resetParams } = useSearchParams({
    keyword: "",
    locationFilter: "",
    timeframeFilter: "All" as typeof timeframeFilters[number],
    costFilter: "all" as "all" | "free" | "paid",
    sortBy: "soonest" as typeof sortOptions[number]["value"],
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
      const text = `${conf.title} ${conf.employerName ?? ""} ${conf.description}`
        .toLowerCase();
      const matchesKeyword = params.keyword
        ? text.includes(params.keyword.toLowerCase())
        : true;
      const matchesLocation = params.locationFilter
        ? conf.location.toLowerCase().includes(params.locationFilter.toLowerCase())
        : true;
      const startTime = getTimeValue(conf.startDate ?? null);
      const matchesTimeframe =
        params.timeframeFilter === "All"
          ? true
          : params.timeframeFilter === "Next 30 days"
          ? startTime < now + 30 * 24 * 60 * 60 * 1000
          : startTime < now + 90 * 24 * 60 * 60 * 1000;
      const matchesCost =
        params.costFilter === "all"
          ? true
          : params.costFilter === "free"
          ? !conf.cost ||
            conf.cost.toLowerCase().includes("free") ||
            conf.cost.toLowerCase().includes("no cost")
          : Boolean(conf.cost && !conf.cost.toLowerCase().includes("free"));
      return matchesKeyword && matchesLocation && matchesTimeframe && matchesCost;
    });
  }, [conferences, params.costFilter, params.keyword, params.locationFilter, params.timeframeFilter]);

  const sortedConferences = useMemo(() => {
    const copy = [...filtered];
    if (params.sortBy === "recent") {
      return copy.sort(
        (a, b) =>
          getTimeValue(b.createdAt ?? null, 0) -
          getTimeValue(a.createdAt ?? null, 0)
      );
    }
    return copy.sort(
      (a, b) => getTimeValue(a.startDate ?? null) - getTimeValue(b.startDate ?? null)
    );
  }, [filtered, params.sortBy]);

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Conferences & Gatherings"
        title="Connect, learn, and celebrate Indigenous leadership"
        subtitle="Explore conferences, summits, and gatherings from employers, Nations, and education partners."
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
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="cost-filter"
              value="all"
              checked={params.costFilter === "all"}
              onChange={() => updateParam("costFilter", "all")}
            />
            All costs
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="cost-filter"
              value="free"
              checked={params.costFilter === "free"}
              onChange={() => updateParam("costFilter", "free")}
            />
            Free / community sponsored
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="cost-filter"
              value="paid"
              checked={params.costFilter === "paid"}
              onChange={() => updateParam("costFilter", "paid")}
            />
            Paid registration
          </label>
          <button
            type="button"
            onClick={resetParams}
            className="text-xs font-semibold text-[#14B8A6] underline hover:text-[#14B8A6]/80"
          >
            Reset filters
          </button>
        </div>
      </FilterCard>

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
        ) : sortedConferences.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No conferences match your filters yet. Employers add new events every week
            so check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedConferences.map((conf) => (
              <article
                key={conf.id}
                className="rounded-2xl border border-slate-800/80 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                      {conf.employerName || "Organizer"}
                    </p>
                    <Link
                      href={`/conferences/${conf.id}`}
                      className="mt-1 block text-xl font-semibold text-slate-50 hover:text-[#14B8A6]"
                    >
                      {conf.title}
                    </Link>
                    <p className="text-sm text-slate-300">{conf.location}</p>
                    {conf.startDate && (
                      <p className="text-xs text-slate-500">
                        {typeof conf.startDate === "string"
                          ? conf.startDate
                          : conf.startDate?.toDate().toLocaleDateString()}
                        {conf.endDate ? " - " : ""}
                        {typeof conf.endDate === "string"
                          ? conf.endDate
                          : conf.endDate?.toDate().toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {conf.cost ? (
                      <span className="rounded-full border border-slate-700 px-3 py-1">
                        {conf.cost}
                      </span>
                    ) : (
                      <span className="rounded-full border border-teal-500 px-3 py-1 text-teal-200">
                        Free / Community
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">
                  {conf.description.slice(0, 220)}
                  {conf.description.length > 220 ? "..." : ""}
                </p>
                {conf.registrationLink && (
                  <Link
                    href={conf.registrationLink}
                    target="_blank"
                    className="mt-3 inline-flex text-xs font-semibold text-teal-300 underline"
                  >
                    Register / View agenda
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

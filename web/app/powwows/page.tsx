"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listPowwowEvents } from "@/lib/firestore";
import type { PowwowEvent } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";
import { useSearchParams } from "@/lib/useSearchParams";

// Sample data removed - using live data only

// Removed typeFilters - using season filter instead

function PowwowsContent() {
  const [events, setEvents] = useState<PowwowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);

  // URL-synced filter parameters
  const { params, updateParam, resetParams } = useSearchParams({
    keyword: "",
    provinceFilter: "",
    typeFilter: "",
    showLivestreamOnly: false,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPowwowEvents();
        setEvents(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load pow wow listings right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const matchesKeyword = `${event.name} ${event.host ?? ""} ${event.description ?? ""
        }`
        .toLowerCase()
        .includes(params.keyword.toLowerCase());
      // Note: Removed type filter as PowwowEvent doesn't have a type field
      const matchesProvince = params.provinceFilter
        ? (event.location ?? "")
          .toLowerCase()
          .includes(params.provinceFilter.toLowerCase())
        : true;
      const matchesStream = params.showLivestreamOnly ? Boolean(event.livestream) : true;
      return (
        matchesKeyword && matchesProvince && matchesStream
      );
    });
  }, [events, params.keyword, params.provinceFilter, params.showLivestreamOnly]);

  const displayedEvents = useMemo(
    () => filtered.slice(0, displayLimit),
    [displayLimit, filtered]
  );

  const hasMore = displayLimit < filtered.length;

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Pow Wows & Events"
        title="Cultural celebrations across Turtle Island"
        subtitle="Find traditional and competition pow wows, cultural gatherings, and community events hosted by Nations, universities, and partners across North America. We highlight events with livestream coverage so distant families can join in."
      />

      <FilterCard className="mt-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={params.keyword}
              onChange={(e) => updateParam("keyword", e.target.value)}
              placeholder="Nation, host, theme..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Location
            </label>
            <input
              type="text"
              value={params.provinceFilter}
              onChange={(e) => updateParam("provinceFilter", e.target.value)}
              placeholder="State, province, or territory..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Season
            </label>
            <input
              type="text"
              value={params.typeFilter}
              onChange={(e) =>
                updateParam("typeFilter", e.target.value)
              }
              placeholder="Winter, Spring, Summer, Fall..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-200">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={params.showLivestreamOnly}
              onChange={(e) => updateParam("showLivestreamOnly", e.target.checked)}
            />
            Livestream available
          </label>
          <button
            type="button"
            onClick={() => {
              resetParams();
              setDisplayLimit(20);
            }}
            className="text-xs font-semibold text-[#14B8A6] underline"
          >
            Reset filters
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
        ) : events.length === 0 && params.keyword === "" && params.provinceFilter === "" && params.typeFilter === "" && !params.showLivestreamOnly ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-200">No events scheduled yet</h3>
            <p className="mt-3 text-sm text-slate-400">
              Check back for upcoming pow wows and events! Nations and communities are adding listings regularly.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No events match your filters yet. Try adjusting your filters or check back soon as new pow wows and events are added each week.
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-slate-400">
              Showing {displayedEvents.length} of {filtered.length} event{filtered.length === 1 ? "" : "s"}
            </div>
            <div className="space-y-4">
              {displayedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/powwows/${event.id}`}
                  className="block rounded-2xl border border-slate-800 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                          Pow wow
                        </p>
                        {event.season && (
                          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
                            {event.season}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-xl font-semibold text-slate-50">
                        {event.name}
                      </h3>
                      {event.host && (
                        <p className="text-sm text-slate-300">{event.host}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {event.location} {event.dateRange ? `· ${event.dateRange}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.3em] text-slate-500">
                      Registration {event.registrationStatus ?? "TBA"}
                      {event.livestream && (
                        <p className="mt-1 rounded-full border border-teal-500 px-3 py-1 text-[0.6rem] text-[#14B8A6]">
                          Livestream on IOPPS Live
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-200">{event.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#14B8A6]">
                    View details & register
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 20)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-[#08090C] px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
                >
                  Load more events
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

export default function PowwowsPage() {
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
      <PowwowsContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { listPowwowEvents } from "@/lib/firestore";
import type { PowwowEvent } from "@/lib/types";

const fallbackPowwows: PowwowEvent[] = [
  {
    id: "pow-1",
    employerId: "demo",
    name: "Treaty 6 Winter Pow Wow",
    location: "Edmonton, AB",
    season: "Winter",
    dateRange: "Feb 7-9, 2025",
    host: "Saddle Lake Cree Nation",
    description:
      "Three days of pow wow specials, Inuit throat singing, and youth round dance workshops.",
    registrationStatus: "Open",
    livestream: true,
    active: true,
  },
  {
    id: "pow-2",
    employerId: "demo",
    name: "Manitoba Spring Gathering",
    location: "Brandon, MB",
    season: "Spring",
    dateRange: "Apr 18-20, 2025",
    host: "Manitoba First Nations Education Resource Centre",
    description:
      "Competition pow wow with drum contests, artisan market, and education fair.",
    registrationStatus: "Coming Soon",
    livestream: false,
    active: true,
  },
  {
    id: "pow-3",
    employerId: "demo",
    name: "Coastal Celebration Pow Wow",
    location: "Campbell River, BC",
    season: "Summer",
    dateRange: "Jul 11-13, 2025",
    host: "Wei Wai Kum First Nation",
    description:
      "Grand entry at sunset, oceanfront vendors, and canoe races with coastal nations.",
    registrationStatus: "Open",
    livestream: false,
    active: true,
  },
];

const seasonFilters = ["All", "Winter", "Spring", "Summer", "Fall"] as const;

export default function PowwowsPage() {
  const [events, setEvents] = useState<PowwowEvent[]>(fallbackPowwows);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [seasonFilter, setSeasonFilter] =
    useState<(typeof seasonFilters)[number]>("All");
  const [showLivestreamOnly, setShowLivestreamOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPowwowEvents();
        setEvents(data.length ? data : fallbackPowwows);
      } catch (err) {
        console.error(err);
        setError("Unable to load pow wow listings right now.");
        setEvents(fallbackPowwows);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const matchesKeyword = `${event.name} ${event.host ?? ""} ${
        event.description ?? ""
      }`
        .toLowerCase()
        .includes(keyword.toLowerCase());
      const matchesSeason =
        seasonFilter === "All" ? true : event.season === seasonFilter;
      const matchesProvince = provinceFilter
        ? (event.location ?? "")
            .toLowerCase()
            .includes(provinceFilter.toLowerCase())
        : true;
      const matchesStream = showLivestreamOnly ? Boolean(event.livestream) : true;
      return (
        matchesKeyword && matchesSeason && matchesProvince && matchesStream
      );
    });
  }, [events, keyword, provinceFilter, seasonFilter, showLivestreamOnly]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
          Pow Wow Listings
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Cultural celebrations across Turtle Island
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Find pow wows hosted by Nations, universities, and community partners.
          We highlight events with livestream coverage so distant families can
          join in.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-lg">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nation, host, theme..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Province / Territory
            </label>
            <input
              type="text"
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              placeholder="AB, BC, MB..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Season
            </label>
            <select
              value={seasonFilter}
              onChange={(e) =>
                setSeasonFilter(e.target.value as (typeof seasonFilters)[number])
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {seasonFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-200">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLivestreamOnly}
              onChange={(e) => setShowLivestreamOnly(e.target.checked)}
            />
            Livestream available
          </label>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setProvinceFilter("");
              setSeasonFilter("All");
              setShowLivestreamOnly(false);
            }}
            className="text-xs font-semibold text-teal-300 underline"
          >
            Reset filters
          </button>
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
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No pow wows match your filters yet. New celebrations are added each
            week—check back soon or adjust filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-teal-400"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
                      {event.season ?? "Season"}
                    </p>
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
                      <p className="mt-1 rounded-full border border-teal-500 px-3 py-1 text-[0.6rem] text-teal-300">
                        Livestream on IOPPS Live
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">{event.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

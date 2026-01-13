"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { listPowwowEvents } from "@/lib/firestore";
import type { PowwowEvent, PowwowEventType, NorthAmericanRegion } from "@/lib/types";
import { POWWOW_EVENT_TYPES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";

// Date range filter options
const DATE_RANGES = [
  { label: "All Dates", value: "all" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Upcoming", value: "upcoming" },
] as const;

type DateRangeValue = typeof DATE_RANGES[number]["value"];

function PowwowsContent() {
  const [events, setEvents] = useState<PowwowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Filter state
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<PowwowEventType | null>(null);
  const [region, setRegion] = useState<NorthAmericanRegion | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>("all");
  const [showLivestreamOnly, setShowLivestreamOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPowwowEvents();
        setEvents(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load events right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Helper function to check if event is within date range
  const isWithinDateRange = (event: PowwowEvent, range: DateRangeValue): boolean => {
    if (range === "all") return true;

    const now = new Date();
    let eventDate: Date | null = null;

    if (event.startDate) {
      if (typeof event.startDate === "object" && "toDate" in event.startDate) {
        eventDate = event.startDate.toDate();
      } else if (typeof event.startDate === "string") {
        eventDate = new Date(event.startDate);
      }
    }

    if (!eventDate || isNaN(eventDate.getTime())) {
      // If no valid date, include in "upcoming" but exclude from specific ranges
      return range === "upcoming";
    }

    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (range) {
      case "week":
        return eventDate >= now && eventDate <= endOfWeek;
      case "month":
        return eventDate >= now && eventDate <= endOfMonth;
      case "upcoming":
        return eventDate >= now;
      default:
        return true;
    }
  };

  // Get featured events
  const featuredEvents = useMemo(() => {
    return events.filter((event) => event.featured && event.active);
  }, [events]);

  // Filtered events
  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (!event.active) return false;

      const matchesSearch = search
        ? `${event.name} ${event.host ?? ""} ${event.description ?? ""} ${event.location ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
        : true;

      const matchesType = eventType
        ? event.eventType === eventType
        : true;

      const matchesRegion = region
        ? event.region === region || (event.location ?? "").toLowerCase().includes(region.toLowerCase())
        : true;

      const matchesDateRange = isWithinDateRange(event, dateRange);

      const matchesStream = showLivestreamOnly ? Boolean(event.livestream) : true;

      return matchesSearch && matchesType && matchesRegion && matchesDateRange && matchesStream;
    });
  }, [events, search, eventType, region, dateRange, showLivestreamOnly]);

  const displayedEvents = useMemo(
    () => filtered.slice(0, displayLimit),
    [displayLimit, filtered]
  );

  const hasMore = displayLimit < filtered.length;
  const hasFilters = search || eventType || region || dateRange !== "all" || showLivestreamOnly;

  const clearFilters = () => {
    setSearch("");
    setEventType(null);
    setRegion(null);
    setDateRange("all");
    setShowLivestreamOnly(false);
    setDisplayLimit(12);
  };

  const formatDate = (value: PowwowEvent["startDate"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Pow Wows & Events"
        title="Celebrate Together"
        subtitle="Celebrations & gatherings across Turtle Island. Find pow wows, sports events, and cultural gatherings hosted by Nations, communities, and partners across North America."
        size="md"
      >
        {/* Search Bar */}
        <div className="flex flex-col gap-6 justify-center max-w-2xl mx-auto">
          {/* Search and Filters Toggle */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search events..."
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
              <span className="hidden sm:inline">More Filters</span>
              {hasFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-900">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Primary Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setEventType(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${eventType === null
                ? "bg-white text-blue-900 shadow-lg scale-105 ring-2 ring-white/50"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                }`}
            >
              All Events
            </button>
            {POWWOW_EVENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setEventType(type)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${eventType === type
                  ? "bg-white text-blue-900 shadow-lg scale-105 ring-2 ring-white/50"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </OceanWaveHero>

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

            <div className="grid gap-6 md:grid-cols-3">
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">When</label>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setDateRange(range.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${dateRange === range.value
                        ? "bg-[#14B8A6] text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Region Dropdown */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Region</label>
                <select
                  value={region || ""}
                  onChange={(e) => setRegion(e.target.value as NorthAmericanRegion || null)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                >
                  <option value="">All Regions</option>
                  <optgroup label="Canada">
                    {NORTH_AMERICAN_REGIONS.slice(0, 13).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </optgroup>
                  <optgroup label="United States">
                    {NORTH_AMERICAN_REGIONS.slice(13, -1).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </optgroup>
                  <option value="National / Online Only">National / Online Only</option>
                </select>
              </div>

              {/* Livestream Toggle */}
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Options</label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLivestreamOnly}
                    onChange={(e) => setShowLivestreamOnly(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                  <span className="text-sm text-slate-300">Livestream available</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Featured Events Section */}
        {!hasFilters && featuredEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Featured Events</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} featured />
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

        {/* All Events */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {hasFilters ? "Search Results" : "All Events"}
            </h2>
            <span className="text-sm text-slate-400">
              {loading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "event" : "events"}`}
            </span>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-80" />
              ))}
            </div>
          ) : events.length === 0 && !hasFilters ? (
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <CalendarIcon className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No events scheduled yet</h3>
              <p className="text-slate-400">
                Check back for upcoming pow wows, sports events, and community gatherings!
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No events found</h3>
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
                {displayedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 12)}
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-[#14B8A6] hover:text-[#14B8A6]"
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

      {/* CTA Section - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Hosting an Event?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                List your pow wow, sports event, or cultural gathering on IOPPS. Reach Indigenous communities across North America.
              </p>
              <Link
                href="/organization/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-lg font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                List Your Event
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

// Event Card Component
function EventCard({ event, featured = false }: { event: PowwowEvent; featured?: boolean }) {
  const formatDate = (value: PowwowEvent["startDate"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const startDate = formatDate(event.startDate);

  return (
    <Link
      href={`/community/${event.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${featured
        ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
        : "border-slate-700 bg-slate-800/50 hover:border-[#14B8A6]/50"
        }`}
    >
      {/* Event Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#14B8A6] to-cyan-700">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-16 w-16 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Featured
          </div>
        )}

        {/* Livestream Badge */}
        {event.livestream && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Livestream
          </div>
        )}

        {/* Date Badge */}
        {(startDate || event.dateRange) && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-white">
            {event.dateRange || startDate}
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="flex flex-1 flex-col p-5">
        {/* Event Type Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${event.eventType === "Pow Wow"
            ? "bg-purple-500/20 text-purple-300"
            : event.eventType === "Sports"
              ? "bg-green-500/20 text-green-300"
              : event.eventType === "Cultural Gathering"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-slate-500/20 text-slate-300"
            }`}>
            {event.eventType || "Event"}
          </span>
          {event.season && (
            <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-400">
              {event.season}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-[#14B8A6] transition-colors">
          {event.name}
        </h3>

        {event.host && (
          <p className="mt-1 text-sm text-slate-400">Hosted by {event.host}</p>
        )}

        <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{event.location}</span>
        </div>

        <p className="mt-3 text-sm text-slate-300 line-clamp-2 flex-1">
          {event.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          {event.registrationStatus && (
            <span className={`text-xs font-medium ${event.registrationStatus.toLowerCase().includes("open")
              ? "text-green-400"
              : "text-slate-400"
              }`}>
              Registration {event.registrationStatus}
            </span>
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

export default function PowwowsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            eyebrow="Pow Wows & Events"
            title="Celebrate Together"
            subtitle="Celebrations & gatherings across Turtle Island. Find pow wows, sports events, and cultural gatherings hosted by Nations, communities, and partners across North America."
            size="md"
          />
          <PageShell>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-2xl bg-slate-800/50"
                />
              ))}
            </div>
          </PageShell>
        </div>
      }
    >
      <PowwowsContent />
    </Suspense>
  );
}

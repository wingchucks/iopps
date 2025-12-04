"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  VideoCameraIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { listLiveStreams } from "@/lib/firestore";
import type { LiveStreamEvent } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { YouTubeSection } from "@/components/YouTubeSection";

type StreamStatus = "Live Now" | "Upcoming" | "Replay";

const STATUS_OPTIONS = ["All", "Live Now", "Upcoming", "Replay"] as const;
const CATEGORY_OPTIONS = ["All", "Pow Wow", "Sports", "Leadership", "Culture"] as const;

type StatusFilter = typeof STATUS_OPTIONS[number];
type CategoryFilter = typeof CATEGORY_OPTIONS[number];

function LiveStreamsContent() {
  const [streams, setStreams] = useState<LiveStreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listLiveStreams();
        setStreams(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load live streams right now.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Filtered streams
  const filtered = useMemo(() => {
    return streams.filter((stream) => {
      const matchesSearch = search
        ? `${stream.title} ${stream.host ?? ""} ${stream.description ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true;

      const matchesStatus = statusFilter === "All" || stream.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || stream.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [streams, search, statusFilter, categoryFilter]);

  // Group streams by status
  const groupedStreams = useMemo(() => {
    const liveNow = filtered.filter((s) => s.status === "Live Now");
    const upcoming = filtered.filter((s) => s.status === "Upcoming");
    const replays = filtered.filter((s) => s.status === "Replay");
    return { liveNow, upcoming, replays };
  }, [filtered]);

  const displayedStreams = useMemo(
    () => filtered.slice(0, displayLimit),
    [displayLimit, filtered]
  );

  const hasMore = displayLimit < filtered.length;
  const hasFilters = search || statusFilter !== "All" || categoryFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setCategoryFilter("All");
    setDisplayLimit(12);
  };

  return (
    <PageShell>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-700 px-6 py-16 sm:px-12 sm:py-24 mb-12">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="live-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#live-grid)" />
          </svg>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pink-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            IOPPS Live
          </h1>
          <p className="mt-4 text-lg text-red-100 sm:text-xl">
            Cultural broadcasts and community media. Watch pow wows, tournaments, leadership summits,
            and community storytelling live or catch the replays.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search streams..."
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
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-red-600">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Live Now Badge */}
          {groupedStreams.liveNow.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
              <span className="flex h-3 w-3 items-center justify-center">
                <span className="absolute h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-red-300" />
              </span>
              {groupedStreams.liveNow.length} {groupedStreams.liveNow.length === 1 ? "stream" : "streams"} live now
            </div>
          )}
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

          <div className="grid gap-6 md:grid-cols-2">
            {/* Status */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      statusFilter === status
                        ? status === "Live Now"
                          ? "bg-red-500 text-white"
                          : "bg-rose-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {status === "Live Now" && (
                      <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                    )}
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                      categoryFilter === category
                        ? "bg-rose-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="mb-8 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-pink-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20">
            <VideoCameraIcon className="h-5 w-5 text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-rose-300">
              Live streams will be announced here when scheduled
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              We're building partnerships with pow wow organizers, sports leagues, and cultural event hosts
              across Turtle Island to bring you live coverage of important community gatherings.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://twitter.com/ioppsca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
                @ioppsca
              </a>
              <a
                href="https://facebook.com/ioppsca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                /ioppsca
              </a>
            </div>
          </div>
        </div>
      </div>

      <YouTubeSection />

      {/* Live Now Section */}
      {!hasFilters && groupedStreams.liveNow.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
              <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Live Now</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groupedStreams.liveNow.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
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

      {/* All Streams */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {hasFilters ? "Search Results" : "All Streams"}
          </h2>
          <span className="text-sm text-slate-400">
            {loading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "stream" : "streams"}`}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
            ))}
          </div>
        ) : streams.length === 0 && !hasFilters ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <VideoCameraIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No live streams scheduled</h3>
            <p className="text-slate-400">
              Stay tuned! Live streams of pow wows, tournaments, and community events will be added soon.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No streams found</h3>
            <p className="text-slate-400 mb-4">
              Try adjusting your filters or search terms.
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Upcoming Section */}
            {groupedStreams.upcoming.length > 0 && (
              <div className="mb-8">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200 mb-4">
                  <CalendarDaysIcon className="h-5 w-5 text-rose-400" />
                  Upcoming
                </h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedStreams.upcoming.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              </div>
            )}

            {/* Replays Section */}
            {groupedStreams.replays.length > 0 && (
              <div className="mb-8">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200 mb-4">
                  <PlayCircleIcon className="h-5 w-5 text-slate-400" />
                  Replays
                </h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedStreams.replays.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                </div>
              </div>
            )}

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-rose-500 hover:text-rose-400"
                >
                  Load more streams
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
          Stream Your Event with IOPPS Live
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Reach Indigenous communities across Canada with professional livestream coverage for pow wows,
          tournaments, conferences, and cultural events.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:nathan.arias@iopps.ca"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-xl hover:shadow-rose-500/30 hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email About Streaming
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-8 py-3 text-lg font-semibold text-slate-200 transition-all hover:border-rose-500 hover:text-rose-400"
          >
            Contact Form
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

// Stream Card Component
function StreamCard({ stream }: { stream: LiveStreamEvent }) {
  const getStatusStyles = (status: string | undefined) => {
    switch (status) {
      case "Live Now":
        return {
          badge: "bg-red-500 text-white",
          border: "border-red-500/40 bg-gradient-to-br from-red-500/10 to-rose-500/5",
          accent: "text-red-400",
        };
      case "Upcoming":
        return {
          badge: "bg-rose-500/20 text-rose-300",
          border: "border-slate-700 bg-slate-800/50 hover:border-rose-500/50",
          accent: "text-rose-400",
        };
      case "Replay":
        return {
          badge: "bg-slate-600 text-slate-300",
          border: "border-slate-700 bg-slate-800/50 hover:border-slate-600",
          accent: "text-slate-400",
        };
      default:
        return {
          badge: "bg-slate-600 text-slate-300",
          border: "border-slate-700 bg-slate-800/50",
          accent: "text-slate-400",
        };
    }
  };

  const getCategoryColor = (category: string | undefined) => {
    switch (category) {
      case "Pow Wow":
        return "bg-purple-500/20 text-purple-300";
      case "Sports":
        return "bg-green-500/20 text-green-300";
      case "Leadership":
        return "bg-blue-500/20 text-blue-300";
      case "Culture":
        return "bg-amber-500/20 text-amber-300";
      default:
        return "bg-slate-500/20 text-slate-300";
    }
  };

  const getButtonText = (status: string | undefined) => {
    if (status === "Live Now") return "Watch Now";
    if (status === "Upcoming") return "Set Reminder";
    return "View Replay";
  };

  const styles = getStatusStyles(stream.status);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${styles.border}`}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-rose-600/20 to-pink-600/10 px-5 py-5">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}`}>
            {stream.status === "Live Now" && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            )}
            {stream.status}
          </span>
          {stream.platform && (
            <span className="text-xs text-slate-400">{stream.platform}</span>
          )}
        </div>

        {/* Category */}
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getCategoryColor(stream.category)}`}>
          {stream.category}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {stream.host && (
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${styles.accent}`}>
            {stream.host}
          </p>
        )}

        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-rose-300 transition-colors">
          {stream.title}
        </h3>

        {stream.startTime && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
            <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
            <span>{stream.startTime}</span>
          </div>
        )}

        {stream.description && (
          <p className="mt-3 text-sm text-slate-300 line-clamp-2 flex-1">
            {stream.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <button
            className={`w-full rounded-full py-2.5 text-sm font-semibold transition-all ${
              stream.status === "Live Now"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            {getButtonText(stream.status)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
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
                  className="h-64 animate-pulse rounded-2xl bg-slate-800/50"
                />
              ))}
            </div>
          </div>
        </PageShell>
      }
    >
      <LiveStreamsContent />
    </Suspense>
  );
}

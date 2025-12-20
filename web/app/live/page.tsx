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
import OceanWaveHero from "@/components/OceanWaveHero";

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
    <div className="min-h-screen text-slate-100">
      <OceanWaveHero
        title="IOPPS LIVESTREAM"
        subtitle="Watch our official live streams, pow wows, and events directly from the source."
        size="md"
      />

      <PageShell>
        <YouTubeSection />

        {/* Community Streams Section - Only show if there are streams */}
        {(streams.length > 0 || loading) && (
          <div className="mt-24 space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-800" />
              <h2 className="text-xl font-semibold text-slate-400">Community Streams</h2>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Search & Filters Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search community streams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/50 border border-slate-700 py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-6 py-3 transition-colors ${showFilters || hasFilters
                  ? "bg-teal-500/10 border-teal-500/50 text-teal-400"
                  : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
                {hasFilters && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                    !
                  </span>
                )}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6">
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
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${statusFilter === status
                            ? status === "Live Now"
                              ? "bg-red-500 text-white"
                              : "bg-teal-500 text-white"
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
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${categoryFilter === category
                            ? "bg-teal-500 text-white"
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

            {/* Live Now Section */}
            {!hasFilters && groupedStreams.liveNow.length > 0 && (
              <section>
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
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
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
                  <h3 className="text-lg font-semibold text-white mb-2">No community streams scheduled</h3>
                  <p className="text-slate-400">
                    Check back later for more community events.
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
                    className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 transition-colors"
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
                        <CalendarDaysIcon className="h-5 w-5 text-teal-400" />
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
                        className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:border-teal-500 hover:text-teal-400"
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
          </div>
        )}
      </PageShell>

      {/* CTA Section */}
      <section className="relative overflow-hidden mt-12">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Stream Your Event with IOPPS Live
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto mb-8">
                Reach Indigenous communities across Canada with professional livestream coverage for pow wows,
                tournaments, conferences, and cultural events.
              </p>

              {/* Email display */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                <span className="text-slate-200 font-medium">Email us at:</span>
                <code className="px-4 py-2 rounded-lg bg-black/30 backdrop-blur-sm border border-white/20 text-[#14B8A6] font-mono text-lg">
                  nathan.arias@iopps.ca
                </code>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("nathan.arias@iopps.ca");
                    alert("Email copied to clipboard!");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-lg font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Email
                </button>
                <a
                  href="https://mail.google.com/mail/?view=cm&to=nathan.arias@iopps.ca&su=IOPPS%20Live%20Streaming%20Inquiry"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-8 py-3 text-lg font-semibold text-white transition-all hover:bg-white/20"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                  </svg>
                  Open in Gmail
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-8 py-3 text-lg font-semibold text-white transition-all hover:bg-white/20"
                >
                  Contact Form
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
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
          badge: "bg-teal-500/20 text-teal-300",
          border: "border-slate-700 bg-slate-800/50 hover:border-teal-500/50",
          accent: "text-teal-400",
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
      <div className="relative bg-gradient-to-br from-teal-600/20 to-emerald-600/10 px-5 py-5">
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

        <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-teal-300 transition-colors">
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
            className={`w-full rounded-full py-2.5 text-sm font-semibold transition-all ${stream.status === "Live Now"
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
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            title="IOPPS LIVESTREAM"
            subtitle="Watch our official live streams, pow wows, and events directly from the source."
            size="md"
          />
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
        </div>
      }
    >
      <LiveStreamsContent />
    </Suspense>
  );
}

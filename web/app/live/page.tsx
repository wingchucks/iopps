"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listLiveStreams } from "@/lib/firestore";
import type { LiveStreamEvent } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { FilterCard } from "@/components/FilterCard";

type StreamStatus = "Live Now" | "Upcoming" | "Replay";

// Sample data removed - using live data only

const statusFilters: StreamStatus[] = ["Live Now", "Upcoming", "Replay"];
const categoryFilters = [
  "All",
  "Pow Wow",
  "Sports",
  "Leadership",
  "Culture",
] as const;

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StreamStatus | "All">(
    "All"
  );
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof categoryFilters)[number]>("All");

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

  const filtered = useMemo(() => {
    return streams.filter((stream) => {
      const matchesKeyword = `${stream.title} ${stream.host} ${stream.description}`
        .toLowerCase()
        .includes(keyword.toLowerCase());
      const matchesStatus =
        statusFilter === "All" ? true : stream.status === statusFilter;
      const matchesCategory =
        categoryFilter === "All" ? true : stream.category === categoryFilter;
      return matchesKeyword && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, keyword, statusFilter, streams]);

  const groupedStreams = useMemo(() => {
    const liveNow = filtered.filter((s) => s.status === "Live Now");
    const upcoming = filtered.filter((s) => s.status === "Upcoming");
    const replays = filtered.filter((s) => s.status === "Replay");
    return { liveNow, upcoming, replays };
  }, [filtered]);

  const getButtonText = (status: string | undefined) => {
    if (status === "Live Now") return "Watch now";
    if (status === "Upcoming") return "Set reminder";
    return "View replay";
  };

  return (
    <PageShell>
      <SectionHeader
        eyebrow="IOPPS Live"
        title="Cultural broadcasts and community media"
        subtitle="Watch pow wows, tournaments, leadership summits, and community storytelling live or catch the replays. All streams are available through the IOPPS Live Network."
      />

      {/* Information Banner */}
      <div className="mt-8 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/20">
            <svg className="h-6 w-6 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#14B8A6]">
              Live streams will be announced here when scheduled
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              We're building partnerships with pow wow organizers, sports leagues, and cultural event hosts across Turtle Island to bring you live coverage of important community gatherings.
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Follow us on social media for real-time updates when streams go live:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://twitter.com/ioppsca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-4 py-2 text-sm font-semibold text-[#14B8A6] transition hover:bg-[#14B8A6]/20"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
                @ioppsca
              </a>
              <a
                href="https://facebook.com/ioppsca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/40 bg-[#14B8A6]/10 px-4 py-2 text-sm font-semibold text-[#14B8A6] transition hover:bg-[#14B8A6]/20"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                </svg>
                /ioppsca
              </a>
            </div>
          </div>
        </div>
      </div>

      {groupedStreams.liveNow.length > 0 && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-red-300">
            🔴 Currently live: {groupedStreams.liveNow.length} {groupedStreams.liveNow.length === 1 ? "event" : "events"}
          </p>
        </div>
      )}

      <FilterCard className="mt-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Pow wow, hockey, summit..."
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Stream status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StreamStatus | "All")
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              <option value="All">All</option>
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value as (typeof categoryFilters)[number]
                )
              }
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            >
              {categoryFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-400">
          We&apos;ll integrate live scheduling data so new broadcasts show up in real
          time.
        </div>
      </FilterCard>

      {error && (
        <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 space-y-3">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
            />
          ))}
        </div>
      ) : streams.length === 0 && keyword === "" && statusFilter === "All" && categoryFilter === "All" ? (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h3 className="text-xl font-bold text-slate-200">No live streams scheduled</h3>
          <p className="mt-3 text-sm text-slate-400">
            Stay tuned! Live streams of pow wows, tournaments, and community events will be added soon.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
          No streams match your filters right now. New broadcasts go live each
          week—check back soon.
        </div>
      ) : (
        <>
          {/* Live Now Section */}
          {groupedStreams.liveNow.length > 0 && (
            <section className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-red-300">🔴 Live Now</h2>
              <div className="space-y-4">
                {groupedStreams.liveNow.map((stream) => (
                  <article
                    key={stream.id}
                    className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent p-5 shadow-lg shadow-red-500/10 transition hover:-translate-y-1 hover:border-red-500/60 hover:shadow-red-500/20"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                          {stream.category}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-50">
                          {stream.title}
                        </h3>
                        <p className="text-sm text-slate-300">{stream.host}</p>
                        <p className="mt-2 text-sm text-slate-200">
                          {stream.description}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <span className="inline-flex items-center justify-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400"></span>
                          LIVE NOW
                        </span>
                        <button className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600">
                          {getButtonText(stream.status)}
                        </button>
                        <p className="text-xs text-slate-400">{stream.platform}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Section */}
          {groupedStreams.upcoming.length > 0 && (
            <section className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-slate-200">📅 Upcoming</h2>
              <div className="space-y-4">
                {groupedStreams.upcoming.map((stream) => (
                  <article
                    key={stream.id}
                    className="rounded-2xl border border-slate-800 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                          {stream.category}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-50">
                          {stream.title}
                        </h3>
                        <p className="text-sm text-slate-300">{stream.host}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-100">
                          {stream.startTime}
                        </p>
                        <p className="mt-2 text-sm text-slate-200">
                          {stream.description}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <span className="inline-flex items-center justify-center rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200">
                          Upcoming
                        </span>
                        <button className="rounded-full border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">
                          {getButtonText(stream.status)}
                        </button>
                        <p className="text-xs text-slate-400">{stream.platform}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Replays Section */}
          {groupedStreams.replays.length > 0 && (
            <section className="mt-8 space-y-4">
              <h2 className="text-lg font-semibold text-slate-200">📼 Replays</h2>
              <div className="space-y-4">
                {groupedStreams.replays.map((stream) => (
                  <article
                    key={stream.id}
                    className="rounded-2xl border border-slate-800 bg-[#08090C] p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-[#14B8A6]/70"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
                          {stream.category}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-50">
                          {stream.title}
                        </h3>
                        <p className="text-sm text-slate-300">{stream.host}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {stream.startTime}
                        </p>
                        <p className="mt-2 text-sm text-slate-200">
                          {stream.description}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-700/40 px-3 py-1 text-xs font-semibold text-slate-200">
                          Replay
                        </span>
                        <button className="rounded-full border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]">
                          {getButtonText(stream.status)}
                        </button>
                        <p className="text-xs text-slate-400">{stream.platform}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Partner CTA */}
      <section className="mt-12 rounded-2xl border border-slate-800/80 bg-[#08090C] p-6 sm:p-8 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              For employers & partners
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Stream your event with IOPPS Live
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Reach Indigenous communities across Canada with professional livestream coverage for pow wows, tournaments, conferences, and cultural events.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Interested in live streaming your event? Email us to discuss coverage options, technical requirements, and how we can help bring your event to Indigenous communities across Turtle Island.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="mailto:nathan.arias@iopps.ca"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14B8A6] px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email about live streaming
            </a>
            <Link
              href="/contact"
              className="rounded-full border border-slate-700 px-5 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              Contact form
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

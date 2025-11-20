"use client";

import { useEffect, useMemo, useState } from "react";
import { listLiveStreams } from "@/lib/firestore";
import type { LiveStreamEvent } from "@/lib/types";

type StreamStatus = "Live Now" | "Upcoming" | "Replay";

const fallbackStreams: LiveStreamEvent[] = [
  {
    id: "live-1",
    employerId: "demo",
    employerName: "IOPPS",
    title: "Pow Wow Grand Entry - Treaty 6 Territory",
    host: "IOPPS Live Crew",
    description:
      "Multi-camera grand entry coverage with cultural storytelling and youth hosts.",
    category: "Pow Wow",
    startTime: "Streaming now",
    status: "Live Now",
    platform: "IOPPS Live",
    active: true,
  },
  {
    id: "live-2",
    employerId: "demo",
    employerName: "Northern Youth Sports",
    title: "Hockey Night in the North",
    host: "Northern Youth Sports",
    description:
      "U18 girls championship game with commentators from Nunavut and the Northwest Territories.",
    category: "Sports",
    startTime: "Feb 8, 2025 · 6:00 PM CT",
    status: "Upcoming",
    platform: "IOPPS Live",
    active: true,
  },
  {
    id: "live-3",
    employerId: "demo",
    employerName: "Indigenous Leaders Summit",
    title: "Indigenous Leaders Summit - Fireside Chat",
    host: "Indigenous Leaders Summit",
    description:
      "Conversation with Indigenous CEOs on economic reconciliation and community investment.",
    category: "Leadership",
    startTime: "Recorded Jan 12, 2025",
    status: "Replay",
    platform: "Partner Feed",
    active: true,
  },
];

const statusFilters: StreamStatus[] = ["Live Now", "Upcoming", "Replay"];
const categoryFilters = [
  "All",
  "Pow Wow",
  "Sports",
  "Leadership",
  "Culture",
] as const;

export default function LivePage() {
  const [streams, setStreams] =
    useState<LiveStreamEvent[]>(fallbackStreams);
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
        setStreams(data.length ? data : fallbackStreams);
      } catch (err) {
        console.error(err);
        setError("Unable to load live streams right now.");
        setStreams(fallbackStreams);
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
          IOPPS Live Streams
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Cultural broadcasts and community media
        </h1>
        <p className="text-sm text-slate-300 sm:text-base">
          Watch pow wows, tournaments, leadership summits, and community
          storytelling through the IOPPS Live Network.
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
                className="h-32 animate-pulse rounded-xl border border-slate-900 bg-slate-900/60"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
            No streams match your filters right now. New broadcasts go live each
            week—check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((stream) => (
              <article
                key={stream.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-teal-400"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-teal-300">
                      {stream.category}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-50">
                      {stream.title}
                    </h3>
                    <p className="text-sm text-slate-300">{stream.host}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p className="font-semibold text-slate-100">
                      {stream.startTime}
                    </p>
                    <p>{stream.platform}</p>
                    <span
                      className={`mt-1 inline-flex w-max items-center rounded-full px-3 py-1 text-[0.65rem] font-semibold ${
                        stream.status === "Live Now"
                          ? "bg-red-500/20 text-red-300"
                          : stream.status === "Upcoming"
                          ? "bg-teal-500/20 text-teal-200"
                          : "bg-slate-700/40 text-slate-200"
                      }`}
                    >
                      {stream.status}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">
                  {stream.description}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";
// Design: Events pages use purple gradient hero (--color-purple) — intentional per-content-type color scheme

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { getEvents, type Event } from "@/lib/firestore/events";
import { getPosts } from "@/lib/firestore/posts";
import { displayLocation } from "@/lib/utils";

const dateFilters = ["All Dates", "This Week", "This Month", "Upcoming"] as const;

export default function EventsBrowsePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("All Dates");

  useEffect(() => {
    async function load() {
      try {
        // Primary: dedicated events collection
        let items = await getEvents();
        // Fallback: posts collection if dedicated is empty
        if (items.length === 0) {
          const posts = await getPosts({ type: "event" });
          items = posts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug || p.id.replace(/^event-/, ""),
            description: p.description,
            dates: p.dates,
            location: p.location,
            eventType: p.eventType,
            orgId: p.orgId,
            orgName: p.orgName,
            orgShort: p.orgShort,
            price: p.price,
            schedule: p.schedule,
            highlights: p.highlights,
            featured: p.featured,
            badges: p.badges,
            source: p.source,
          }));
        }
        setEvents(items);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const locations = useMemo(
    () => [...new Set(events.map((e) => e.location).filter(Boolean))] as string[],
    [events]
  );

  const eventTypes = useMemo(
    () => {
      const fromEvents = events.map((e) => e.eventType).filter(Boolean) as string[];
      const all = new Set(fromEvents);
      all.add("Pow Wow");
      return [...all];
    },
    [events]
  );

  const filtered = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.orgName?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
      );
    }
    if (locationFilter) {
      result = result.filter((e) => e.location === locationFilter);
    }
    if (typeFilter) {
      result = result.filter((e) => e.eventType === typeFilter);
    }
    if (dateFilter !== "All Dates") {
      const now = new Date();
      result = result.filter((e) => {
        if (!e.dates) return dateFilter === "Upcoming";
        const match = e.dates.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})?/);
        if (!match) return true;
        const parsed = new Date(`${match[1]} ${match[2]}, ${match[3] || now.getFullYear()}`);
        if (isNaN(parsed.getTime())) return true;
        if (dateFilter === "This Week") {
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return parsed >= now && parsed <= weekEnd;
        }
        if (dateFilter === "This Month") {
          return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
        }
        if (dateFilter === "Upcoming") {
          return parsed >= now;
        }
        return true;
      });
    }
    return result;
  }, [events, search, locationFilter, typeFilter, dateFilter]);

  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--purple), var(--navy))",
          padding: "clamp(32px, 5vw, 64px) clamp(16px, 4vw, 40px)",
        }}
      >
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">
            Events
          </h1>
          <p
            className="text-base sm:text-lg max-w-[600px] mx-auto mb-0"
            style={{ color: "rgba(255,255,255,.75)" }}
          >
            Discover Indigenous community events, conferences, and gatherings
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">All Event Types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Date filter pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {dateFilters.map((df) => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              className="px-4 py-2 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all whitespace-nowrap"
              style={{
                background: dateFilter === df ? "var(--purple)" : "var(--card)",
                color: dateFilter === df ? "#fff" : "var(--text-sec)",
                border: dateFilter === df ? "none" : "1px solid var(--border)",
              }}
            >
              {df}
            </button>
          ))}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[260px] rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div
            className="rounded-2xl text-center py-16 px-6"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
          >
            <p className="text-5xl mb-4">&#127914;</p>
            <h2 className="text-xl font-extrabold text-text mb-2">No Events Found</h2>
            <p className="text-sm text-text-sec mb-6">
              {search || locationFilter || typeFilter
                ? "Try adjusting your filters to find more events."
                : "There are no events listed right now. Check back soon!"}
            </p>
            <Link
              href="/feed"
              className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white no-underline"
              style={{ background: "var(--purple)" }}
            >
              Back to Feed
            </Link>
          </div>
        )}

        {/* Events Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((evt) => {
              const slug = evt.slug || evt.id;
              // Parse a short month/day from the dates string
              const dateParts = evt.dates?.match(/(\w{3,})\s+(\d{1,2})/);
              const month = dateParts?.[1]?.slice(0, 3).toUpperCase() || "";
              const day = dateParts?.[2] || "";

              return (
                <Link
                  key={evt.id}
                  href={`/events/${slug}`}
                  className="no-underline group"
                >
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-200 h-full flex flex-col"
                    style={{
                      background: "var(--card)",
                      border: "1.5px solid var(--border)",
                    }}
                  >
                    {/* Top accent bar */}
                    <div
                      className="h-1.5"
                      style={{ background: "var(--purple)" }}
                    />
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Date badge + type */}
                      <div className="flex items-start gap-3 mb-3">
                        {(month || day) && (
                          <div
                            className="rounded-xl text-center shrink-0"
                            style={{
                              background: "var(--purple-soft)",
                              padding: "8px 12px",
                              minWidth: 52,
                            }}
                          >
                            <p
                              className="text-[10px] font-extrabold tracking-[1px] m-0"
                              style={{ color: "var(--purple)" }}
                            >
                              {month}
                            </p>
                            <p
                              className="text-lg font-extrabold m-0 leading-tight"
                              style={{ color: "var(--purple)" }}
                            >
                              {day}
                            </p>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-bold text-text m-0 mb-1 line-clamp-2 group-hover:text-purple transition-colors">
                            {evt.title}
                          </h3>
                          {evt.eventType && (
                            <span
                              className="inline-block text-[11px] font-semibold rounded-lg px-2 py-0.5"
                              style={{
                                color: "var(--purple)",
                                background: "var(--purple-soft)",
                              }}
                            >
                              {evt.eventType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-col gap-1.5 mt-auto">
                        {evt.location && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#128205;</span> {displayLocation(evt.location)}
                          </p>
                        )}
                        {evt.dates && (
                          <p className="text-xs text-text-sec m-0 flex items-center gap-1.5">
                            <span>&#128197;</span> {evt.dates}
                          </p>
                        )}
                        {evt.orgName && (
                          <p className="text-xs text-text-muted m-0 flex items-center gap-1.5">
                            <span>&#127970;</span> {evt.orgName}
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="mt-4 pt-3 border-t border-border">
                        <span
                          className="text-xs font-bold"
                          style={{ color: "var(--purple)" }}
                        >
                          {evt.price?.toLowerCase() === "free"
                            ? "RSVP - Free Event"
                            : "View Details"}{" "}
                          &#8594;
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}

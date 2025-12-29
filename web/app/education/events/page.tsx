"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { listEducationEvents } from "@/lib/firestore";
import type { EducationEvent, EducationEventType, EducationEventFormat } from "@/lib/types";

const EVENT_TYPES: { value: EducationEventType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "open_house", label: "Open House" },
  { value: "info_session", label: "Info Session" },
  { value: "campus_tour", label: "Campus Tour" },
  { value: "application_workshop", label: "Application Workshop" },
  { value: "career_fair", label: "Career Fair" },
  { value: "webinar", label: "Webinar" },
  { value: "orientation", label: "Orientation" },
  { value: "other", label: "Other" },
];

const EVENT_FORMATS: { value: EducationEventFormat | ""; label: string }[] = [
  { value: "", label: "All Formats" },
  { value: "in-person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export default function EducationEventsPage() {
  const [events, setEvents] = useState<EducationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<EducationEventType | "">("");
  const [eventFormat, setEventFormat] = useState<EducationEventFormat | "">("");

  useEffect(() => {
    loadEvents();
  }, [eventType, eventFormat]);

  async function loadEvents() {
    setLoading(true);
    try {
      const eventList = await listEducationEvents({
        publishedOnly: true,
        upcoming: true,
        type: eventType || undefined,
        format: eventFormat || undefined,
      });
      setEvents(eventList);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  }

  const getEventTypeIcon = (type?: EducationEventType) => {
    switch (type) {
      case "open_house": return "🏫";
      case "info_session": return "📢";
      case "campus_tour": return "🚶";
      case "application_workshop": return "📝";
      case "career_fair": return "💼";
      case "webinar": return "💻";
      case "orientation": return "🎓";
      default: return "📅";
    }
  };

  const formatEventDate = (dateValue: Date | string | { seconds: number }) => {
    let date: Date;
    if (typeof dateValue === 'object' && 'seconds' in dateValue) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (dateValue: Date | string | { seconds: number }) => {
    let date: Date;
    if (typeof dateValue === 'object' && 'seconds' in dateValue) {
      date = new Date(dateValue.seconds * 1000);
    } else {
      date = new Date(dateValue);
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <Link href="/education" className="hover:text-white transition-colors">
          Education
        </Link>
        <span className="mx-2">→</span>
        <span className="text-white">Events</span>
      </nav>

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
          Education
        </p>
        <h1 className="mt-4 text-4xl font-bold italic tracking-tight text-white sm:text-5xl">
          Education Events
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Open houses, info sessions, campus tours, and more from Indigenous-serving institutions.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-8">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Event Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EducationEventType | "")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Event Format */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Format
            </label>
            <select
              value={eventFormat}
              onChange={(e) => setEventFormat(e.target.value as EducationEventFormat | "")}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {EVENT_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-400">
          {loading ? "Loading..." : `${events.length} upcoming events`}
        </p>
        {(eventType || eventFormat) && (
          <button
            onClick={() => {
              setEventType("");
              setEventFormat("");
            }}
            className="text-sm text-[#14B8A6] hover:text-[#16cdb8]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Events List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-32" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/education/events/${event.id}`}
              className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
            >
              {/* Date Box */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40 p-4 shrink-0 w-20">
                <span className="text-xs font-semibold text-[#14B8A6] uppercase">
                  {new Date(event.startDatetime).toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-2xl font-bold text-white">
                  {new Date(event.startDatetime).getDate()}
                </span>
              </div>

              {/* Event Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="rounded-md bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-1 text-xs font-semibold text-[#14B8A6] capitalize">
                    {event.type?.replace("_", " ")}
                  </span>
                  <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 capitalize">
                    {event.format}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-[#14B8A6] transition-colors">
                  {event.title}
                </h3>

                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
                  <span className="text-[#14B8A6] font-medium">{event.schoolName}</span>
                  <span>🕐 {formatEventTime(event.startDatetime)}</span>
                  {event.location && <span>📍 {event.location}</span>}
                </div>
              </div>

              {/* RSVP Button */}
              <button className="hidden sm:block rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]">
                View Event →
              </button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <span className="text-5xl mb-4 block">📅</span>
          <h3 className="text-xl font-bold text-white mb-2">No Upcoming Events</h3>
          <p className="text-slate-400 mb-6">
            {eventType || eventFormat
              ? "Try adjusting your filters."
              : "Check back soon for education events from schools."}
          </p>
          <Link
            href="/education/schools"
            className="inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
          >
            Browse Schools
          </Link>
        </div>
      )}

      {/* CTA Section */}
      <section className="mt-16 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Hosting an Education Event?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          List your open house, info session, or campus tour on IOPPS to reach Indigenous students.
        </p>
        <Link
          href="/organization/dashboard?tab=education"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 hover:bg-[#16cdb8] transition-colors"
        >
          Post an Event
        </Link>
      </section>
    </PageShell>
  );
}

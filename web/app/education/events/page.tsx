import { Suspense } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  MapPinIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  ClockIcon,
  UserGroupIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { getUpcomingEducationEvents, listEducationEvents } from "@/lib/firestore";
import type { EducationEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  { value: "open-house", label: "Open House" },
  { value: "info-session", label: "Info Session" },
  { value: "campus-tour", label: "Campus Tour" },
  { value: "webinar", label: "Webinar" },
  { value: "career-fair", label: "Career Fair" },
  { value: "workshop", label: "Workshop" },
  { value: "orientation", label: "Orientation" },
  { value: "other", label: "Other" },
];

function formatDateTime(timestamp: unknown): string {
  if (!timestamp) return "TBD";
  const date =
    typeof timestamp === "object" &&
    timestamp !== null &&
    "toDate" in timestamp
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string);
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(timestamp: unknown): { day: string; month: string } {
  if (!timestamp) return { day: "--", month: "---" };
  const date =
    typeof timestamp === "object" &&
    timestamp !== null &&
    "toDate" in timestamp
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString("en-CA", { month: "short" }),
  };
}

async function UpcomingEvents() {
  const events = await getUpcomingEducationEvents(30, 6);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-4 text-slate-400">
          No upcoming events in the next 30 days.
        </p>
        <p className="text-sm text-slate-500">Check back soon for new events!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

async function AllEvents({
  type,
  format,
}: {
  type?: string;
  format?: string;
}) {
  const events = await listEducationEvents({
    type: type as EducationEvent["type"],
    format: format as EducationEvent["format"],
    isPublished: true,
    maxResults: 50,
  });

  // Filter to only show upcoming events
  const now = new Date();
  const upcomingEvents = events.filter((event) => {
    if (!event.startDatetime) return false;
    const eventDate =
      typeof event.startDatetime === "object" &&
      "toDate" in event.startDatetime
        ? event.startDatetime.toDate()
        : new Date(event.startDatetime as string);
    return eventDate >= now;
  });

  if (upcomingEvents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-4 text-slate-400">
          No events found matching your criteria.
        </p>
        <Link
          href="/education/events"
          className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300"
        >
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {upcomingEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: EducationEvent }) {
  const dateInfo = formatShortDate(event.startDatetime);
  const typeLabel =
    EVENT_TYPES.find((t) => t.value === event.type)?.label || event.type;

  const getFormatIcon = () => {
    switch (event.format) {
      case "virtual":
        return <ComputerDesktopIcon className="h-4 w-4" />;
      case "in-person":
        return <BuildingOfficeIcon className="h-4 w-4" />;
      case "hybrid":
        return (
          <div className="flex -space-x-1">
            <ComputerDesktopIcon className="h-3 w-3" />
            <BuildingOfficeIcon className="h-3 w-3" />
          </div>
        );
      default:
        return <CalendarDaysIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="group rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-violet-500/50 transition-colors">
      <div className="flex">
        {/* Date Badge */}
        <div className="flex-shrink-0 w-20 bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex flex-col items-center justify-center p-4 border-r border-slate-800">
          <span className="text-2xl font-bold text-white">{dateInfo.day}</span>
          <span className="text-sm text-violet-300 uppercase">
            {dateInfo.month}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-300">
              {typeLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">
              {getFormatIcon()}
              {event.format.charAt(0).toUpperCase() + event.format.slice(1)}
            </span>
          </div>

          <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
            {event.name}
          </h3>

          <p className="mt-1 text-sm text-slate-400">{event.schoolName}</p>

          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {formatDateTime(event.startDatetime)}
            </div>
            {event.location && event.format !== "virtual" && (
              <div className="flex items-center gap-1">
                <MapPinIcon className="h-3 w-3" />
                {event.location.city}, {event.location.province}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            {event.registrationRequired ? (
              <span className="text-xs text-amber-400">
                Registration required
              </span>
            ) : (
              <span className="text-xs text-emerald-400">Open to all</span>
            )}
            {event.registrationUrl ? (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-violet-500 px-3 py-1 text-xs font-medium text-white hover:bg-violet-600 transition-colors"
              >
                Register
              </a>
            ) : (
              <span className="text-xs text-slate-500">
                <UserGroupIcon className="inline h-3 w-3 mr-1" />
                {event.attendeeCount || 0} attending
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function EducationEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const type = params.type;
  const format = params.format;
  const hasFilters = type || format;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="relative border-b border-slate-800 bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Education Events</h1>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl">
            Discover open houses, info sessions, and campus tours from
            post-secondary institutions across Canada.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Event Type:</label>
            <form action="/education/events" className="inline">
              {format && <input type="hidden" name="format" value={format} />}
              <select
                name="type"
                defaultValue={type || ""}
                onChange={(e) => e.target.form?.submit()}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="">All Types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Format:</label>
            <form action="/education/events" className="inline">
              {type && <input type="hidden" name="type" value={type} />}
              <select
                name="format"
                defaultValue={format || ""}
                onChange={(e) => e.target.form?.submit()}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="">All Formats</option>
                <option value="virtual">Virtual</option>
                <option value="in-person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </form>
          </div>

          {hasFilters && (
            <Link
              href="/education/events"
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Clear filters
            </Link>
          )}
        </div>

        {/* Events List */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            {hasFilters ? "Search Results" : "Upcoming Events"}
          </h2>
          <Suspense
            fallback={
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse"
                  />
                ))}
              </div>
            }
          >
            {hasFilters ? (
              <AllEvents type={type} format={format} />
            ) : (
              <UpcomingEvents />
            )}
          </Suspense>
        </section>

        {/* School CTA */}
        <section className="mt-16 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Host Your Events Here
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            Educational institutions can list recruitment events, open houses,
            and info sessions to connect with Indigenous students.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/organization/education"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 font-semibold text-white hover:from-blue-600 hover:to-indigo-600 transition-colors"
            >
              <AcademicCapIcon className="h-5 w-5" />
              Create School Profile
            </Link>
            <Link
              href="/education/schools"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Browse Schools
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

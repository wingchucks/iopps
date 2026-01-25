"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  listSchoolEvents,
  deleteEducationEvent,
} from "@/lib/firestore";
import type { School, EducationEvent } from "@/lib/types";
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

export default function OrganizationEducationEventsPage() {
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [events, setEvents] = useState<EducationEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);

          if (schoolData) {
            const eventsData = await listSchoolEvents(schoolData.id);
            setEvents(eventsData);
          }
        }
      } catch (err) {
        console.error("Error loading events:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const handleDelete = async (eventId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    )
      return;

    setDeleting(eventId);
    try {
      await deleteEducationEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    } finally {
      setDeleting(null);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
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

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "open-house": "Open House",
      "info-session": "Info Session",
      "campus-tour": "Campus Tour",
      webinar: "Webinar",
      "career-fair": "Career Fair",
      workshop: "Workshop",
      orientation: "Orientation",
      other: "Other",
    };
    return labels[type] || type;
  };

  const formatDateTime = (timestamp: unknown) => {
    if (!timestamp) return "TBD";
    const date =
      typeof timestamp === "object" &&
      timestamp !== null &&
      "toDate" in timestamp
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string);
    return date.toLocaleDateString("en-CA", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = (timestamp: unknown) => {
    if (!timestamp) return false;
    const date =
      typeof timestamp === "object" &&
      timestamp !== null &&
      "toDate" in timestamp
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as string);
    return date > new Date();
  };

  if (loading || loadingData) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-slate-300">
          You need an employer account to manage events.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Login
        </Link>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            No School Profile
          </h2>
          <p className="mt-2 text-slate-400">
            You need to create a school profile before adding events.
          </p>
          <Link
            href="/organization/education"
            className="mt-4 inline-block rounded-lg bg-violet-500 px-6 py-2 font-semibold text-white hover:bg-violet-600"
          >
            Set Up School Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/education"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Education
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Events & Open Houses
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Create and manage recruitment events for prospective students
            </p>
          </div>
          <Link
            href="/organization/education/events/new"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-600 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create Event
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <CalendarDaysIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-blue-200">
              Create info sessions, campus tours, and open houses to connect
              with prospective Indigenous students. Events will appear on your
              school profile and in the education events calendar.
            </p>
          </div>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
            <CalendarDaysIcon className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-slate-400">
            You haven&apos;t created any events yet.
          </p>
          <Link
            href="/organization/education/events/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <PlusIcon className="h-4 w-4" />
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-xl border bg-slate-900/50 p-6 ${
                isUpcoming(event.startDatetime)
                  ? "border-slate-800"
                  : "border-slate-800/50 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!isUpcoming(event.startDatetime) && (
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-400">
                        Past Event
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {event.name}
                    </h3>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {formatDateTime(event.startDatetime)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-300">
                      {getFormatIcon(event.format)}
                      {event.format.charAt(0).toUpperCase() +
                        event.format.slice(1)}
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">
                      {getEventTypeLabel(event.type)}
                    </span>
                  </div>

                  {event.location && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-slate-400">
                      <MapPinIcon className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      event.isPublished
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {event.isPublished ? "Published" : "Draft"}
                  </span>
                  <Link
                    href={`/organization/education/events/${event.id}/edit`}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-700/50 hover:text-white"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deleting === event.id}
                    className="rounded-md p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {event.description && (
                <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                  {event.description}
                </p>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-6 border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <EyeIcon className="h-4 w-4" />
                  <span>{event.viewCount || 0} views</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <UserGroupIcon className="h-4 w-4" />
                  <span>{event.attendeeCount || 0} RSVPs</span>
                </div>
                {event.registrationUrl && (
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-violet-400 hover:text-violet-300"
                  >
                    View registration page →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

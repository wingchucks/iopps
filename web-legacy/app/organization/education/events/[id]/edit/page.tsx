"use client";

import { FormEvent, useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getEducationEvent,
  updateEducationEvent,
  getSchoolByEmployerId,
} from "@/lib/firestore";
import type { EducationEventType, EducationEventFormat, EducationEvent, School } from "@/lib/types";

const EVENT_TYPES: { value: EducationEventType; label: string }[] = [
  { value: "open_house", label: "Open House" },
  { value: "info_session", label: "Information Session" },
  { value: "campus_tour", label: "Campus Tour" },
  { value: "webinar", label: "Webinar" },
  { value: "career_fair", label: "Career Fair" },
  { value: "application_workshop", label: "Application Workshop" },
];

const EVENT_FORMATS: { value: EducationEventFormat; label: string }[] = [
  { value: "in-person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function formatTimeForInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toTimeString().slice(0, 5);
}

export default function EditEducationEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EducationEvent | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EducationEventType>("info_session");
  const [format, setFormat] = useState<EducationEventFormat>("in-person");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [virtualLink, setVirtualLink] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const [eventData, schoolData] = await Promise.all([
          getEducationEvent(id),
          getSchoolByEmployerId(user.uid),
        ]);

        setSchool(schoolData);

        if (eventData) {
          // Verify ownership
          if (schoolData?.id !== eventData.schoolId) {
            setError("You don't have permission to edit this event");
            setLoading(false);
            return;
          }

          setEvent(eventData);
          // Populate form
          setTitle(eventData.title || eventData.name || "");
          setDescription(eventData.description || "");
          setEventType((eventData.eventType as EducationEventType) || eventData.type || "info_session");
          setFormat(eventData.format || "in-person");

          // Handle date/time
          const startDateTime = eventData.startDate
            ? typeof eventData.startDate === "object" && "toDate" in eventData.startDate
              ? eventData.startDate.toDate()
              : new Date(eventData.startDate as string)
            : null;
          const endDateTime = eventData.endDate
            ? typeof eventData.endDate === "object" && "toDate" in eventData.endDate
              ? eventData.endDate.toDate()
              : new Date(eventData.endDate as string)
            : null;

          if (startDateTime) {
            setStartDate(formatDateForInput(startDateTime));
            setStartTime(formatTimeForInput(startDateTime));
          }
          if (endDateTime) {
            setEndDate(formatDateForInput(endDateTime));
            setEndTime(formatTimeForInput(endDateTime));
          }

          setLocation(eventData.location || "");
          setVirtualLink(eventData.virtualLink || "");
          setRegistrationUrl(eventData.registrationUrl || "");
          setRegistrationRequired(eventData.registrationRequired);
          setCapacity(eventData.capacity?.toString() || "");
          setIsPublished(eventData.isPublished);
        }
      } catch (err) {
        console.error("Error loading event:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Please sign in
        </h1>
        <Link
          href="/login"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          Login
        </Link>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Organization access required
        </h1>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Event not found
        </h1>
        <Link
          href="/organization/educate/profile"
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !event) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Combine date and time
      const startDatetime = new Date(`${startDate}T${startTime || "09:00"}`);
      const endDatetime = endDate
        ? new Date(`${endDate}T${endTime || "17:00"}`)
        : undefined;

      await updateEducationEvent(event.id, {
        name: title,
        title,
        description,
        type: eventType,
        eventType,
        format,
        startDatetime: startDatetime,
        startDate: startDatetime,
        endDatetime: endDatetime,
        endDate: endDatetime,
        location: format !== "online" ? location : undefined,
        virtualLink: format !== "in-person" ? virtualLink : undefined,
        registrationUrl: registrationUrl || undefined,
        registrationRequired,
        capacity: capacity ? parseInt(capacity) : undefined,
        isPublished,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/organization/educate/profile");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <Link
            href="/organization/educate/profile"
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            ← Back to Education Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Edit Event
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Update {event.title}.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-sm text-emerald-200">
            Event updated successfully! Redirecting...
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Publishing Status */}
          <div className="rounded-lg border border-[var(--card-border)] bg-surface p-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white">
                  Published Status
                </span>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {isPublished
                    ? "Event is visible to students"
                    : "Event is hidden from public view"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublished ? "bg-purple-500" : "bg-slate-600"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-[var(--card-bg)] transition-transform ${isPublished ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </label>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Event Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Event Type *
                </label>
                <select
                  required
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EducationEventType)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Format *
                </label>
                <select
                  required
                  value={format}
                  onChange={(e) => setFormat(e.target.value as EducationEventFormat)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                >
                  {EVENT_FORMATS.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Date & Time
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Location
            </h2>

            {format !== "online" && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Physical Location {format === "in-person" && "*"}
                </label>
                <input
                  type="text"
                  required={format === "in-person"}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            {format !== "in-person" && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Virtual Meeting Link {format === "online" && "*"}
                </label>
                <input
                  type="url"
                  required={format === "online"}
                  value={virtualLink}
                  onChange={(e) => setVirtualLink(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Registration */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-[var(--card-border)] pb-2">
              Registration
            </h2>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={registrationRequired}
                onChange={(e) => setRegistrationRequired(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">
                Registration is required for this event
              </span>
            </label>

            {registrationRequired && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Registration URL
                  </label>
                  <input
                    type="url"
                    value={registrationUrl}
                    onChange={(e) => setRegistrationUrl(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Maximum Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    min="1"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[var(--card-border)] flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/organization/educate/profile"
              className="rounded-md border border-[var(--card-border)] px-6 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-surface transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

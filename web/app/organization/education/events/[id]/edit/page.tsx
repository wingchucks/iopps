"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  getEducationEvent,
  updateEducationEvent,
  setEducationEventPublished,
  deleteEducationEvent,
} from "@/lib/firestore";
import type {
  School,
  EducationEvent,
  EducationEventType,
  EducationEventFormat,
} from "@/lib/types";
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface EventFormData {
  name: string;
  description: string;
  type: EducationEventType;
  format: EducationEventFormat;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  virtualLink: string;
  registrationUrl: string;
  registrationRequired: boolean;
  capacity: string;
}

const EVENT_TYPES: { value: EducationEventType; label: string }[] = [
  { value: "open_house", label: "Open House" },
  { value: "info_session", label: "Info Session" },
  { value: "campus_tour", label: "Campus Tour" },
  { value: "webinar", label: "Webinar" },
  { value: "career_fair", label: "Career Fair" },
  { value: "other", label: "Other" },
];

function parseDateTime(datetime: unknown): { date: string; time: string } {
  if (!datetime) return { date: "", time: "" };

  const d =
    typeof datetime === "object" &&
    datetime !== null &&
    "toDate" in datetime
      ? (datetime as { toDate: () => Date }).toDate()
      : new Date(datetime as string);

  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

export default function EditEducationEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [event, setEvent] = useState<EducationEvent | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    type: "info_session",
    format: "in-person",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    venue: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    virtualLink: "",
    registrationUrl: "",
    registrationRequired: false,
    capacity: "",
  });

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const profile = await getEmployerProfile(user.uid);
        if (profile) {
          const schoolData = await getSchoolByOrganizationId(profile.id);
          setSchool(schoolData);

          // Load the event
          const eventData = await getEducationEvent(id);
          if (eventData) {
            // Verify the event belongs to this school
            if (schoolData && eventData.schoolId === schoolData.id) {
              setEvent(eventData);

              // Parse start/end datetimes
              const start = parseDateTime(eventData.startDatetime);
              const end = parseDateTime(eventData.endDatetime);

              // Populate form with existing data
              setFormData({
                name: eventData.name || "",
                description: eventData.description || "",
                type: eventData.type || "info-session",
                format: eventData.format || "in-person",
                startDate: start.date,
                startTime: start.time,
                endDate: end.date,
                endTime: end.time,
                venue: eventData.location?.venue || "",
                address: eventData.location?.address || "",
                city: eventData.location?.city || "",
                province: eventData.location?.province || "",
                postalCode: eventData.location?.postalCode || "",
                virtualLink: eventData.virtualLink || "",
                registrationUrl: eventData.registrationUrl || "",
                registrationRequired: eventData.registrationRequired || false,
                capacity: eventData.capacity?.toString() || "",
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading event:", err);
        setError("Failed to load event");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user, id]);

  const handleSubmit = async (e: React.FormEvent, publish?: boolean) => {
    e.preventDefault();
    if (!school || !event) return;

    setError(null);
    setSaving(true);

    try {
      // Build start datetime
      const startDatetime =
        formData.startDate && formData.startTime
          ? new Date(
              `${formData.startDate}T${formData.startTime}`
            ).toISOString()
          : null;

      // Build end datetime
      const endDatetime =
        formData.endDate && formData.endTime
          ? new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
          : undefined;

      const updateData: Partial<EducationEvent> = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        format: formData.format,
        startDatetime,
        endDatetime,
        registrationRequired: formData.registrationRequired,
        registrationUrl: formData.registrationUrl || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      };

      // Add location for in-person/hybrid events
      if (formData.format !== "virtual") {
        updateData.location = {
          venue: formData.venue || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
        };
      }

      // Add virtual link for virtual/hybrid events
      if (formData.format !== "in-person" && formData.virtualLink) {
        updateData.virtualLink = formData.virtualLink;
      }

      await updateEducationEvent(event.id, updateData);

      // Handle publish/unpublish separately
      if (publish !== undefined) {
        await setEducationEventPublished(event.id, publish);
      }

      router.push("/organization/education/events");
    } catch (err) {
      console.error("Error updating event:", err);
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    setDeleting(true);
    try {
      await deleteEducationEvent(event.id);
      router.push("/organization/education/events");
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err instanceof Error ? err.message : "Failed to delete event");
      setDeleting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Employer access required</h1>
        <p className="text-slate-300">
          You need an employer account to edit events.
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

  if (!school || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            Event Not Found
          </h2>
          <p className="mt-2 text-slate-400">
            This event doesn&apos;t exist or you don&apos;t have access to edit
            it.
          </p>
          <Link
            href="/organization/education/events"
            className="mt-4 inline-block rounded-lg bg-violet-500 px-6 py-2 font-semibold text-white hover:bg-violet-600"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/education/events"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Events
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Event</h1>
            <p className="mt-1 text-sm text-slate-400">
              Update {event.name} at {school.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                event.isPublished
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {event.isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Event?</h3>
            </div>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete &quot;{event.name}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
            Event Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="e.g., Fall 2025 Open House"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="Describe what attendees can expect..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Event Type *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as EducationEventType,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Format *
                </label>
                <select
                  required
                  value={formData.format}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      format: e.target.value as EducationEventFormat,
                    })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="in-person">In-Person</option>
                  <option value="virtual">Virtual</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Date & Time
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location (shown for in-person and hybrid) */}
        {formData.format !== "virtual" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Location</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) =>
                    setFormData({ ...formData, venue: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="e.g., Main Campus Student Centre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  placeholder="123 University Ave"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Province
                  </label>
                  <select
                    value={formData.province}
                    onChange={(e) =>
                      setFormData({ ...formData, province: e.target.value })
                    }
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">Select</option>
                    <option value="AB">Alberta</option>
                    <option value="BC">British Columbia</option>
                    <option value="MB">Manitoba</option>
                    <option value="NB">New Brunswick</option>
                    <option value="NL">Newfoundland and Labrador</option>
                    <option value="NS">Nova Scotia</option>
                    <option value="NT">Northwest Territories</option>
                    <option value="NU">Nunavut</option>
                    <option value="ON">Ontario</option>
                    <option value="PE">Prince Edward Island</option>
                    <option value="QC">Quebec</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="YT">Yukon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                    placeholder="A1A 1A1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Virtual Link (shown for virtual and hybrid) */}
        {formData.format !== "in-person" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Virtual Meeting
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={formData.virtualLink}
                onChange={(e) =>
                  setFormData({ ...formData, virtualLink: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="https://zoom.us/j/..."
              />
              <p className="mt-1 text-xs text-slate-500">
                This link will be shared with registered attendees.
              </p>
            </div>
          </div>
        )}

        {/* Registration */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Registration
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.registrationRequired}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registrationRequired: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-300">
                Registration is required for this event
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Registration URL
              </label>
              <input
                type="url"
                value={formData.registrationUrl}
                onChange={(e) =>
                  setFormData({ ...formData, registrationUrl: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="https://yourschool.ca/events/register"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Capacity
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">
            Danger Zone
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Once you delete an event, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Event
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/organization/education/events"
            className="rounded-lg border border-slate-700 px-6 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
          {event.isPublished ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, false)}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-6 py-2 font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Unpublish"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSubmit(e, true)}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
              >
                {saving ? "Publishing..." : "Save & Publish"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

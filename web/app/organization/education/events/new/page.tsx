"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getEmployerProfile } from "@/lib/firestore/employers";
import {
  getSchoolByOrganizationId,
  createEducationEvent,
} from "@/lib/firestore";
import type {
  School,
  EducationEventType,
  EducationEventFormat,
} from "@/lib/types";
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
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

export default function NewEducationEventPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          if (schoolData?.location) {
            setFormData((prev) => ({
              ...prev,
              city: schoolData.location?.city || "",
              province: schoolData.location?.province || "",
            }));
          }
        }
      } catch (err) {
        console.error("Error loading school:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    if (!school) return;

    setError(null);
    setSaving(true);

    try {
      // Build start datetime
      const startDatetime = formData.startDate && formData.startTime
        ? new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
        : null;

      // Build end datetime
      const endDatetime = formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
        : undefined;

      const eventData = {
        schoolId: school.id,
        schoolName: school.name,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        format: formData.format,
        startDatetime,
        endDatetime,
        isPublished: publish,
        registrationRequired: formData.registrationRequired,
      } as Parameters<typeof createEducationEvent>[0];

      // Add location for in-person/hybrid events
      if (formData.format !== "virtual") {
        eventData.location = {
          venue: formData.venue || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
        };
      }

      // Add virtual link for virtual/hybrid events
      if (formData.format !== "in-person" && formData.virtualLink) {
        eventData.virtualLink = formData.virtualLink;
      }

      // Add registration info
      if (formData.registrationUrl) {
        eventData.registrationUrl = formData.registrationUrl;
      }

      if (formData.capacity) {
        eventData.capacity = parseInt(formData.capacity);
      }

      await createEducationEvent(eventData);
      router.push("/organization/education/events");
    } catch (err) {
      console.error("Error creating event:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
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
          You need an employer account to create events.
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
      <div className="mx-auto max-w-4xl px-4 py-10">
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/education/events"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-white">Create New Event</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a recruitment event for {school.name}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/organization/education/events"
            className="rounded-lg border border-slate-700 px-6 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e, true)}
            className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-2 font-semibold text-white hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}

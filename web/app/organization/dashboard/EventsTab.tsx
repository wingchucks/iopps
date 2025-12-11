"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerPowwows,
  createPowwowEvent,
  updatePowwowEvent,
  deletePowwow,
} from "@/lib/firestore";
import { PosterUploader } from "@/components/PosterUploader";
import type { PowwowEvent } from "@/lib/types";
import type { PowwowExtractedData } from "@/lib/googleAi";
import {
  CalendarDaysIcon,
  MapPinIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

type StatusFilter = "all" | "active" | "inactive";

export default function EventsTab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PowwowEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const eventsData = await listEmployerPowwows(user.uid);
      setEvents(eventsData);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter === "active" && event.active === false) return false;
      if (statusFilter === "inactive" && event.active !== false) return false;
      if (
        keyword &&
        !`${event.name} ${event.description} ${event.location}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [events, keyword, statusFilter]);

  const handleToggleStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      await updatePowwowEvent(eventId, { active: !currentStatus });
      await loadData();
    } catch (err) {
      console.error("Error toggling event status:", err);
      alert("Failed to update event status");
    }
  };

  const handleDelete = async (eventId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePowwow(eventId);
      await loadData();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 shadow-xl shadow-purple-900/20">
        <h2 className="text-2xl font-bold text-white">Pow Wows & Events</h2>
        <p className="mt-2 text-slate-400">
          Manage your pow wow gatherings and cultural events
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <label className="sr-only">Search</label>
            <input
              type="text"
              placeholder="Search events..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="sr-only">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          New Event
        </button>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-white">
            {keyword || statusFilter !== "all" ? "No events found" : "No events yet"}
          </h3>
          <p className="mt-2 text-slate-400">
            {keyword || statusFilter !== "all"
              ? "Try adjusting your search or filter"
              : "Create your first pow wow or cultural event to share with the community."}
          </p>
          {!keyword && statusFilter === "all" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white"
            >
              <PlusIcon className="h-5 w-5" />
              Create your first event
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {event.name}
                    </h3>
                    {event.livestream && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                        <VideoCameraIcon className="h-3 w-3" />
                        Livestream
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPinIcon className="h-4 w-4" />
                      {event.location}
                    </span>
                    {(event.dateRange || event.startDate) && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDaysIcon className="h-4 w-4" />
                        {event.dateRange || (event.startDate ? new Date(event.startDate as any).toLocaleDateString() : '')}
                      </span>
                    )}
                    {event.host && (
                      <span className="text-slate-500">
                        Hosted by {event.host}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      event.active !== false
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {event.active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                <button
                  onClick={() => handleToggleStatus(event.id, event.active !== false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {event.active !== false ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(event.id, event.name)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [season, setSeason] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("open");
  const [livestream, setLivestream] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(true);

  const handlePosterDataExtracted = (data: PowwowExtractedData) => {
    if (data.name) setName(data.name);
    if (data.host) setHost(data.host);
    if (data.description) setDescription(data.description);
    if (data.location) setLocation(data.location);
    if (data.startDate) setStartDate(data.startDate);
    if (data.endDate) setEndDate(data.endDate);
    if (data.dateRange) setDateRange(data.dateRange);
    if (data.registrationStatus) setRegistrationStatus(data.registrationStatus);
    if (data.livestream !== undefined) setLivestream(data.livestream);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      await createPowwowEvent({
        employerId: user.uid,
        name,
        host: host || undefined,
        description,
        location,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        dateRange: dateRange || undefined,
        season: season || undefined,
        registrationStatus: registrationStatus || undefined,
        livestream,
      });
      onCreated();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
          <div>
            <h3 className="text-xl font-bold text-white">Create Pow Wow Event</h3>
            <p className="mt-1 text-sm text-slate-400">
              Share pow wow gatherings and cultural events
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* AI Poster Uploader */}
          {showUploader && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-purple-400" />
                  <h4 className="font-semibold text-white">Quick Fill with AI</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploader(false)}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Skip
                </button>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Upload a pow wow poster or flyer and our AI will automatically extract the event details.
              </p>
              <PosterUploader
                eventType="powwow"
                onDataExtracted={handlePosterDataExtracted as any}
              />
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="text-sm text-slate-500">or fill manually</span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Pow Wow Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Annual Traditional Pow Wow"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Host Organization / Nation
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g., First Nations Community Center"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the pow wow, activities, categories, and what attendees can expect..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Community Grounds, Edmonton, AB"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Date Range (if dates are tentative)
              </label>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="e.g., June 15-17, 2024 or Summer 2024"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Season
                </label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select season</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Registration Status
                </label>
                <select
                  value={registrationStatus}
                  onChange={(e) => setRegistrationStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="required">Registration Required</option>
                  <option value="not_required">No Registration Needed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="livestream-modal"
                checked={livestream}
                onChange={(e) => setLivestream(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-purple-500 focus:ring-purple-500"
              />
              <label htmlFor="livestream-modal" className="text-sm text-slate-300">
                This event will be livestreamed
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

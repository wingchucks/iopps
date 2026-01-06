"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerPowwows,
  listEmployerConferences,
  createPowwowEvent,
  updatePowwowEvent,
  deletePowwow,
  deleteConference,
} from "@/lib/firestore";
import { PosterUploader } from "@/components/PosterUploader";
import type { PowwowEvent, Conference } from "@/lib/types";
import type { PowwowExtractedData } from "@/lib/googleAi";
import {
  CalendarDaysIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  FireIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

type EventType = "powwows" | "conferences";
type StatusFilter = "all" | "active" | "inactive";
type DateStatus = "ended" | "happening" | "upcoming";

// Helper to convert Firestore Timestamp to Date
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "object" && "_seconds" in timestamp) {
    return new Date(timestamp._seconds * 1000);
  }
  if (typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  return null;
}

// Determine the date-based status of an event
function getEventDateStatus(startDate: any, endDate: any): DateStatus | null {
  const now = new Date();
  const start = toDate(startDate);
  const end = toDate(endDate);

  // If we have an end date, use it to determine if event has ended
  if (end) {
    if (end < now) return "ended";
    if (start && start <= now && end >= now) return "happening";
    if (start && start > now) return "upcoming";
    // If only end date and it's in the future
    if (!start && end >= now) return "upcoming";
  }

  // If we only have a start date
  if (start) {
    // Assume event lasts one day if no end date
    const eventEndOfDay = new Date(start);
    eventEndOfDay.setHours(23, 59, 59, 999);

    if (eventEndOfDay < now) return "ended";
    if (start <= now && eventEndOfDay >= now) return "happening";
    if (start > now) return "upcoming";
  }

  return null;
}

// Get display configuration for date status
function getDateStatusDisplay(status: DateStatus): { label: string; className: string } {
  switch (status) {
    case "ended":
      return {
        label: "Ended",
        className: "bg-slate-600/20 text-slate-400",
      };
    case "happening":
      return {
        label: "Happening Now",
        className: "bg-amber-500/20 text-amber-400 animate-pulse",
      };
    case "upcoming":
      return {
        label: "Upcoming",
        className: "bg-blue-500/20 text-blue-400",
      };
  }
}

export default function EventsTab() {
  const { user } = useAuth();
  const [eventType, setEventType] = useState<EventType>("powwows");
  const [powwows, setPowwows] = useState<PowwowEvent[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
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
      const [powwowsData, conferencesData] = await Promise.all([
        listEmployerPowwows(user.uid),
        listEmployerConferences(user.uid),
      ]);
      setPowwows(powwowsData);
      setConferences(conferencesData);
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPowwows = useMemo(() => {
    return powwows.filter((event) => {
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
  }, [powwows, keyword, statusFilter]);

  const filteredConferences = useMemo(() => {
    return conferences.filter((conf) => {
      if (statusFilter === "active" && conf.active === false) return false;
      if (statusFilter === "inactive" && conf.active !== false) return false;
      if (
        keyword &&
        !`${conf.title} ${conf.description} ${conf.location}`
          .toLowerCase()
          .includes(keyword.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [conferences, keyword, statusFilter]);

  const handleTogglePowwowStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      await updatePowwowEvent(eventId, { active: !currentStatus });
      await loadData();
    } catch (err) {
      console.error("Error toggling event status:", err);
      alert("Failed to update event status");
    }
  };

  const handleDeletePowwow = async (eventId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    if (!user) return;

    try {
      // Use server-side API to delete (bypasses Firestore rules)
      const idToken = await user.getIdToken();
      const res = await fetch("/api/events/powwow/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ powwowId: eventId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete pow wow");
      }

      await loadData();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  const handleDeleteConference = async (confId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteConference(confId);
      await loadData();
    } catch (err) {
      console.error("Error deleting conference:", err);
      alert("Failed to delete conference");
    }
  };

  const getNewButtonConfig = () => {
    switch (eventType) {
      case "powwows":
        return { href: "/organization/events/new", label: "Pow Wow", modal: true };
      case "conferences":
        return { href: "/organization/conferences/new", label: "Conference", modal: false };
    }
  };

  const newButtonConfig = getNewButtonConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 shadow-xl shadow-purple-900/20">
        <div className="flex items-center gap-3">
          <CalendarDaysIcon className="h-8 w-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Events</h2>
            <p className="mt-1 text-slate-400">
              Manage conferences, pow wows, and cultural events
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        <button
          onClick={() => setEventType("powwows")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
            eventType === "powwows"
              ? "border-b-2 border-purple-500 bg-purple-500/10 text-purple-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
          }`}
        >
          <FireIcon className="h-4 w-4" />
          Pow Wows ({powwows.length})
        </button>
        <button
          onClick={() => setEventType("conferences")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
            eventType === "conferences"
              ? "border-b-2 border-indigo-500 bg-indigo-500/10 text-indigo-400"
              : "border-b-2 border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300"
          }`}
        >
          <BuildingOfficeIcon className="h-4 w-4" />
          Conferences ({conferences.length})
        </button>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <label className="sr-only">Search</label>
            <input
              type="text"
              placeholder={`Search ${eventType === "powwows" ? "pow wows" : "conferences"}...`}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="sr-only">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {newButtonConfig.modal ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
          >
            <PlusIcon className="h-5 w-5" />
            New {newButtonConfig.label}
          </button>
        ) : (
          <Link
            href={newButtonConfig.href}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
          >
            <PlusIcon className="h-5 w-5" />
            New {newButtonConfig.label}
          </Link>
        )}
      </div>

      {/* Pow Wows List */}
      {eventType === "powwows" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            </div>
          ) : filteredPowwows.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <FireIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {keyword || statusFilter !== "all" ? "No pow wows found" : "No pow wows yet"}
              </h3>
              <p className="mt-2 text-slate-400">
                {keyword || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Create your first pow wow event to share with the community."}
              </p>
              {!keyword && statusFilter === "all" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create your first pow wow
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPowwows.map((event) => (
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
                      {/* Date-based status badge */}
                      {(() => {
                        const dateStatus = getEventDateStatus(event.startDate, event.endDate);
                        if (dateStatus) {
                          const display = getDateStatusDisplay(dateStatus);
                          return (
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${display.className}`}>
                              {display.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {/* Active/Inactive status badge */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          event.active !== false
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {event.active !== false ? "Active" : "Paused"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                    <Link
                      href={`/community/${event.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      View public page
                    </Link>
                    <button
                      onClick={() => handleTogglePowwowStatus(event.id, event.active !== false)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      {event.active !== false ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeletePowwow(event.id, event.name)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Conferences List */}
      {eventType === "conferences" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : filteredConferences.length === 0 ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-12 text-center">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">
                {keyword || statusFilter !== "all" ? "No conferences found" : "No conferences yet"}
              </h3>
              <p className="mt-2 text-slate-400">
                {keyword || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Create your first conference to share with professionals."}
              </p>
              {!keyword && statusFilter === "all" && (
                <Link
                  href="/organization/conferences/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create your first conference
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConferences.map((conf) => (
                <div
                  key={conf.id}
                  className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {conf.title}
                      </h3>
                      <p className="mt-1 text-sm text-indigo-400">
                        {conf.organizerName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4" />
                          {conf.location || "TBD"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="h-4 w-4" />
                          {typeof conf.startDate === 'string' ? conf.startDate :
                            conf.startDate && typeof conf.startDate === 'object' && 'toDate' in conf.startDate
                              ? conf.startDate.toDate().toLocaleDateString()
                              : 'TBD'}
                        </span>
                        {conf.registrationUrl && (
                          <span className="text-emerald-400">Registration open</span>
                        )}
                      </div>
                      {conf.description && (
                        <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                          {conf.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Date-based status badge */}
                      {(() => {
                        const dateStatus = getEventDateStatus(conf.startDate, conf.endDate);
                        if (dateStatus) {
                          const display = getDateStatusDisplay(dateStatus);
                          return (
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${display.className}`}>
                              {display.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {/* Active/Inactive status badge */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          conf.active !== false
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {conf.active !== false ? "Active" : "Paused"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-4">
                    <Link
                      href={`/organization/conferences/${conf.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/conferences/${conf.id}`}
                      className="rounded-lg px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      View public page
                    </Link>
                    <button
                      onClick={() => handleDeleteConference(conf.id, conf.title)}
                      className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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

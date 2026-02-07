"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getPowwowEvent, updatePowwowEvent } from "@/lib/firestore";
import { POWWOW_EVENT_TYPES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import type { PowwowEvent, PowwowEventType, NorthAmericanRegion } from "@/lib/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function EditEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  // Loading state
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<PowwowEvent | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<PowwowEventType>("Pow Wow");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState<NorthAmericanRegion | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [host, setHost] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("Open");
  const [livestream, setLivestream] = useState(false);
  const [active, setActive] = useState(true);

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load event data
  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      try {
        const eventData = await getPowwowEvent(eventId);
        if (!eventData) {
          setError("Event not found");
          setLoading(false);
          return;
        }

        setEvent(eventData);

        // Populate form fields
        setName(eventData.name || "");
        setEventType(eventData.eventType || "Pow Wow");
        setDescription(eventData.description || "");
        setLocation(eventData.location || "");
        setRegion((eventData.region as NorthAmericanRegion) || "");
        setHost(eventData.host || "");
        setRegistrationStatus(eventData.registrationStatus || "Open");
        setLivestream(eventData.livestream || false);
        setActive(eventData.active !== false);
        setImageUrl(eventData.imageUrl || null);

        // Parse dates
        if (eventData.startDate) {
          const date = typeof eventData.startDate === "string"
            ? eventData.startDate
            : new Date((eventData.startDate as any).seconds * 1000).toISOString().split("T")[0];
          setStartDate(date);
        }
        if (eventData.endDate) {
          const date = typeof eventData.endDate === "string"
            ? eventData.endDate
            : new Date((eventData.endDate as any).seconds * 1000).toISOString().split("T")[0];
          setEndDate(date);
        }
      } catch (err) {
        console.error("Error loading event:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !eventId) return;

    setSaving(true);
    setError(null);

    try {
      let newImageUrl = imageUrl;

      // Upload new image if provided
      if (imageFile && storage) {
        setUploadingImage(true);
        const filename = `events/posters/${user.uid}/${Date.now()}-${imageFile.name}`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, imageFile);
        newImageUrl = await getDownloadURL(storageRef);
        setUploadingImage(false);
      }

      // Update the event
      await updatePowwowEvent(eventId, {
        name,
        eventType,
        description,
        location,
        region: region || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        host: host || undefined,
        registrationStatus: registrationStatus || undefined,
        livestream,
        active,
        imageUrl: newImageUrl || undefined,
      });

      toast.success("Event updated successfully!");
      router.push("/organization/host/events");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not update event.");
      toast.error("Failed to update event");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            href="/organization/host/events"
            className="text-accent hover:underline"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";
  const isOwner = user?.uid === event?.employerId;
  const canEdit = isOwner || isSuperAdmin;

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-red-400 mb-4">You don't have permission to edit this event.</p>
          <Link
            href="/organization/host/events"
            className="text-accent hover:underline"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const currentImage = imagePreview || imageUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/organization/host/events"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Events
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">Edit Event</h1>
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent border border-accent/30">
              Free
            </span>
          </div>
          <p className="mt-2 text-[var(--text-muted)]">
            Update your event details below.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Toggle */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-white">Event Status</label>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {active ? "This event is visible to the public" : "This event is hidden from the public"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  active ? "bg-accent" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Event Type */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6">
            <label className="block text-sm font-medium text-white mb-3">
              Event Type *
            </label>
            <div className="flex flex-wrap gap-3">
              {POWWOW_EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    eventType === type
                      ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25"
                      : "bg-slate-700 text-[var(--text-secondary)] hover:bg-slate-600"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Event Details */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Event Details</h3>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Annual Traditional Pow Wow"
                className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell attendees about your event..."
                className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Host / Organizer
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g., Mohawk Nation Council"
                className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Location & Date */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Location & Date</h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Six Nations Arena, Ohsweken"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                >
                  <option value="">Select region...</option>
                  <optgroup label="Canada">
                    {NORTH_AMERICAN_REGIONS.slice(0, 13).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </optgroup>
                  <optgroup label="United States">
                    {NORTH_AMERICAN_REGIONS.slice(13, -1).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </optgroup>
                  <option value="National / Online Only">National / Online Only</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Options</h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Registration Status
                </label>
                <select
                  value={registrationStatus}
                  onChange={(e) => setRegistrationStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="Coming Soon">Coming Soon</option>
                  <option value="Closed">Closed</option>
                  <option value="Free Entry">Free Entry</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={livestream}
                    onChange={(e) => setLivestream(e.target.checked)}
                    className="h-5 w-5 rounded border-[var(--card-border)] bg-slate-700 text-pink-500 focus:ring-pink-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Livestream Available</span>
                    <p className="text-xs text-[var(--text-muted)]">Will this event be streamed online?</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Event Image */}
          <div className="rounded-2xl bg-surface border border-[var(--card-border)] p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Event Image</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Upload a poster or image for your event.
            </p>

            <div className="flex items-start gap-6">
              {currentImage ? (
                <div className="relative">
                  <img
                    src={currentImage}
                    alt="Preview"
                    className="h-32 w-48 rounded-lg object-cover border border-[var(--card-border)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setImageUrl(null);
                    }}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 w-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--card-border)] bg-slate-700/30 hover:border-pink-500/50 hover:bg-slate-700/50 transition-colors">
                  <svg className="h-8 w-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="mt-2 text-sm text-[var(--text-muted)]">Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (uploadingImage ? "Uploading image..." : "Saving...") : "Save Changes"}
            </button>
            <Link
              href="/organization/host/events"
              className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

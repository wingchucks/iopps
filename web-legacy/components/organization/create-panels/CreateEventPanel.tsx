"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SlideOutPanel } from "@/components/shared/SlideOutPanel";
import { createPowwowEvent, getEmployerProfile } from "@/lib/firestore";
import { POWWOW_EVENT_TYPES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import type { PowwowEventType, NorthAmericanRegion } from "@/lib/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import toast from "react-hot-toast";

interface CreateEventPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventPanel({ isOpen, onClose, onSuccess }: CreateEventPanelProps) {
  const { user } = useAuth();

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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!user) return;

    if (!name.trim()) {
      setError("Event name is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!location.trim()) {
      setError("Location is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get org name if host not set
      let hostName = host;
      if (!hostName) {
        const profile = await getEmployerProfile(user.uid);
        hostName = profile?.organizationName || "";
      }

      let imageUrl: string | undefined;
      if (imageFile && storage) {
        const filename = `events/posters/${user.uid}/${Date.now()}-${imageFile.name}`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await createPowwowEvent({
        employerId: user.uid,
        name,
        eventType,
        description,
        location,
        region: region || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        host: hostName || undefined,
        registrationStatus: registrationStatus || undefined,
        livestream,
        imageUrl,
        active: true,
      });

      toast.success("Event created successfully!");
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEventType("Pow Wow");
    setDescription("");
    setLocation("");
    setRegion("");
    setStartDate("");
    setEndDate("");
    setHost("");
    setRegistrationStatus("Open");
    setLivestream(false);
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Create Event"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={submitting}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Publish Event"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Event Type */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Event Type
          </h3>
          <div className="flex flex-wrap gap-2">
            {POWWOW_EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEventType(type)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  eventType === type
                    ? "bg-accent text-white"
                    : "bg-surface text-[var(--text-secondary)] border border-[var(--card-border)] hover:border-accent/50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {/* Event Details */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Event Details
          </h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Event Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Annual Traditional Pow Wow"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell attendees about your event..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Host / Organizer</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g., Mohawk Nation Council"
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </section>

        {/* Location & Date */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Location & Date
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Six Nations Arena"
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Options */}
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Options
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Registration Status</label>
              <select
                value={registrationStatus}
                onChange={(e) => setRegistrationStatus(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-foreground focus:border-accent focus:outline-none"
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
                  className="h-5 w-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Livestream Available</span>
                  <p className="text-xs text-foreground0">Will this event be streamed online?</p>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Event Image */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-2">
            Event Image (Optional)
          </h3>
          <div className="flex items-start gap-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-24 w-36 rounded-lg object-cover border border-[var(--card-border)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex h-24 w-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--card-border)] bg-surface hover:border-accent/50 transition-colors">
                <svg className="h-6 w-6 text-foreground0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="mt-1 text-xs text-foreground0">Upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </section>
      </form>
    </SlideOutPanel>
  );
}

export default CreateEventPanel;

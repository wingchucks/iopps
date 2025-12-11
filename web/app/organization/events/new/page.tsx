"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createPowwowEvent, getEmployerProfile } from "@/lib/firestore";
import { POWWOW_EVENT_TYPES, NORTH_AMERICAN_REGIONS } from "@/lib/types";
import type { PowwowEventType, NorthAmericanRegion } from "@/lib/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function NewEventPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

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

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load employer profile for host name
  useEffect(() => {
    if (user) {
      getEmployerProfile(user.uid).then((profile) => {
        if (profile?.organizationName) {
          setHost(profile.organizationName);
        }
      });
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Organizations must be signed in to create events.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Organization access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an organization account to create events.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (imageFile && storage) {
        setUploadingImage(true);
        const filename = `events/posters/${user.uid}/${Date.now()}-${imageFile.name}`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
        setUploadingImage(false);
      }

      // Create the event
      await createPowwowEvent({
        employerId: user.uid,
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
        imageUrl,
        active: true,
      });

      setSuccess(true);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/organization/dashboard");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create event.");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Event Created!</h2>
          <p className="mt-2 text-slate-300">
            Your event has been published and is now visible on the Pow Wows & Events page.
          </p>
          <p className="mt-4 text-sm text-slate-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/organization/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">
            Create a Pow Wow or Event
          </h1>
          <p className="mt-2 text-slate-400">
            Share your pow wow, sports event, or cultural gathering with Indigenous communities across North America.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Type */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
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
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Event Details */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Event Details</h3>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Annual Traditional Pow Wow"
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell attendees about your event..."
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Host / Organizer
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g., Mohawk Nation Council"
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Location & Date */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Location & Date</h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Six Nations Arena, Ohsweken"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white placeholder-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as NorthAmericanRegion)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
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
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
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
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">Options</h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Registration Status
                </label>
                <select
                  value={registrationStatus}
                  onChange={(e) => setRegistrationStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
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
                    className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-pink-500 focus:ring-pink-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Livestream Available</span>
                    <p className="text-xs text-slate-400">Will this event be streamed online?</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Event Image */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Event Image (Optional)</h3>
            <p className="text-sm text-slate-400">
              Upload a poster or image for your event. This will be displayed on the event card.
            </p>

            <div className="flex items-start gap-6">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-48 rounded-lg object-cover border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex h-32 w-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/30 hover:border-pink-500/50 hover:bg-slate-700/50 transition-colors">
                  <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="mt-2 text-sm text-slate-400">Upload image</span>
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

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (uploadingImage ? "Uploading image..." : "Creating event...") : "Publish Event"}
            </button>
            <Link
              href="/organization/dashboard"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

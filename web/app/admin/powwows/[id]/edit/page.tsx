"use client";

import { useEffect, useState, FormEvent, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { getPowwowEvent, updatePowwowEvent } from "@/lib/firestore";
import { uploadPowwowImage } from "@/lib/firebase/storage";
import type { PowwowEvent } from "@/lib/types";

export default function AdminEditPowwowPage() {
  const params = useParams();
  const router = useRouter();
  const powwowId = params.id as string;
  const { user, role, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [powwow, setPowwow] = useState<PowwowEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
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
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadPowwow();
  }, [user, role, authLoading, router, powwowId]);

  async function loadPowwow() {
    try {
      setLoading(true);
      const data = await getPowwowEvent(powwowId);
      if (data) {
        setPowwow(data);
        // Populate form fields
        setName(data.name || "");
        setHost(data.host || "");
        setDescription(data.description || "");
        setLocation(data.location || "");
        setDateRange(data.dateRange || "");
        setSeason(data.season || "");
        setRegistrationStatus(data.registrationStatus || "open");
        setLivestream(data.livestream || false);
        setActive(data.active !== false);
        setImageUrl(data.imageUrl || "");

        // Handle date fields - convert from Timestamp if needed
        if (data.startDate) {
          const date = typeof data.startDate === "object" && "toDate" in data.startDate
            ? data.startDate.toDate()
            : new Date(data.startDate);
          setStartDate(date.toISOString().split("T")[0]);
        }
        if (data.endDate) {
          const date = typeof data.endDate === "object" && "toDate" in data.endDate
            ? data.endDate.toDate()
            : new Date(data.endDate);
          setEndDate(date.toISOString().split("T")[0]);
        }
      } else {
        setError("Pow wow not found");
      }
    } catch (err) {
      console.error("Error loading pow wow:", err);
      setError("Failed to load pow wow details");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setAnalyzeError(null);

      // Upload the image
      const result = await uploadPowwowImage(file, powwowId, (progress) => {
        setUploadProgress(progress.progress);
      });

      setImageUrl(result.url);
      setUploadProgress(100);

      // Analyze the poster with AI to auto-fill fields
      setAnalyzing(true);
      try {
        const token = await user.getIdToken();
        const formData = new FormData();
        formData.append("image", file);
        formData.append("eventType", "powwow");

        const response = await fetch("/api/ai/analyze-poster", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.result?.data) {
            const extracted = data.result.data;
            // Auto-fill the form with extracted data
            if (extracted.name) setName(extracted.name);
            if (extracted.host) setHost(extracted.host);
            if (extracted.location) setLocation(extracted.location);
            if (extracted.description) setDescription(extracted.description);
            if (extracted.dateRange) setDateRange(extracted.dateRange);
            if (extracted.registrationStatus) setRegistrationStatus(extracted.registrationStatus);
            if (extracted.livestream !== undefined) setLivestream(extracted.livestream);
          }
        } else {
          const errorData = await response.json();
          setAnalyzeError(errorData.error || "Failed to analyze poster");
        }
      } catch (analyzeErr) {
        console.error("Error analyzing poster:", analyzeErr);
        setAnalyzeError("Could not analyze poster. You can still fill in the details manually.");
      } finally {
        setAnalyzing(false);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !powwow) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Build update object, converting empty strings to null (Firestore doesn't accept undefined)
      const updateData: Record<string, unknown> = {
        name: name || "",
        description: description || "",
        location: location || "",
        livestream: livestream ?? false,
        active: active ?? true,
      };

      // Only include optional fields if they have values, otherwise set to null
      updateData.host = host || null;
      updateData.startDate = startDate || null;
      updateData.endDate = endDate || null;
      updateData.dateRange = dateRange || null;
      updateData.season = season || null;
      updateData.registrationStatus = registrationStatus || null;
      updateData.imageUrl = imageUrl || null;

      await updatePowwowEvent(powwowId, updateData);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating pow wow:", err);
      setError(err instanceof Error ? err.message : "Failed to update pow wow");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveImage() {
    setImageUrl("");
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  if (error && !powwow) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-red-400">{error}</p>
          <Link
            href="/admin/powwows"
            className="mt-4 inline-block text-sm text-[#14B8A6] hover:underline"
          >
            ← Back to Pow Wows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/admin/powwows"
            className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]"
          >
            ← Back to Pow Wows
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Edit Pow Wow
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Update event details and manage poster image
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            Pow wow updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Poster Image Section */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-white">Event Poster</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Upload a poster image for this pow wow event
            </p>

            <div className="mt-4">
              {imageUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-lg border border-[var(--card-border)]">
                    <Image
                      src={imageUrl}
                      alt="Event poster"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                      Replace Image
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--card-border)] p-8 transition hover:border-[#14B8A6]"
                >
                  <svg
                    className="h-12 w-12 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Click to upload poster image
                  </p>
                  <p className="text-xs text-foreground0">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {analyzing && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#14B8A6]">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>AI is reading the poster to auto-fill the form...</span>
                </div>
              )}

              {analyzeError && (
                <p className="mt-2 text-sm text-amber-400">{analyzeError}</p>
              )}
            </div>
          </div>

          {/* Event Details Section */}
          <div className="rounded-xl border border-[var(--card-border)] bg-surface p-6">
            <h2 className="text-lg font-semibold text-white">Event Details</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Pow Wow Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Host Organization / Nation
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
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
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Date Range (if dates are tentative)
                </label>
                <input
                  type="text"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  placeholder="e.g., June 15-17, 2024"
                  className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Season
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                  >
                    <option value="">Select season</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                    <option value="winter">Winter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Registration Status
                  </label>
                  <select
                    value={registrationStatus}
                    onChange={(e) => setRegistrationStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2 text-foreground focus:border-[#14B8A6] focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="required">Registration Required</option>
                    <option value="not_required">No Registration Needed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="livestream"
                  checked={livestream}
                  onChange={(e) => setLivestream(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]"
                />
                <label htmlFor="livestream" className="text-sm text-foreground">
                  This event will be livestreamed
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]"
                />
                <label htmlFor="active" className="text-sm text-foreground">
                  Event is active (visible to users)
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/powwows"
              className="rounded-lg border border-[var(--card-border)] px-6 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--card-border)]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || uploading || analyzing}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

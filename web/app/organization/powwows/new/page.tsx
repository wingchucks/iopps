"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createPowwowEvent } from "@/lib/firestore";
import { PosterUploader } from "@/components/PosterUploader";
import type { PowwowExtractedData } from "@/lib/googleAi";

export default function NewPowwowPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
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

  // Handle data extracted from poster
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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Employers must be signed in to create pow wow events.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "nathan.arias@iopps.ca";

  if (role !== "employer" && !isSuperAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access required
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Switch to an employer account to create pow wow events.
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

      router.push("/organization/powwows");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create pow wow.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/organization/powwows"
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          ← Back to Pow Wows
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        Create a Pow Wow Event
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Share pow wow gatherings and cultural events with the IOPPS community.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {/* AI Poster Uploader */}
      {showUploader && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Quick Fill with AI
            </h2>
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="text-sm text-[var(--text-muted)] hover:text-white"
            >
              Skip this step
            </button>
          </div>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Upload a pow wow poster or flyer and our AI will automatically extract the event details.
          </p>
          <PosterUploader
            eventType="powwow"
            onDataExtracted={handlePosterDataExtracted as any}
          />
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-surface" />
            <span className="text-sm text-foreground0">or fill manually below</span>
            <div className="h-px flex-1 bg-surface" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Pow Wow Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Annual Traditional Pow Wow"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
            placeholder="e.g., First Nations Community Center"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
            placeholder="Describe the pow wow, activities, categories, and what attendees can expect..."
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
            placeholder="e.g., Community Grounds, Edmonton, AB"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
            placeholder="e.g., June 15-17, 2024 or Summer 2024"
            className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
              className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Pow Wow"}
          </button>
        </div>
      </form>
    </div>
  );
}

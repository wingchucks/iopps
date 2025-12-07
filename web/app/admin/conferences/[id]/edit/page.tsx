"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getConference, updateConference } from "@/lib/firestore";
import type { Conference } from "@/lib/types";

export default function AdminEditConferencePage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;
  const { user, role, loading: authLoading } = useAuth();

  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [cost, setCost] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }

    loadConference();
  }, [user, role, authLoading, router, conferenceId]);

  async function loadConference() {
    try {
      setLoading(true);
      const data = await getConference(conferenceId);
      if (data) {
        setConference(data);
        // Populate form fields
        setTitle(data.title || "");
        setDescription(data.description || "");
        setLocation(data.location || "");
        setRegistrationLink(data.registrationLink || "");
        setCost(data.cost || "");
        setActive(data.active !== false);

        // Handle date fields
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
        setError("Conference not found");
      }
    } catch (err) {
      console.error("Error loading conference:", err);
      setError("Failed to load conference details");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !conference) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateConference(conferenceId, {
        title,
        description,
        location,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        registrationLink: registrationLink || undefined,
        cost: cost || undefined,
        active,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating conference:", err);
      setError(err instanceof Error ? err.message : "Failed to update conference");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  if (error && !conference) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-red-400">{error}</p>
          <Link
            href="/admin/conferences"
            className="mt-4 inline-block text-sm text-[#14B8A6] hover:underline"
          >
            ← Back to Conferences
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/admin/conferences"
            className="text-sm text-slate-400 hover:text-[#14B8A6]"
          >
            ← Back to Conferences
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-50">
            Edit Conference
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Update conference details
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
            Conference updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Conference Details Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-lg font-semibold text-white">Conference Details</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Description *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Registration Link
                </label>
                <input
                  type="url"
                  value={registrationLink}
                  onChange={(e) => setRegistrationLink(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Cost
                </label>
                <input
                  type="text"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g., Free, $50, $100-$200"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#14B8A6] focus:ring-[#14B8A6]"
                />
                <label htmlFor="active" className="text-sm text-slate-200">
                  Conference is active (visible to users)
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/conferences"
              className="rounded-lg border border-slate-700 px-6 py-2 text-sm font-medium text-slate-300 hover:border-slate-600"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#14B8A6] px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

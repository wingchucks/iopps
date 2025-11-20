"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getConference, updateConference } from "@/lib/firestore";
import type { Conference } from "@/lib/types";

export default function EditConferencePage() {
  const params = useParams<{ conferenceId: string }>();
  const conferenceId = params?.conferenceId;
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [conference, setConference] = useState<Conference | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conferenceId) return;
    (async () => {
      const data = await getConference(conferenceId);
      if (data) {
        setConference(data);
        setTitle(data.title);
        setDescription(data.description);
        setLocation(data.location);
        setStartDate(
          typeof data.startDate === "string"
            ? data.startDate
            : data.startDate?.toDate().toISOString().split("T")[0] ?? ""
        );
        setEndDate(
          typeof data.endDate === "string"
            ? data.endDate
            : data.endDate?.toDate().toISOString().split("T")[0] ?? ""
        );
        setRegistrationLink(data.registrationLink ?? "");
        setCost(data.cost ?? "");
      }
    })();
  }, [conferenceId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!conferenceId) return;
    setSaving(true);
    setError(null);
    try {
      await updateConference(conferenceId, {
        title,
        description,
        location,
        startDate,
        endDate,
        registrationLink,
        cost,
      });
      router.push("/employer/conferences");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !conference) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading conference...</p>
      </div>
    );
  }

  if (!user || role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access only
        </h1>
        <p className="text-sm text-slate-300">
          Sign in with an employer account to edit conferences.
        </p>
        <Link
          href="/login"
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Edit conference</h1>
      <p className="mt-2 text-sm text-slate-300">
        Update dates, location, or registration info and save your changes.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Start date
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Registration link
          </label>
          <input
            type="url"
            value={registrationLink}
            onChange={(e) => setRegistrationLink(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
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
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}

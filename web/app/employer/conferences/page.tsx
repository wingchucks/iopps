"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  listEmployerConferences,
  updateConference,
} from "@/lib/firestore";
import type { Conference } from "@/lib/types";

export default function EmployerConferencesPage() {
  const { user, role, loading } = useAuth();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "employer") return;
    (async () => {
      try {
        const data = await listEmployerConferences(user.uid);
        setConferences(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load conferences.");
      }
    })();
  }, [role, user]);

  const handleToggleActive = async (conference: Conference) => {
    if (!conference.id) return;
    setUpdatingId(conference.id);
    try {
      await updateConference(conference.id, { active: !conference.active });
      setConferences((prev) =>
        prev.map((item) =>
          item.id === conference.id ? { ...item, active: !conference.active } : item
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not update conference.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Employers must be signed in to manage conferences.
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

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access only
        </h1>
        <p className="text-sm text-slate-300">
          Switch to your employer account to manage conferences.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
            Conferences
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage conferences
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Publish new gatherings and keep existing listings up to date.
          </p>
        </div>
        <Link
          href="/employer/conferences/new"
          className="inline-flex rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
        >
          New conference
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {conferences.length === 0 ? (
        <p className="text-sm text-slate-300">
          You haven&apos;t posted any conferences yet.
        </p>
      ) : (
        <div className="space-y-3">
          {conferences.map((conf) => (
            <div
              key={conf.id}
              className="rounded-md border border-slate-800 bg-slate-950/40 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-50">
                    {conf.title}
                  </p>
                  <p className="text-sm text-slate-300">
                    {conf.location} •{" "}
                    {typeof conf.startDate === "string"
                      ? conf.startDate
                      : conf.startDate?.toDate().toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                  <span
                    className={`rounded-full px-3 py-1 ${
                      conf.active
                        ? "bg-teal-500/10 text-teal-200"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {conf.active ? "Active" : "Closed"}
                  </span>
                  <Link
                    href={`/employer/conferences/${conf.id}/edit`}
                    className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleToggleActive(conf)}
                    disabled={updatingId === conf.id}
                    className="rounded-full border border-slate-700 px-3 py-1 hover:border-teal-400 disabled:opacity-60"
                  >
                    {conf.active ? "Close" : "Reopen"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

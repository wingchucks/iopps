"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getConference } from "@/lib/firestore";
import type { Conference } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

export default function ConferenceDetailPage() {
  const params = useParams<{ conferenceId: string }>();
  const conferenceId = params?.conferenceId;
  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  useEffect(() => {
    if (!conferenceId) return;
    (async () => {
      const data = await getConference(conferenceId);
      setConference(data);
      setLoading(false);
    })();
  }, [conferenceId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading conference...</p>
      </div>
    );
  }

  if (!conference) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Conference not found
        </h1>
        <p className="text-sm text-slate-300">
          This conference might have been removed or is no longer active.
        </p>
        <Link
          href="/conferences"
          className="inline-flex rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
        >
          Back to conferences
        </Link>
      </div>
    );
  }

  const isEmployerOwner =
    role === "employer" && user && conference.employerId === user.uid;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-teal-300">
          Conference
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {conference.title}
        </h1>
        <p className="text-lg text-slate-200">
          {conference.employerName || "Organizer"}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
          <span>{conference.location}</span>
          {conference.startDate && (
            <span>
              {typeof conference.startDate === "string"
                ? conference.startDate
                : conference.startDate?.toDate().toLocaleDateString()}
              {conference.endDate ? " - " : ""}
              {typeof conference.endDate === "string"
                ? conference.endDate
                : conference.endDate?.toDate().toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {role === "community" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
          <p className="font-semibold text-slate-100">
            Add this event to your IOPPS plan.
          </p>
          <p className="mt-1">
            Use your member dashboard to track conferences you plan to attend and
            keep notes for funding or travel.
          </p>
          <Link
            href="/member/profile"
            className="mt-2 inline-flex text-xs font-semibold text-teal-300 underline"
          >
            Open member dashboard
          </Link>
        </section>
      )}

      {role !== "community" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
          <p>Sign in as a community member to save events you plan to attend.</p>
          <div className="mt-2 flex gap-2">
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-teal-400 hover:text-teal-200"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-teal-400 hover:text-teal-200"
            >
              Create account
            </Link>
          </div>
        </section>
      )}

      {isEmployerOwner && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
          <p className="font-semibold text-slate-100">
            You published this event via IOPPS.
          </p>
          <p className="mt-1">
            Edit speakers, manage registrations, or promote live streams from your
            employer dashboard.
          </p>
          <Link
            href="/employer#opportunities"
            className="mt-2 inline-flex text-xs font-semibold text-teal-300 underline"
          >
            Go to employer dashboard
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">About</h2>
          <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">
            {conference.description}
          </p>
        </div>
        {conference.cost && (
          <p className="text-sm text-slate-300">Cost: {conference.cost}</p>
        )}
        {conference.registrationLink && (
          <Link
            href={conference.registrationLink}
            target="_blank"
            className="inline-flex rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400"
          >
            Register / Learn more
          </Link>
        )}
      </section>
    </div>
  );
}

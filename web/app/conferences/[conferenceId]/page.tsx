"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import ShareButtons from "@/components/ShareButtons";
import { useAuth } from "@/components/AuthProvider";
import { getConference } from "@/lib/firestore";
import type { Conference } from "@/lib/types";

export default function ConferenceDetailPage() {
  const params = useParams();
  const conferenceId = params.conferenceId as string;
  const { user, role } = useAuth();

  const [conference, setConference] = useState<Conference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConference = async () => {
      try {
        const data = await getConference(conferenceId);
        if (data) {
          setConference(data);
        } else {
          setError("Conference not found");
        }
      } catch (err) {
        console.error("Failed to load conference", err);
        setError("Failed to load conference details");
      } finally {
        setLoading(false);
      }
    };
    loadConference();
  }, [conferenceId]);

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <p className="text-slate-400">Loading conference details...</p>
        </div>
      </PageShell>
    );
  }

  if (error || !conference) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-200">
            {error || "Conference not found"}
          </h1>
          <Link
            href="/conferences"
            className="mt-6 inline-block rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
          >
            Back to Conferences
          </Link>
        </div>
      </PageShell>
    );
  }

  const formatDate = (value: Conference["startDate"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const formatDateLong = (value: Conference["startDate"]) => {
    if (!value) return null;
    try {
      const date = typeof value === "object" && "toDate" in value
        ? value.toDate()
        : new Date(value);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const startDate = formatDate(conference.startDate);
  const endDate = formatDate(conference.endDate);
  const startDateLong = formatDateLong(conference.startDate);
  const endDateLong = formatDateLong(conference.endDate);

  const isEmployerOwner =
    role === "employer" && user && conference.employerId === user.uid;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl py-8">
        <Link
          href="/conferences"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#14B8A6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Conferences
        </Link>

        {/* Conference Header */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#14B8A6]">
              Conference
            </span>
            {conference.format && (
              <span className="inline-flex items-center rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300">
                {conference.format}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-50">{conference.title}</h1>

          <div className="mt-3 flex flex-col gap-2 text-base">
            {conference.employerName && (
              <div className="flex items-center gap-2 text-slate-300">
                <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Organized by <span className="font-semibold">{conference.employerName}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-300">
              <svg className="h-5 w-5 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold">{conference.location}</span>
            </div>
          </div>

          {/* Dates and Cost */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-base font-medium text-blue-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {startDate && endDate && startDate !== endDate
                  ? `${startDate} - ${endDate}`
                  : startDate || endDate}
              </span>
            )}
            {conference.cost && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-base font-medium text-emerald-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {conference.cost}
              </span>
            )}
          </div>

          {/* Primary Actions */}
          {conference.registrationLink && (
            <div className="mt-6">
              <a
                href={conference.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
              >
                Register for Conference
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <ShareButtons
              item={{
                id: conference.id,
                title: `${conference.title} - Conference`,
                description: `${conference.location} | ${startDate || 'Date TBA'}`,
                type: 'conference'
              }}
            />
          </div>
        </div>

        {/* Owner Message */}
        {isEmployerOwner && (
          <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-200">
                  You published this conference
                </p>
                <p className="mt-1 text-sm text-amber-300/80">
                  Edit details, manage registrations, or promote live streams from your employer dashboard.
                </p>
                <Link
                  href={`/employer/conferences/${conference.id}/edit`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
                >
                  Edit Conference
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">Event Details</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {/* Date & Time */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date & Time
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-slate-200">
                  {startDateLong || "Date TBA"}
                </p>
                {endDateLong && startDateLong !== endDateLong && (
                  <p className="text-xs text-slate-400">
                    Ends: {endDateLong}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Location
              </div>
              <p className="mt-3 text-sm font-medium text-slate-200">
                {conference.location}
              </p>
            </div>

            {/* Cost */}
            {conference.cost && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cost
                </div>
                <p className="mt-3 text-sm font-medium text-slate-200">
                  {conference.cost}
                </p>
              </div>
            )}

            {/* Format */}
            {conference.format && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Format
                </div>
                <p className="mt-3 text-sm font-medium text-slate-200">
                  {conference.format}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* About Section */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8">
          <h2 className="text-xl font-bold text-slate-200">About This Conference</h2>
          <div className="mt-4 space-y-4 text-slate-300">
            {conference.description.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {conference.registrationLink && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <a
                href={conference.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
              >
                Register / Learn More
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Sign-in CTA for non-logged users */}
        {!user && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#08090C] p-8 text-center">
            <h3 className="text-lg font-bold text-slate-200">
              Join IOPPS to stay updated
            </h3>
            <p className="mt-2 text-slate-400">
              Create an account to save conferences, get event reminders, and connect with the Indigenous professional community.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

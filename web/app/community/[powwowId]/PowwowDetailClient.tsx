/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import Image from "next/image";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import ShareButtons from "@/components/ShareButtons";
import type { PowwowEvent } from "@/lib/types";

interface PowwowDetailClientProps {
  powwow: PowwowEvent | null;
  error?: string;
}

export default function PowwowDetailClient({ powwow, error }: PowwowDetailClientProps) {
  if (error || !powwow) {
    const isEnded = error?.toLowerCase().includes("ended");
    return (
      <FeedLayout activeNav="events" fullWidth>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-surface p-6 mb-6">
            <svg
              className="h-12 w-12 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isEnded ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isEnded ? "Event Has Ended" : "Event Not Found"}
          </h1>
          <p className="mt-3 text-foreground0 max-w-md mx-auto">
            {isEnded
              ? "This pow wow or cultural event has concluded. Check out other upcoming events below."
              : "Sorry, we couldn't find the event you're looking for. It may have been removed."}
          </p>
          <Link
            href="/community"
            className="mt-6 inline-block rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
          >
            Browse Upcoming Events
          </Link>
        </div>
      </FeedLayout>
    );
  }

  const formatDate = (value: PowwowEvent["startDate"]) => {
    if (!value) return null;
    try {
      let date: Date;
      if (typeof value === "object" && "_seconds" in value) {
        date = new Date((value as any)._seconds * 1000);
      } else if (typeof value === "object" && "toDate" in value) {
        date = value.toDate();
      } else if (typeof value === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [year, month, day] = value.split('-').map(Number);
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(value);
        }
      } else {
        date = new Date(value as string);
      }
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return typeof value === "string" ? value : null;
    }
  };

  const startDate = formatDate(powwow.startDate);
  const endDate = formatDate(powwow.endDate);

  return (
    <FeedLayout activeNav="events" fullWidth>
      <div className="mx-auto max-w-4xl py-8">
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm text-foreground0 transition-colors hover:text-[#0D9488]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Pow Wows & Events
        </Link>

        {/* Pow Wow Header */}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#0D9488]/20 bg-[#0D9488]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0D9488]">
              Event
            </span>
            {powwow.season && (
              <span className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {powwow.season}
              </span>
            )}
            {powwow.livestream && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300/30 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Livestream Available
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold text-[var(--text-primary)]">{powwow.name}</h1>

          <div className="mt-3 flex flex-col gap-2 text-base">
            {powwow.host && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Hosted by <span className="font-semibold">{powwow.host}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <svg className="h-5 w-5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold">{powwow.location}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(powwow.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-sm text-[#0D9488] hover:underline"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Get Directions
              </a>
            </div>
          </div>

          {/* Dates */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {powwow.dateRange ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-300/30 bg-blue-50 px-4 py-2 text-base font-medium text-blue-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {powwow.dateRange}
              </span>
            ) : (startDate || endDate) && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-blue-300/30 bg-blue-50 px-4 py-2 text-base font-medium text-blue-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {startDate && endDate && startDate !== endDate
                  ? `${startDate} - ${endDate}`
                  : startDate || endDate}
              </span>
            )}
            {powwow.registrationStatus && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-[var(--accent-bg)] px-4 py-2 text-base font-medium text-accent">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {powwow.registrationStatus}
              </span>
            )}
          </div>

          {/* Share Buttons */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <ShareButtons
              item={{
                id: powwow.id,
                title: powwow.name,
                description: powwow.description.substring(0, 150) + '...',
              }}
            />
          </div>
        </div>

        {/* Event Poster */}
        {powwow.imageUrl && (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Event Poster</h2>
              <a
                href={powwow.imageUrl}
                download={`${powwow.name.replace(/[^a-zA-Z0-9]/g, '_')}_poster`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0F766E]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Poster
              </a>
            </div>
            <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="relative aspect-[3/4] w-full max-w-2xl mx-auto">
                <Image
                  src={powwow.imageUrl}
                  alt={`${powwow.name} event poster`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-foreground0">
              Click the download button to save the full poster image
            </p>
          </div>
        )}

        {/* Description */}
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">About This Event</h2>
          <div className="mt-4 space-y-4 text-[var(--text-secondary)]">
            {powwow.description.split("\n").map((paragraph, i) => (
              <p key={i} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </FeedLayout>
  );
}

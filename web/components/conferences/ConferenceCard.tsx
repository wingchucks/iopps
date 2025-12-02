"use client";

import { useState } from "react";
import Link from "next/link";
import type { Conference } from "@/lib/types";

interface ConferenceCardProps {
  conference: Conference;
  onSave?: (conferenceId: string) => void;
  isSaved?: boolean;
}

type MaybeDate = string | Date | { toDate: () => Date } | null | undefined;

const formatDate = (value: MaybeDate): string => {
  if (!value) return "";
  try {
    let date: Date;
    if (typeof value === "string") {
      date = new Date(value);
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "object" && "toDate" in value) {
      date = value.toDate();
    } else {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const getDateValue = (value: MaybeDate): Date | null => {
  if (!value) return null;
  try {
    if (typeof value === "string") return new Date(value);
    if (value instanceof Date) return value;
    if (typeof value === "object" && "toDate" in value) return value.toDate();
    return null;
  } catch {
    return null;
  }
};

const getDaysUntil = (value: MaybeDate): number | null => {
  const date = getDateValue(value);
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function ConferenceCard({
  conference,
  onSave,
  isSaved = false,
}: ConferenceCardProps) {
  const [saved, setSaved] = useState(isSaved);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(!saved);
    onSave?.(conference.id);
  };

  const daysUntil = getDaysUntil(conference.startDate);
  const isUpcoming = daysUntil !== null && daysUntil > 0 && daysUntil <= 7;
  const isHappening = daysUntil !== null && daysUntil <= 0 && daysUntil >= -7;

  const eventTypeLabels: Record<string, { label: string; color: string }> = {
    "in-person": { label: "In-Person", color: "text-green-400 bg-green-500/10 border-green-500/30" },
    virtual: { label: "Virtual", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    hybrid: { label: "Hybrid", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  };

  const eventType = eventTypeLabels[conference.eventType || "in-person"] || eventTypeLabels["in-person"];

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 ${
        conference.featured
          ? "border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-amber-600/5 hover:border-amber-500/70"
          : "border-slate-800/80 bg-[#08090C] hover:border-[#14B8A6]/70"
      }`}
    >
      {/* Banner Image */}
      {conference.bannerImageUrl && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={conference.bannerImageUrl}
            alt={conference.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-transparent to-transparent" />

          {/* Floating badges on image */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {conference.featured && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Featured
              </span>
            )}
            {isHappening && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white" />
                Happening Now
              </span>
            )}
            {isUpcoming && !isHappening && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                In {daysUntil} day{daysUntil !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Save button on image */}
          <button
            onClick={handleSave}
            className="absolute right-4 top-4 rounded-full bg-slate-900/80 p-2 text-slate-300 backdrop-blur-sm transition-colors hover:bg-slate-800 hover:text-[#14B8A6]"
            aria-label={saved ? "Remove from saved" : "Save conference"}
          >
            <svg
              className="h-5 w-5"
              fill={saved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Top badges row - shown when no banner */}
        {!conference.bannerImageUrl && (
          <div className="mb-3 flex flex-wrap gap-2">
            {conference.featured && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Featured
              </span>
            )}
            {isHappening && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Happening Now
              </span>
            )}
            {isUpcoming && !isHappening && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/20 px-3 py-1 text-xs font-semibold text-[#14B8A6]">
                In {daysUntil} day{daysUntil !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            {/* Organizer */}
            <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
              {conference.employerName || conference.organizerName || "Organizer"}
            </p>

            {/* Title */}
            <Link
              href={`/conferences/${conference.id}`}
              className="mt-1 block text-xl font-semibold text-slate-50 hover:text-[#14B8A6] transition-colors"
            >
              {conference.title}
            </Link>

            {/* Meta info row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              {/* Location */}
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {conference.venue?.city || conference.location}
              </span>

              {/* Date */}
              {conference.startDate && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(conference.startDate)}
                  {conference.endDate && ` - ${formatDate(conference.endDate)}`}
                </span>
              )}
            </div>

            {/* Tags row */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Event type */}
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${eventType.color}`}>
                {conference.eventType === "virtual" && (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {conference.eventType === "hybrid" && (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                )}
                {conference.eventType === "in-person" && (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {eventType.label}
              </span>

              {/* TRC #92 badge */}
              {conference.trc92Commitment && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  TRC #92
                </span>
              )}

              {/* Indigenous focused */}
              {conference.indigenousFocused && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2.5 py-0.5 text-xs font-medium text-[#14B8A6]">
                  Indigenous Focused
                </span>
              )}

              {/* Speaker count */}
              {conference.speakers && conference.speakers.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {conference.speakers.length} Speaker{conference.speakers.length !== 1 ? "s" : ""}
                </span>
              )}

              {/* Expected attendees */}
              {conference.expectedAttendees && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {conference.expectedAttendees}+ expected
                </span>
              )}
            </div>
          </div>

          {/* Right side - Price & Save */}
          <div className="flex flex-col items-end gap-2">
            {!conference.bannerImageUrl && (
              <button
                onClick={handleSave}
                className="rounded-full border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
                aria-label={saved ? "Remove from saved" : "Save conference"}
              >
                <svg
                  className="h-5 w-5"
                  fill={saved ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            )}

            {/* Price badge */}
            <div className="text-right">
              {conference.cost ? (
                <span className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                  {conference.cost}
                </span>
              ) : conference.registrationOptions?.regularPrice ? (
                <span className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                  From {conference.registrationOptions.indigenousRate || conference.registrationOptions.regularPrice}
                </span>
              ) : (
                <span className="rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-medium text-[#14B8A6]">
                  Free / Community
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {conference.description.slice(0, 200)}
          {conference.description.length > 200 ? "..." : ""}
        </p>

        {/* Topics */}
        {conference.topics && conference.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {conference.topics.slice(0, 4).map((topic, index) => (
              <span
                key={index}
                className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-400"
              >
                {topic}
              </span>
            ))}
            {conference.topics.length > 4 && (
              <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-xs text-slate-500">
                +{conference.topics.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/conferences/${conference.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#14B8A6]/90"
          >
            View Details
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {conference.registrationLink && (
            <a
              href={conference.registrationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
            >
              Register Now
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

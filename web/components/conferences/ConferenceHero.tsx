"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Conference } from "@/lib/types";
import ShareButtons from "@/components/ShareButtons";
import CalendarExport from "./CalendarExport";

interface ConferenceHeroProps {
  conference: Conference;
  onSave?: () => void;
  isSaved?: boolean;
}

export default function ConferenceHero({
  conference,
  onSave,
  isSaved = false,
}: ConferenceHeroProps) {
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Try multiple possible image field names
  const heroImageUrl = conference.bannerImageUrl || conference.coverImageUrl || conference.imageUrl;

  const formatDate = (value: Conference["startDate"]) => {
    if (!value) return null;
    try {
      const date =
        typeof value === "object" && "toDate" in value
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

  const startDate = formatDate(conference.startDate);
  const endDate = formatDate(conference.endDate);
  const dateDisplay =
    startDate && endDate && startDate !== endDate
      ? `${startDate} - ${endDate}`
      : startDate || endDate || "Date TBA";

  const handleSave = () => {
    setSaveAnimating(true);
    onSave?.();
    setTimeout(() => setSaveAnimating(false), 300);
  };

  return (
    <div className="relative">
      {/* Banner Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50">
        {heroImageUrl && !imageError ? (
          <Image
            src={heroImageUrl}
            alt={conference.title}
            fill
            className="object-cover"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          /* Branded fallback with gradient and icon */
          <div className="absolute inset-0 bg-gradient-to-br from-[#0D9488]/30 via-blue-900/50 to-slate-50 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <svg
                  className="h-10 w-10 text-slate-900/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-900/60">Conference</p>
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />

        {/* Top Badges */}
        <div className="absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {conference.featured && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-lg">
                <svg
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Featured
              </span>
            )}
            {conference.trc92Commitment && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D9488]/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                TRC #92
              </span>
            )}
            {conference.indigenousFocused && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                Indigenous-Focused
              </span>
            )}
            {conference.eventType && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-900 backdrop-blur-sm">
                {conference.eventType === "hybrid" && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                )}
                {conference.eventType === "virtual" && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {conference.eventType === "in-person" && (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                )}
                {conference.eventType.charAt(0).toUpperCase() +
                  conference.eventType.slice(1)}
              </span>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all ${
              isSaved
                ? "border-[#0D9488] bg-[#0D9488]/20 text-[#0D9488]"
                : "border-white/20 bg-slate-50/80 text-slate-900 hover:border-[#0D9488] hover:text-[#0D9488]"
            } ${saveAnimating ? "scale-110" : ""}`}
          >
            <svg
              className={`h-4 w-4 transition-transform ${saveAnimating ? "scale-125" : ""}`}
              fill={isSaved ? "currentColor" : "none"}
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
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Content Overlay */}
      <div className="relative -mt-24 px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          {/* Organizer */}
          {(conference.employerName || conference.organizerName) && (
            <p className="text-sm font-medium uppercase tracking-wider text-[#0D9488]">
              {conference.organizerName || conference.employerName}
            </p>
          )}

          {/* Title */}
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
            {conference.title}
          </h1>

          {/* Meta Info */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-[#0D9488]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium">{dateDisplay}</span>
            </div>

            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-[#0D9488]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{conference.venue?.name || conference.location}</span>
            </div>

            {conference.speakers && conference.speakers.length > 0 && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[#0D9488]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{conference.speakers.length} Speakers</span>
              </div>
            )}

            {conference.expectedAttendees && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-[#0D9488]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span>{conference.expectedAttendees} Expected</span>
              </div>
            )}
          </div>

          {/* Topics/Tags */}
          {conference.topics && conference.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {conference.topics.map((topic, index) => (
                <span
                  key={index}
                  className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {(conference.registrationLink || conference.registrationUrl) && (
              <a
                href={conference.registrationLink || conference.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
              >
                Register Now
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}

            <CalendarExport conference={conference} />
          </div>

          {/* Share & Cost Row */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
            <ShareButtons
              item={{
                id: conference.id,
                title: `${conference.title} - Conference`,
                description: `${conference.location} | ${dateDisplay}`,
                type: "conference",
              }}
            />

            {conference.cost && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground0">Registration:</span>
                <span className="rounded-lg border border-[#0D9488]/30 bg-[#0D9488]/10 px-3 py-1.5 text-sm font-semibold text-[#0D9488]">
                  {conference.cost}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import type { Conference } from "@/lib/types";
import CalendarExport from "./CalendarExport";

interface ConferenceSidebarProps {
  conference: Conference;
}

export default function ConferenceSidebar({
  conference,
}: ConferenceSidebarProps) {
  const formatDate = (value: Conference["startDate"]) => {
    if (!value) return null;
    try {
      const date =
        typeof value === "object" && "toDate" in value
          ? value.toDate()
          : new Date(value);
      return {
        full: date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        short: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
    } catch {
      return null;
    }
  };

  const startDate = formatDate(conference.startDate);
  const endDate = formatDate(conference.endDate);

  // Calculate countdown
  const countdown = useMemo(() => {
    if (!conference.startDate) return null;

    try {
      const start =
        typeof conference.startDate === "object" && "toDate" in conference.startDate
          ? conference.startDate.toDate()
          : new Date(conference.startDate);

      const now = new Date();
      const diff = start.getTime() - now.getTime();

      if (diff <= 0) return null;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""} away`;
      }
      if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} away`;
      }
      return "Starting soon";
    } catch {
      return null;
    }
  }, [conference.startDate]);

  // Calculate early bird deadline
  const earlyBirdCountdown = useMemo(() => {
    if (!conference.registrationOptions?.earlyBirdDeadline) return null;

    try {
      const deadline =
        typeof conference.registrationOptions.earlyBirdDeadline === "object" &&
        "toDate" in conference.registrationOptions.earlyBirdDeadline
          ? conference.registrationOptions.earlyBirdDeadline.toDate()
          : new Date(conference.registrationOptions.earlyBirdDeadline);

      const now = new Date();
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) return null;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} day${days > 1 ? "s" : ""} left` : "Ends today";
    } catch {
      return null;
    }
  }, [conference.registrationOptions?.earlyBirdDeadline]);

  return (
    <div className="space-y-4">
      {/* Quick Facts Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground0">
          Quick Facts
        </h3>

        <div className="mt-4 space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <svg
                className="h-5 w-5 text-blue-400"
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
            </div>
            <div className="flex-1">
              <p className="text-xs text-foreground0">Date & Time</p>
              {startDate && (
                <p className="font-medium text-slate-700">{startDate.full}</p>
              )}
              {endDate && startDate?.full !== endDate.full && (
                <p className="text-sm text-foreground0">to {endDate.full}</p>
              )}
              {countdown && (
                <p className="mt-1 text-xs font-medium text-[#0D9488]">
                  {countdown}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <svg
                className="h-5 w-5 text-green-400"
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
            </div>
            <div className="flex-1">
              <p className="text-xs text-foreground0">Location</p>
              <p className="font-medium text-slate-700">
                {conference.venue?.name || conference.location}
              </p>
              {conference.venue?.city && conference.venue?.province && (
                <p className="text-sm text-foreground0">
                  {conference.venue.city}, {conference.venue.province}
                </p>
              )}
            </div>
          </div>

          {/* Event Type */}
          {conference.eventType && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <svg
                  className="h-5 w-5 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {conference.eventType === "virtual" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  ) : conference.eventType === "hybrid" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  )}
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-foreground0">Format</p>
                <p className="font-medium text-slate-700 capitalize">
                  {conference.eventType}
                </p>
                {conference.virtualPlatform && (
                  <p className="text-sm text-foreground0">
                    via {conference.virtualPlatform}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expected Attendees */}
          {conference.expectedAttendees && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <svg
                  className="h-5 w-5 text-orange-400"
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
              </div>
              <div className="flex-1">
                <p className="text-xs text-foreground0">Expected Attendees</p>
                <p className="font-medium text-slate-700">
                  {conference.expectedAttendees}
                </p>
              </div>
            </div>
          )}

          {/* Timezone */}
          {conference.timezone && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
                <svg
                  className="h-5 w-5 text-[var(--text-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-foreground0">Timezone</p>
                <p className="font-medium text-slate-700">
                  {conference.timezone}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <CalendarExport conference={conference} className="w-full" />
        </div>
      </div>

      {/* Registration Pricing Card */}
      {(conference.cost || conference.registrationOptions) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground0">
            Registration
          </h3>

          <div className="mt-4 space-y-3">
            {/* Early Bird */}
            {conference.registrationOptions?.earlyBirdPrice && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-400">
                    Early Bird
                  </span>
                  <span className="font-bold text-amber-400">
                    {conference.registrationOptions.earlyBirdPrice}
                  </span>
                </div>
                {earlyBirdCountdown && (
                  <p className="mt-1 text-xs text-amber-400/70">
                    {earlyBirdCountdown} to save
                  </p>
                )}
              </div>
            )}

            {/* Regular Price */}
            {(conference.registrationOptions?.regularPrice || conference.cost) && (
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground0">Regular</span>
                  <span className="font-bold text-slate-700">
                    {conference.registrationOptions?.regularPrice || conference.cost}
                  </span>
                </div>
              </div>
            )}

            {/* Indigenous Rate */}
            {conference.registrationOptions?.indigenousRate && (
              <div className="rounded-lg border border-[#0D9488]/30 bg-[#0D9488]/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0D9488]">Indigenous</span>
                  <span className="font-bold text-[#0D9488]">
                    {conference.registrationOptions.indigenousRate}
                  </span>
                </div>
              </div>
            )}

            {/* Student Rate */}
            {conference.registrationOptions?.studentRate && (
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground0">Student</span>
                  <span className="font-bold text-slate-700">
                    {conference.registrationOptions.studentRate}
                  </span>
                </div>
              </div>
            )}

            {/* Group Rate */}
            {conference.registrationOptions?.groupRate && (
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground0">
                    Group ({conference.registrationOptions.groupMinimum || 5}+)
                  </span>
                  <span className="font-bold text-slate-700">
                    {conference.registrationOptions.groupRate}
                  </span>
                </div>
              </div>
            )}

            {/* Virtual Rate */}
            {conference.registrationOptions?.virtualPrice && (
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground0">Virtual</span>
                  <span className="font-bold text-slate-700">
                    {conference.registrationOptions.virtualPrice}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Register Button */}
          {(conference.registrationLink || conference.registrationUrl) && (
            <a
              href={conference.registrationLink || conference.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#0F766E]"
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
        </div>
      )}

      {/* Contact Card */}
      {(conference.contactEmail || conference.contactPhone) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground0">
            Contact
          </h3>

          <div className="mt-4 space-y-3">
            {conference.contactEmail && (
              <a
                href={`mailto:${conference.contactEmail}`}
                className="flex items-center gap-3 text-sm text-slate-600 hover:text-[#0D9488]"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {conference.contactEmail}
              </a>
            )}
            {conference.contactPhone && (
              <a
                href={`tel:${conference.contactPhone}`}
                className="flex items-center gap-3 text-sm text-slate-600 hover:text-[#0D9488]"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {conference.contactPhone}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

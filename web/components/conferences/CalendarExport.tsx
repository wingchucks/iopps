"use client";

import { useState } from "react";
import type { Conference } from "@/lib/types";

interface CalendarExportProps {
  conference: Conference;
  className?: string;
}

export default function CalendarExport({
  conference,
  className = "",
}: CalendarExportProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateForCalendar = (value: Conference["startDate"]): Date | null => {
    if (!value) return null;
    try {
      if (typeof value === "object" && "toDate" in value) {
        return value.toDate();
      }
      return new Date(value);
    } catch {
      return null;
    }
  };

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const startDate = formatDateForCalendar(conference.startDate);
  const endDate = formatDateForCalendar(conference.endDate) || startDate;

  if (!startDate) return null;

  const eventTitle = conference.title;
  const eventLocation = conference.venue
    ? `${conference.venue.name}${conference.venue.address ? `, ${conference.venue.address}` : ""}${conference.venue.city ? `, ${conference.venue.city}` : ""}`
    : conference.location;
  const eventDescription = `${conference.description.substring(0, 200)}...\n\nOrganized by: ${conference.employerName || conference.organizerName || "IOPPS"}\n\nMore info: ${typeof window !== "undefined" ? window.location.href : ""}`;

  const generateGoogleCalendarUrl = () => {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventTitle,
      dates: `${formatICSDate(startDate)}/${formatICSDate(endDate || startDate)}`,
      details: eventDescription,
      location: eventLocation,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateICSFile = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IOPPS//Conference Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate || startDate)}
SUMMARY:${eventTitle}
DESCRIPTION:${eventDescription.replace(/\n/g, "\\n")}
LOCATION:${eventLocation}
UID:${conference.id}@iopps.app
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventTitle.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const generateOutlookUrl = () => {
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: eventTitle,
      startdt: startDate.toISOString(),
      enddt: (endDate || startDate).toISOString(),
      body: eventDescription,
      location: eventLocation,
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 font-medium text-slate-200 transition-colors hover:border-[#14B8A6] hover:text-[#14B8A6]"
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Add to Calendar
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-700 bg-[#08090C] p-2 shadow-xl">
            <a
              href={generateGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-slate-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 22h-15A2.5 2.5 0 012 19.5v-15A2.5 2.5 0 014.5 2h15A2.5 2.5 0 0122 4.5v15a2.5 2.5 0 01-2.5 2.5zM9.5 7.5v9h1.5v-3.5h2a2.5 2.5 0 000-5h-3.5zm1.5 4V9h2a1 1 0 110 2h-2z" />
              </svg>
              Google Calendar
            </a>

            <a
              href={generateOutlookUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-slate-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.5 2h-19A2.5 2.5 0 000 4.5v15A2.5 2.5 0 002.5 22h19a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0021.5 2zM12 12.5L2 7V4.5l10 5.5 10-5.5V7l-10 5.5z" />
              </svg>
              Outlook.com
            </a>

            <button
              onClick={generateICSFile}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download .ics (Apple/Outlook)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

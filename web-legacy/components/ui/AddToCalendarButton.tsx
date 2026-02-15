"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadICalFile,
  parseEventDate,
  type CalendarEvent,
} from "@/lib/utils/calendar";

interface AddToCalendarButtonProps {
  title: string;
  description?: string;
  location?: string;
  startDate: unknown; // Can be Date, string, or Firestore Timestamp
  endDate?: unknown;
  allDay?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * A dropdown button that allows users to add an event to their calendar.
 * Supports Google Calendar, Outlook, and iCal (.ics) download.
 */
export function AddToCalendarButton({
  title,
  description,
  location,
  startDate,
  endDate,
  allDay,
  className = "",
  size = "md",
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse dates
  const parsedStartDate = parseEventDate(startDate);
  const parsedEndDate = parseEventDate(endDate);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render if no valid start date
  if (!parsedStartDate) {
    return null;
  }

  const event: CalendarEvent = {
    title,
    description,
    location,
    startDate: parsedStartDate,
    endDate: parsedEndDate || undefined,
    allDay,
  };

  const googleUrl = generateGoogleCalendarUrl(event);
  const outlookUrl = generateOutlookCalendarUrl(event);

  const handleICalDownload = () => {
    downloadICalFile(event);
    setIsOpen(false);
  };

  const sizeClasses = size === "sm"
    ? "px-2.5 py-1.5 text-xs gap-1"
    : "px-3 py-2 text-sm gap-1.5";

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center rounded-lg bg-surface border border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors ${sizeClasses}`}
      >
        <CalendarDaysIcon className={iconSize} />
        <span>Add to Calendar</span>
        <ChevronDownIcon className={`${iconSize} transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-48 rounded-lg bg-surface border border-[var(--card-border)] shadow-xl z-50 overflow-hidden">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors"
          >
            <GoogleCalendarIcon className="h-4 w-4" />
            Google Calendar
          </a>
          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors"
          >
            <OutlookIcon className="h-4 w-4" />
            Outlook
          </a>
          <button
            onClick={handleICalDownload}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white transition-colors w-full text-left"
          >
            <AppleCalendarIcon className="h-4 w-4" />
            Apple Calendar (.ics)
          </button>
        </div>
      )}
    </div>
  );
}

// Calendar provider icons
function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15v11.25zM9 10.5H6.75v2.25H9V10.5zm4.125 0h-2.25v2.25h2.25V10.5zM17.25 10.5H15v2.25h2.25V10.5zM9 14.625H6.75v2.25H9v-2.25zm4.125 0h-2.25v2.25h2.25v-2.25zm4.125 0H15v2.25h2.25v-2.25z" />
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.75 5.25h-7.5v13.5h7.5c.413 0 .75-.337.75-.75V6c0-.413-.337-.75-.75-.75zM8.25 12c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3zm3-1.5c-.825 0-1.5.675-1.5 1.5s.675 1.5 1.5 1.5 1.5-.675 1.5-1.5-.675-1.5-1.5-1.5zM2.25 6v12c0 .413.337.75.75.75h9.75V5.25H3c-.413 0-.75.337-.75.75z" />
    </svg>
  );
}

function AppleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
    </svg>
  );
}

export default AddToCalendarButton;

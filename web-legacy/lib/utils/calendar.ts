/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Calendar integration utilities for generating "Add to Calendar" links
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
}

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHmmssZ format)
 */
function formatGoogleDate(date: Date, allDay?: boolean): string {
  if (allDay) {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Format date for iCal/Outlook (YYYYMMDDTHHmmss format)
 */
function formatICalDate(date: Date, allDay?: boolean): string {
  if (allDay) {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }
  return date.toISOString().replace(/[-:]/g, "").slice(0, 15);
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams();

  params.set("action", "TEMPLATE");
  params.set("text", event.title);

  if (event.description) {
    params.set("details", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  const startDate = formatGoogleDate(event.startDate, event.allDay);
  const endDate = event.endDate
    ? formatGoogleDate(event.endDate, event.allDay)
    : formatGoogleDate(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000), event.allDay); // Default 2 hours

  params.set("dates", `${startDate}/${endDate}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook.com Calendar URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams();

  params.set("path", "/calendar/action/compose");
  params.set("rru", "addevent");
  params.set("subject", event.title);

  if (event.description) {
    params.set("body", event.description);
  }

  if (event.location) {
    params.set("location", event.location);
  }

  params.set("startdt", event.startDate.toISOString());

  const endDate = event.endDate || new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
  params.set("enddt", endDate.toISOString());

  if (event.allDay) {
    params.set("allday", "true");
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate iCal (.ics) file content
 */
export function generateICalContent(event: CalendarEvent): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@iopps.ca`;
  const now = new Date();
  const dtstamp = formatICalDate(now);

  const startDate = formatICalDate(event.startDate, event.allDay);
  const endDate = event.endDate
    ? formatICalDate(event.endDate, event.allDay)
    : formatICalDate(new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000), event.allDay);

  const datePrefix = event.allDay ? "VALUE=DATE:" : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IOPPS//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART${datePrefix ? ";" + datePrefix : ":"}${startDate}`,
    `DTEND${datePrefix ? ";" + datePrefix : ":"}${endDate}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Escape special characters for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Download iCal file
 */
export function downloadICalFile(event: CalendarEvent): void {
  const content = generateICalContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Parse a date that could be a string, Date, or Firestore Timestamp
 */
export function parseEventDate(date: unknown): Date | null {
  if (!date) return null;

  if (date instanceof Date) return date;

  if (typeof date === "string") {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // Firestore Timestamp
  if (typeof date === "object" && date !== null) {
    if ("toDate" in date && typeof (date as any).toDate === "function") {
      return (date as any).toDate();
    }
    if ("_seconds" in date) {
      return new Date((date as any)._seconds * 1000);
    }
    if ("seconds" in date) {
      return new Date((date as any).seconds * 1000);
    }
  }

  return null;
}

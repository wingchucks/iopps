import { getEventStartDate, getEventEndDate } from "@/lib/public-events";
import { displayLocation } from "@/lib/utils";

function escapeText(value: string) { return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,"); }
function day(date: Date) { return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`; }
function fold(line: string) {
  const encoder = new TextEncoder(); let result = "", size = 0;
  for (const char of line) { const bytes = encoder.encode(char).length; if (size + bytes > 75) { result += "\r\n "; size = 1; } result += char; size += bytes; }
  return result;
}
/** RFC 5545: DATE DTEND is exclusive. Unknown times are never invented.
 * https://www.rfc-editor.org/rfc/rfc5545#section-3.6.1 */
export function createEventCalendar(event: Record<string, unknown>, now = new Date()): string | null {
  const start = getEventStartDate(event), end = getEventEndDate(event);
  if (!start || !end || end < start) return null;
  const exclusiveEnd = new Date(end); exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  const location = event.delivery === "online" ? "Online" : displayLocation(event.location) || [event.venue, event.city, event.province].filter(Boolean).join(", ");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IOPPS//Community Events//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${escapeText(String(event.id || event.slug || "event"))}@iopps.ca`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(exclusiveEnd)}`,
    `SUMMARY:${escapeText(String(event.title || "IOPPS event"))}`,
    `DESCRIPTION:${escapeText([String(event.description || "").replace(/<[^>]*>/g, " "), "Event dates saved as all-day entries. Confirm times with the organizer.", [event.startTime, event.endTime, event.timeZone].filter(Boolean).join(" · ")].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${escapeText(location)}`, "END:VEVENT", "END:VCALENDAR"];
  return lines.map(fold).join("\r\n") + "\r\n";
}

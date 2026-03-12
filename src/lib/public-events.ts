type EventLike = {
  dates?: string | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  active?: boolean | null;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  "career fair": "Career Fair",
  conference: "Conference",
  cultural: "Round Dance",
  powwow: "Pow Wow",
  "pow wow": "Pow Wow",
  "round dance": "Round Dance",
  sports: "Sports",
};

const HIDDEN_STATUSES = new Set([
  "archived",
  "cancelled",
  "canceled",
  "closed",
  "completed",
  "deleted",
  "draft",
  "expired",
  "inactive",
]);

function parseDateString(value: string, endOfDay = false): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly;
    return endOfDay
      ? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
      : new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDatesLabel(label?: string | null): { start: Date | null; end: Date | null } {
  if (!label) return { start: null, end: null };

  const rangeMatch = label.trim().match(/^([A-Za-z]+)\s+(\d{1,2})(?:-(\d{1,2}))?,\s*(\d{4})$/);
  if (!rangeMatch) {
    const fallback = parseDateString(label);
    return { start: fallback, end: fallback };
  }

  const [, month, startDay, endDay, year] = rangeMatch;
  const start = parseDateString(`${month} ${startDay}, ${year}`);
  const end = parseDateString(`${month} ${endDay || startDay}, ${year}`, true);
  return { start, end };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const startMonth = start.toLocaleString("en-CA", { month: "short" });
  const endMonth = end.toLocaleString("en-CA", { month: "short" });

  if (sameMonth) {
    return `${startMonth} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${formatDate(start)} - ${formatDate(end)}`;
}

function buildTimeSuffix(event: EventLike): string {
  const startTime = typeof event.startTime === "string" ? event.startTime.trim() : "";
  const endTime = typeof event.endTime === "string" ? event.endTime.trim() : "";
  if (startTime && endTime) return ` • ${startTime} - ${endTime}`;
  if (startTime) return ` • ${startTime}`;
  return "";
}

export function getEventStartDate(event: EventLike): Date | null {
  return (
    parseDateString(event.startDate || "") ||
    parseDateString(event.date || "") ||
    parseDatesLabel(event.dates).start
  );
}

export function getEventEndDate(event: EventLike): Date | null {
  return (
    parseDateString(event.endDate || "", true) ||
    parseDateString(event.startDate || "", true) ||
    parseDateString(event.date || "", true) ||
    parseDatesLabel(event.dates).end
  );
}

export function getEventDisplayDates(event: EventLike): string {
  const explicit = typeof event.dates === "string" ? event.dates.trim() : "";
  if (explicit) return explicit;

  const start = getEventStartDate(event);
  const end = getEventEndDate(event);
  const timeSuffix = buildTimeSuffix(event);

  if (start && end) {
    if (start.toDateString() === end.toDateString()) {
      return `${formatDate(start)}${timeSuffix}`;
    }
    return `${formatDateRange(start, end)}${timeSuffix}`;
  }

  if (start) {
    return `${formatDate(start)}${timeSuffix}`;
  }

  return "";
}

export function isEventCompleted(event: EventLike, now = new Date()): boolean {
  const status = typeof event.status === "string" ? event.status.trim().toLowerCase() : "";
  if (HIDDEN_STATUSES.has(status)) return true;
  if (event.active === false) return true;

  const end = getEventEndDate(event);
  return Boolean(end && end.getTime() < now.getTime());
}

export function isPublicEventVisible(event: EventLike, now = new Date()): boolean {
  return !isEventCompleted(event, now);
}

export function normalizePublicEvent<T extends object>(event: T & EventLike): T & EventLike {
  const dates = getEventDisplayDates(event);
  if (!dates) return event;
  if (typeof event.dates === "string" && event.dates.trim()) return event;
  return { ...event, dates };
}

export function normalizeEventTypeLabel(value?: string | null): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return "";
  return EVENT_TYPE_LABELS[normalized] || value!.trim();
}

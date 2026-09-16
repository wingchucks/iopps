import { provinceCode } from "@/lib/canadian-provinces";

export type OpportunityKind = "events" | "scholarships";
export type OpportunityStatus = "draft" | "active" | "closed";
export type OpportunityRecord = Record<string, unknown> & { id: string; title: string; slug?: string; status?: string; revision?: number };
export const EVENT_CATEGORIES = ["Pow Wow", "Conference", "Career Fair", "Round Dance", "Workshop / Training", "Networking", "Webinar", "Sports", "Fundraiser", "Other"];
export const FUNDING_CATEGORIES = ["Scholarship", "Bursary", "Business Grant", "Community Grant", "Other Funding"];
export const OPPORTUNITY_TEXT_FIELDS = ["title", "description", "category", "eventType", "startDate", "endDate", "startTime", "endTime", "timeZone", "city", "province", "venue", "location", "delivery", "price", "rsvpLink", "contactName", "contactEmail", "contactPhone", "imageUrl", "amount", "deadline", "deadlineType", "eligibility", "applicationUrl", "applicationInstructions", "educationLevel", "gpaRequired", "numberOfAwards", "renewable", "indigenousSpecific", "financialNeed", "businessStage", "matchingFunds", "indigenousOwnership", "businessPlanRequired", "maxFundingPerApplicant", "communitySize", "projectDuration", "reportingRequired", "applyMethod"] as const;
export const OPPORTUNITY_ARRAY_FIELDS = ["requirements", "fieldOfStudy", "priorityGroups", "industrySector", "fundingUse", "projectType", "applicantType", "highlights"] as const;

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function safeOpportunityUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try { const url = new URL(value.trim()); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export function scholarshipDeadlineType(record: Record<string, unknown>): "date" | "rolling" | "unknown" {
  if (record.deadlineType === "rolling" || /^(rolling|ongoing)( applications| deadline| intake)?$/i.test(String(record.deadline || "").trim())) return "rolling";
  if (record.deadline && Number.isFinite(new Date(String(record.deadline)).getTime())) return "date";
  return "unknown";
}
export function normalizeOpportunityInput(input: Record<string, unknown>): Record<string, unknown> {
  const result = { ...input };
  const aliases: Record<string, string[]> = { startDate: ["date"], category: ["opportunityType"], imageUrl: ["posterUrl"], rsvpLink: ["externalUrl"], applicationUrl: ["externalUrl", "url"], applicationInstructions: ["howToApply"], gpaRequired: ["minimumGPA"] };
  for (const [key, alternatives] of Object.entries(aliases)) if (!(key in result)) {
    const alias = alternatives.find(name => name in input);
    if (alias) result[key] = input[alias];
  }
  if (input.location && typeof input.location === "object") {
    const location = input.location as Record<string, unknown>;
    for (const field of ["city", "province", "venue"]) if (!(field in result)) result[field] = location[field] || "";
    result.location = [location.venue, location.city, location.province].filter(Boolean).join(", ");
    if (location.remote === true) result.delivery = "online";
  }
  return result;
}
export function validateOpportunity(kind: OpportunityKind, raw: Record<string, unknown>, status: OpportunityStatus, previous: Record<string, unknown> = {}) {
  const input = normalizeOpportunityInput(raw);
  const data: Record<string, unknown> = { ...previous };
  const errors: Record<string, string> = {};
  for (const key of OPPORTUNITY_TEXT_FIELDS) if (key in input) {
    const value = input[key];
    if (typeof value !== "string" && typeof value !== "number") { errors[key] = "Enter text for this field."; continue; }
    const text = String(value).trim();
    const limit = ["description", "eligibility", "applicationInstructions"].includes(key) ? 12000 : key === "title" ? 160 : 1500;
    if (text.length > limit) errors[key] = `Use ${limit} characters or fewer.`;
    data[key] = text;
  }
  for (const key of OPPORTUNITY_ARRAY_FIELDS) if (key in input) {
    const values = Array.isArray(input[key]) ? input[key] as unknown[] : typeof input[key] === "string" ? String(input[key]).split(/\n|,/) : [];
    if (values.length > 40 || values.some(v => typeof v !== "string" || v.length > 500)) errors[key] = "Use up to 40 short entries.";
    data[key] = values.filter(v => typeof v === "string" && v.trim()).map(v => String(v).trim());
  }
  if ("isFree" in input) data.isFree = input.isFree === true;
  if (!String(data.title || "").trim()) errors.title = "Give this listing a title.";
  for (const field of ["applicationUrl", "rsvpLink", "imageUrl"]) if (data[field] && !safeOpportunityUrl(data[field])) errors[field] = "Use a complete https:// or http:// link.";
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.contactEmail))) errors.contactEmail = "Enter a valid contact email.";
  if (data.province) {
    const province = provinceCode(data.province);
    if (!province) errors.province = "Choose a Canadian province or territory.";
    else data.province = province;
  }
  for (const field of ["startDate", "endDate"]) if (data[field] && !isCalendarDate(String(data[field]))) errors[field] = "Choose a valid calendar date.";
  for (const field of ["startTime", "endTime"]) if (data[field] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(data[field]))) errors[field] = "Use a valid local time.";
  if (data.timeZone) { try { new Intl.DateTimeFormat("en-CA", { timeZone: String(data.timeZone) }); } catch { errors.timeZone = "Choose a valid time zone."; } }
  if (data.endDate && data.startDate && String(data.endDate) < String(data.startDate)) errors.endDate = "End date must be on or after the start date.";
  if (kind === "events" && data.startTime && data.endTime && (!data.endDate || data.endDate === data.startDate) && String(data.endTime) <= String(data.startTime)) errors.endTime = "End time must be later, or choose a later end date.";
  if (kind === "events") {
    data.eventType = data.eventType || data.category || "Other";
    if (status === "active") {
      if (!data.startDate) errors.startDate = "Choose the event start date.";
      if (data.delivery !== "online" && !data.location && !(data.city && data.province)) errors.city = "Add the city and province, or choose online.";
      if (data.delivery === "online" && !data.rsvpLink && !data.contactEmail) errors.rsvpLink = "Add a registration link or contact email for joining online.";
      if ((data.startTime || data.endTime) && !data.timeZone) errors.timeZone = "Choose the time zone for these times.";
    }
    // Remove stale imported date labels after an organizer changes dates.
    if ("startDate" in input || "endDate" in input || "startTime" in input || "endTime" in input) data.dates = "";
    data.date = data.startDate || "";
  } else {
    data.category = data.category || "Scholarship";
    if (data.deadlineType === "rolling") data.deadline = "Rolling";
    else if (data.deadlineType === "unknown") data.deadline = "";
    else if (data.deadlineType === "date" && !isCalendarDate(String(data.deadline || ""))) errors.deadline = "Choose the application deadline.";
    if (status === "active") {
      if (!data.eligibility) errors.eligibility = "Explain who can apply.";
      if (!data.amount) errors.amount = "Describe the amount or support offered (for example, Amount varies).";
      if (!data.applicationUrl && !data.applicationInstructions && !data.contactEmail) errors.applicationUrl = "Add an application link, instructions or contact email.";
    }
  }
  if (status === "active" && !data.description) errors.description = "Add a description before publishing.";
  // Entitlements, identity, moderation, ownership and featured placement are never taken from input.
  return { data, errors };
}

/** Render imported rich text as readable text; never execute organizer-provided HTML. */
export function plainOpportunityText(value: unknown): string {
  return String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<\/?(?:p|div|br|li|h[1-6])\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
}

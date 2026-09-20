import { provinceCode } from "@/lib/canadian-provinces";
import { Parser } from "htmlparser2";

export type OpportunityKind = "events" | "scholarships";
export type OpportunityStatus = "draft" | "active" | "closed";
export type OpportunityRecord = Record<string, unknown> & { id: string; title: string; slug?: string; status?: string; revision?: number };
export const EVENT_CATEGORIES = ["Pow Wow", "Conference", "Career Fair", "Round Dance", "Workshop / Training", "Networking", "Webinar", "Sports", "Fundraiser", "Other"];
export const FUNDING_CATEGORIES = ["Scholarship", "Bursary", "Business Grant", "Community Grant", "Other Funding"];
export const OPPORTUNITY_TEXT_FIELDS = ["title", "description", "category", "eventType", "startDate", "endDate", "startTime", "endTime", "timeZone", "city", "province", "venue", "location", "delivery", "price", "rsvpLink", "contactName", "contactEmail", "contactPhone", "imageUrl", "sourceUrl", "amount", "deadline", "deadlineType", "eligibility", "applicationUrl", "applicationInstructions", "educationLevel", "gpaRequired", "numberOfAwards", "renewable", "indigenousSpecific", "financialNeed", "businessStage", "matchingFunds", "indigenousOwnership", "businessPlanRequired", "maxFundingPerApplicant", "communitySize", "projectDuration", "reportingRequired", "applyMethod"] as const;
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
  const aliases: Record<string, string[]> = { startDate: ["date"], category: ["opportunityType"], imageUrl: ["posterUrl"], sourceUrl: ["sourceURL", "website", "url"], rsvpLink: ["externalUrl"], applicationUrl: ["externalUrl", "url"], applicationInstructions: ["howToApply"], gpaRequired: ["minimumGPA"] };
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
  for (const field of ["applicationUrl", "rsvpLink", "imageUrl", "sourceUrl"]) if (data[field] && !safeOpportunityUrl(data[field])) errors[field] = "Use a complete https:// or http:// link.";
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
      if (/\b(?:check|see|refer to)\b.{0,35}\b(?:poster|host source)\b/i.test(String(data.description || "")) && !data.sourceUrl && !data.imageUrl && !data.rsvpLink && !data.contactEmail && !data.contactPhone) errors.sourceUrl = "Add the organizer link, poster or contact details referenced in the description.";
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

/** Extract plain text for React text children, not HTML injection sinks. */
export function plainOpportunityText(value: unknown): string {
  const parts: string[] = [];
  const blocks = new Set(["p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6"]);
  let hiddenDepth = 0;
  const parser = new Parser({
    onopentag(name) {
      if (name === "script" || name === "style") hiddenDepth++;
      if (!hiddenDepth && blocks.has(name)) parts.push("\n");
    },
    ontext(text) { if (!hiddenDepth) parts.push(text); },
    onclosetag(name) {
      if (name === "script" || name === "style") hiddenDepth = Math.max(0, hiddenDepth - 1);
      else if (!hiddenDepth && blocks.has(name)) parts.push("\n");
    },
  }, { decodeEntities: true });
  parser.end(String(value || ""));
  // Entities are decoded once by the parser; decoded text is never reparsed.
  return parts.join("").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Legacy categories describe subjects, so they must not become giant type-menu options. */
export function fundingTypeLabel(record: Record<string, unknown>): string {
  const explicit = String(record.category || record.opportunityType || "").trim();
  const known = [...FUNDING_CATEGORIES, "Grant", "Award"].find(value => value.toLowerCase() === explicit.toLowerCase());
  if (known) return known;
  const title = String(record.title || "").toLowerCase();
  if (/\bbursar(?:y|ies)\b/.test(title)) return "Bursary";
  if (/\bscholarships?\b/.test(title)) return "Scholarship";
  if (/\bgrants?\b/.test(title)) return "Grant";
  if (/\bawards?\b/.test(title)) return "Award";
  return "Other Funding";
}

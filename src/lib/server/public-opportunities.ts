import { dedupeEventDirectory } from "@/lib/event-directory-dedupe";
import { getAdminDb } from "@/lib/firebase-admin";
import { isJobRecordExpired } from "@/lib/listing-freshness";
import { isPublicEventVisible, normalizePublicEvent } from "@/lib/public-events";
import { OPPORTUNITY_TEXT_FIELDS, OPPORTUNITY_ARRAY_FIELDS, normalizeOpportunityInput, safeOpportunityUrl, plainOpportunityText, type OpportunityKind } from "@/lib/opportunity-posting";
import { displayAmount } from "@/lib/utils";
import { deriveOwnerType, matchesOrgName, serialize, withPublicOwnership, type JsonRecord } from "@/lib/server/public-ownership";
import { withPartnerPromotion } from "@/lib/server/partner-promotion";
import { opportunityAliases, loadOpportunityMatches, loadPublicOpportunityCandidates, loadRelatedOpportunityOrganizations } from "./opportunity-lookups";
import type { Firestore } from "firebase-admin/firestore";

export { opportunityAliases } from "./opportunity-lookups";

const publicFields = new Set<string>([...OPPORTUNITY_TEXT_FIELDS, ...OPPORTUNITY_ARRAY_FIELDS, "id", "slug", "dates", "date", "orgId", "orgName", "orgShort", "organization", "organizer", "organizerName", "status", "active", "isFree", "schedule", "badges", "featured", "createdAt", "updatedAt", "order"]);
export function mergeOpportunitySources(primary: JsonRecord[], legacy: JsonRecord[], kind: OpportunityKind) {
  const prefix = kind === "events" ? "event" : "scholarship";
  const reserved = new Set(primary.flatMap(record => opportunityAliases(record, prefix)));
  return [...primary, ...legacy.filter(record => !opportunityAliases(record, prefix).some(key => reserved.has(key)))];
}
export function publicOpportunityRecord(raw: JsonRecord, kind: OpportunityKind): JsonRecord | null {
  // Explicit publication states only. Missing status is supported for imported legacy records.
  if (raw.active === false || (raw.status && !["active", "published"].includes(String(raw.status).toLowerCase())) || !raw.title) return null;
  if (kind === "events" && !isPublicEventVisible(raw)) return null;
  const normalized = normalizeOpportunityInput(raw);
  const record = Object.fromEntries(Object.entries(normalized).filter(([key]) => publicFields.has(key)));
  record.id = raw.id;
  record.slug = raw.slug || String(raw.id).replace(kind === "events" ? /^event-/ : /^scholarship-/, "");
  record.orgId = raw.orgId || raw.employerId || "";
  const originalLocation = String(normalized.location || "").trim();
  const locationParts = originalLocation ? [originalLocation] : [];
  for (const value of [raw.venue, raw.city, raw.province]) {
    if (typeof value === "string" && value.trim() && !locationParts.some(part => part.toLowerCase().split(/[,;]\s*/).includes(value.trim().toLowerCase()))) locationParts.push(value.trim());
  }
  record.location = raw.delivery === "online" ? "Online" : locationParts.join(", ");
  for (const key of ["description", "eligibility", "applicationInstructions"]) if (record[key]) record[key] = plainOpportunityText(record[key]);
  record.orgName = raw.orgName || raw.organizerName || raw.organization || "";
  for (const key of ["applicationUrl", "rsvpLink", "imageUrl", "sourceUrl"]) record[key] = safeOpportunityUrl(record[key]);
  if (kind === "events") {
    if (raw.isFree === true && !record.price) record.price = "Free";
    record.eventType = raw.eventType || raw.category || (raw.type !== "event" ? raw.type : "") || "Other";
    return normalizePublicEvent(record);
  }
  if (record.amount != null) record.amount = displayAmount(record.amount);
  return { ...record, intakeClosed: isJobRecordExpired(record) };
}
function publicItems(primary: JsonRecord[], posts: JsonRecord[], kind: OpportunityKind) {
  return mergeOpportunitySources(primary, posts, kind).map(record => publicOpportunityRecord(record, kind))
    .filter((record): record is JsonRecord => record !== null);
}
function scholarshipOwner(record: JsonRecord, organizations: JsonRecord[]): JsonRecord {
  const linked = organizations.find(org => org.id === record.orgId || matchesOrgName(record.orgName, String(org.name || "")));
  const promoted = linked ? withPartnerPromotion(linked) : null;
  return { ...withPublicOwnership(record, { contentType: "scholarship", ownerType: deriveOwnerType(linked), ownerId: String(record.orgId || linked?.id || ""), ownerName: String(record.orgName || ""), ownerSlug: String(linked?.slug || record.orgId || "") }),
    isPartner: !!promoted?.isPartner, partnerTier: promoted?.partnerTier || null, partnerBadgeLabel: promoted?.partnerBadgeLabel || null };
}
export async function getPublicOpportunities(kind: OpportunityKind, combineDuplicates = true, db: Firestore = getAdminDb()): Promise<JsonRecord[]> {
  const [main, posts] = await Promise.all([
    loadPublicOpportunityCandidates(db, kind),
    db.collection("posts").where("type", "==", kind === "events" ? "event" : "scholarship").get(),
  ]);
  const mirrors = posts.docs.map(doc => serialize({ ...doc.data(), id: doc.id }) as JsonRecord);
  const shadows = await loadOpportunityMatches(db, kind, kind, mirrors.filter(record => publicOpportunityRecord(record, kind)));
  const canonical = [...new Map([...main, ...shadows].map(record => [String(record.id), record])).values()]
    .sort((a, b) => Buffer.compare(Buffer.from(String(a.id)), Buffer.from(String(b.id))));
  let items = publicItems(canonical, mirrors, kind);
  if (kind === "scholarships") {
    const organizations = await loadRelatedOpportunityOrganizations(db, items);
    items = items.map(record => scholarshipOwner(record, organizations));
  }
  return kind === "events" && combineDuplicates ? dedupeEventDirectory(items) : items;
}
export async function getPublicOpportunity(kind: OpportunityKind, id: string, db: Firestore = getAdminDb()): Promise<JsonRecord | null> {
  const [main, posts] = await Promise.all([
    loadOpportunityMatches(db, kind, kind, [{ id }]),
    loadOpportunityMatches(db, "posts", kind, [{ id }]),
  ]);
  const mirrors = posts.filter(record => record.type === (kind === "events" ? "event" : "scholarship"));
  const shadows = await loadOpportunityMatches(db, kind, kind, mirrors);
  const canonical = [...new Map([...main, ...shadows].map(record => [String(record.id), record])).values()]
    .sort((a, b) => Buffer.compare(Buffer.from(String(a.id)), Buffer.from(String(b.id))));
  const item = publicItems(canonical, mirrors, kind).find(item => item.id === id || item.slug === id);
  if (!item) return null;
  return kind === "scholarships" ? scholarshipOwner(item, await loadRelatedOpportunityOrganizations(db, [item])) : item;
}

import { getAdminDb } from "@/lib/firebase-admin";
import { isJobRecordExpired } from "@/lib/listing-freshness";
import { isPublicEventVisible, normalizePublicEvent } from "@/lib/public-events";
import { OPPORTUNITY_TEXT_FIELDS, OPPORTUNITY_ARRAY_FIELDS, normalizeOpportunityInput, safeOpportunityUrl, plainOpportunityText, type OpportunityKind } from "@/lib/opportunity-posting";
import { displayAmount } from "@/lib/utils";
import { deriveOwnerType, matchesOrgName, serialize, withPublicOwnership, type JsonRecord } from "@/lib/server/public-ownership";
import { withPartnerPromotion } from "@/lib/server/partner-promotion";

const publicFields = new Set<string>([...OPPORTUNITY_TEXT_FIELDS, ...OPPORTUNITY_ARRAY_FIELDS, "id", "slug", "dates", "date", "orgId", "orgName", "orgShort", "organization", "organizer", "organizerName", "status", "active", "isFree", "schedule", "badges", "featured", "createdAt", "updatedAt", "order"]);
function aliases(record: JsonRecord, prefix: string): string[] {
  return [record.id, record.slug].filter(Boolean).map(value => String(value).replace(new RegExp(`^${prefix}-`), ""));
}
export function mergeOpportunitySources(primary: JsonRecord[], legacy: JsonRecord[], kind: OpportunityKind) {
  const prefix = kind === "events" ? "event" : "scholarship";
  const reserved = new Set(primary.flatMap(record => aliases(record, prefix)));
  return [...primary, ...legacy.filter(record => !aliases(record, prefix).some(key => reserved.has(key)))];
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
  record.location = raw.delivery === "online" ? "Online" : [raw.venue, raw.city, raw.province].filter(Boolean).join(", ") || normalized.location || "";
  for (const key of ["description", "eligibility", "applicationInstructions"]) if (record[key]) record[key] = plainOpportunityText(record[key]);
  record.orgName = raw.orgName || raw.organizerName || raw.organization || "";
  for (const key of ["applicationUrl", "rsvpLink", "imageUrl"]) record[key] = safeOpportunityUrl(record[key]);
  if (kind === "events") {
    if (raw.isFree === true && !record.price) record.price = "Free";
    record.eventType = raw.eventType || raw.category || (raw.type !== "event" ? raw.type : "") || "Other";
    return normalizePublicEvent(record);
  }
  if (record.amount != null) record.amount = displayAmount(record.amount);
  return { ...record, intakeClosed: isJobRecordExpired(record) };
}
export async function getPublicOpportunities(kind: OpportunityKind): Promise<JsonRecord[]> {
  const db = getAdminDb();
  const [main, posts, orgs] = await Promise.all([
    db.collection(kind).get(),
    db.collection("posts").where("type", "==", kind === "events" ? "event" : "scholarship").get(),
    kind === "scholarships" ? db.collection("organizations").get() : Promise.resolve(null),
  ]);
  const records = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map(doc => serialize({ ...doc.data(), id: doc.id }) as JsonRecord);
  const organizations = orgs ? records(orgs) : [];
  return mergeOpportunitySources(records(main), records(posts), kind)
    .map(record => publicOpportunityRecord(record, kind))
    .filter((record): record is JsonRecord => record !== null)
    .map(record => {
      if (kind !== "scholarships") return record;
      const linked = organizations.find(org => org.id === record.orgId || matchesOrgName(record.orgName, String(org.name || "")));
      const promoted = linked ? withPartnerPromotion(linked) : null;
      return { ...withPublicOwnership(record, { contentType: "scholarship", ownerType: deriveOwnerType(linked), ownerId: String(record.orgId || linked?.id || ""), ownerName: String(record.orgName || ""), ownerSlug: String(linked?.slug || record.orgId || "") }),
        isPartner: !!promoted?.isPartner, partnerTier: promoted?.partnerTier || null, partnerBadgeLabel: promoted?.partnerBadgeLabel || null };
    });
}
export async function getPublicOpportunity(kind: OpportunityKind, id: string) {
  const items = await getPublicOpportunities(kind);
  return items.find(item => item.id === id || item.slug === id) || null;
}

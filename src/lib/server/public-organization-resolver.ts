import { getOrganizationAccessBlockReason } from "@/lib/access-state";
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization, isSchoolPubliclyVisible } from "@/lib/school-visibility";
import { applyNormalizedSubscriptionState } from "@/lib/server/subscription-state";
type JsonRecord = Record<string, unknown>;

// Several legacy records can share a slug; compare a bounded set of them.
const SLUG_MATCH_LIMIT = 10;
const MAX_NUMBERED_SLUG = 20;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return (
      (value as Record<string, unknown>).toDate as () => Date
    )().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serialize(entry);
    }
    return result;
  }
  return value;
}

function serializeDoc(
  doc:
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot,
): JsonRecord {
  return serialize({ id: doc.id, ...(doc.data() || {}) }) as JsonRecord;
}

function toPublicRecord(
  doc:
    | FirebaseFirestore.DocumentSnapshot
    | FirebaseFirestore.QueryDocumentSnapshot,
): JsonRecord {
  return normalizeOrganizationRecord(applyNormalizedSubscriptionState(serializeDoc(doc)));
}

/** The checks the public organization page applies before showing a record. */
function isShownPublicly(record: JsonRecord): boolean {
  if (getOrganizationAccessBlockReason(record) || String(record.status ?? "").trim().toLowerCase() === "suspended") return false;
  return isSchoolOrganization(record) ? isSchoolPubliclyVisible(record) : isOrganizationPubliclyVisible(record);
}

function createdAtMillis(record: JsonRecord): number {
  const value = record.createdAt;
  const millis = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(millis) ? millis : Number.POSITIVE_INFINITY;
}

/**
 * Firestore returns slug matches in document-ID order, so the first match is
 * arbitrary. Prefer a record the public page shows, then the oldest, then the
 * lowest ID: a hidden or newer namesake never hides or takes over the link.
 */
function preferredSlugMatch(records: JsonRecord[]): JsonRecord | null {
  return [...records].sort((a, b) => {
    const visibility = Number(isShownPublicly(b)) - Number(isShownPublicly(a));
    if (visibility) return visibility;
    const age = createdAtMillis(a) - createdAtMillis(b);
    if (age) return age;
    const [first, second] = [String(a.id), String(b.id)];
    return first < second ? -1 : first > second ? 1 : 0;
  })[0] ?? null;
}

export async function resolvePublicOrganization(
  db: FirebaseFirestore.Firestore,
  slug: string,
): Promise<JsonRecord | null> {
  const directDoc = await db.collection("organizations").doc(slug).get();
  if (directDoc.exists) {
    return toPublicRecord(directDoc);
  }

  const slugQuery = await db
    .collection("organizations")
    .where("slug", "==", slug)
    .limit(SLUG_MATCH_LIMIT)
    .get();

  if (!slugQuery.empty) {
    return preferredSlugMatch(slugQuery.docs.map(toPublicRecord));
  }

  const employerQuery = await db
    .collection("employers")
    .where("slug", "==", slug)
    .limit(SLUG_MATCH_LIMIT)
    .get();

  const directEmployer = employerQuery.empty ? await db.collection("employers").doc(slug).get() : null;
  const employers = employerQuery.empty ? (directEmployer?.exists ? [directEmployer] : []) : employerQuery.docs;
  if (employers.length) {
    const records: JsonRecord[] = [];
    for (const employer of employers) {
      const linkedId = employer.data()?.orgId || employer.id;
      const canonical = typeof linkedId === "string" && !linkedId.includes("/")
        ? await db.collection("organizations").doc(linkedId).get() : null;
      // A linked legacy copy must not resurrect a removed canonical organization.
      if (employer.data()?.orgId && !canonical?.exists) continue;
      records.push(toPublicRecord(canonical?.exists ? canonical : employer));
    }
    return preferredSlugMatch(records);
  }

  // H-2: when scripts/dedup-organizations.cjs merges a duplicate org, it
  // writes a redirect entry so old links keep resolving. Honor it here.
  const redirectDoc = await db.collection("org-slug-redirects").doc(slug).get();
  if (redirectDoc.exists) {
    const target = String(redirectDoc.data()?.to || "");
    if (target) {
      const targetDoc = await db.collection("organizations").doc(target).get();
      if (targetDoc.exists) {
        return toPublicRecord(targetDoc);
      }
    }
  }

  return null;
}

/** URL slug derived from an organization name; empty when the name has no Latin letters or digits. */
export function organizationSlugBase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 60);
}

/** Whether `slug` already resolves (by any path above) to a record other than `orgId`. */
async function isSlugTaken(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  slug: string,
  orgId: string,
): Promise<boolean> {
  const [organizations, employers, direct] = await Promise.all([
    tx.get(db.collection("organizations").where("slug", "==", slug).limit(2)),
    tx.get(db.collection("employers").where("slug", "==", slug).limit(2)),
    tx.getAll(
      db.collection("organizations").doc(slug),
      db.collection("employers").doc(slug),
      db.collection("org-slug-redirects").doc(slug),
    ),
  ]);
  return organizations.docs.some(doc => doc.id !== orgId) ||
    employers.docs.some(doc => doc.id !== orgId) ||
    direct.some(doc => doc.exists);
}

/**
 * The first of name, name-2, name-3… that no other organization, legacy
 * employer record or merge redirect uses. Call it inside the transaction that
 * creates the organization so concurrent signups cannot claim the same slug.
 */
export async function availableOrganizationSlug(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  name: string,
  orgId: string,
): Promise<string> {
  const base = organizationSlugBase(name);
  // Without a slug, public links already use the organization's ID.
  if (!base) return "";
  for (let number = 1; number <= MAX_NUMBERED_SLUG; number++) {
    const candidate = number === 1 ? base : `${base.replace(/-+$/, "")}-${number}`;
    if (!await isSlugTaken(tx, db, candidate, orgId)) return candidate;
  }
  // The record's own ID always resolves to it, directly.
  return orgId;
}

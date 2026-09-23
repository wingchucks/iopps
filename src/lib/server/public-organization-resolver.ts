import { normalizeOrganizationRecord } from "@/lib/organization-profile";
import { applyNormalizedSubscriptionState } from "@/lib/server/subscription-state";
type JsonRecord = Record<string, unknown>;

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

export async function resolvePublicOrganization(
  db: FirebaseFirestore.Firestore,
  slug: string,
): Promise<JsonRecord | null> {
  const directDoc = await db.collection("organizations").doc(slug).get();
  if (directDoc.exists) {
    return normalizeOrganizationRecord(
      applyNormalizedSubscriptionState(serializeDoc(directDoc))
    );
  }

  const slugQuery = await db
    .collection("organizations")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!slugQuery.empty) {
    return normalizeOrganizationRecord(
      applyNormalizedSubscriptionState(serializeDoc(slugQuery.docs[0]))
    );
  }

  const employerQuery = await db
    .collection("employers")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  const directEmployer = employerQuery.empty ? await db.collection("employers").doc(slug).get() : null;
  if (!employerQuery.empty || directEmployer?.exists) {
    const employer = employerQuery.empty ? directEmployer! : employerQuery.docs[0];
    const linkedId = employer.data()?.orgId || employer.id;
    const canonical = typeof linkedId === "string" && !linkedId.includes("/")
      ? await db.collection("organizations").doc(linkedId).get() : null;
    // A linked legacy copy must not resurrect a removed canonical organization.
    if (employer.data()?.orgId && !canonical?.exists) return null;
    return normalizeOrganizationRecord(
      applyNormalizedSubscriptionState(serializeDoc(canonical?.exists ? canonical : employer))
    );
  }

  // H-2: when scripts/dedup-organizations.cjs merges a duplicate org, it
  // writes a redirect entry so old links keep resolving. Honor it here.
  const redirectDoc = await db.collection("org-slug-redirects").doc(slug).get();
  if (redirectDoc.exists) {
    const target = String(redirectDoc.data()?.to || "");
    if (target) {
      const targetDoc = await db.collection("organizations").doc(target).get();
      if (targetDoc.exists) {
        return normalizeOrganizationRecord(
          applyNormalizedSubscriptionState(serializeDoc(targetDoc))
        );
      }
    }
  }

  return null;
}


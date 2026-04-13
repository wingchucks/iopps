import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { comparePartnerPromotion, isPaidPartner, withPartnerPromotion } from "@/lib/server/partner-promotion";

export const runtime = "nodejs";
export const revalidate = 60;
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeKeySegment(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSlugBase(record: JsonRecord): string {
  const slug = normalizeKeySegment(record.slug);
  if (slug) return slug.replace(/-[a-z0-9]{6}$/i, "");

  const id = text(record.id);
  if (/^[a-z0-9-]+$/i.test(id) && id.includes("-")) {
    return normalizeKeySegment(id).replace(/-[a-z0-9]{6}$/i, "");
  }

  return "";
}

function partnerIdentityKeys(record: JsonRecord): string[] {
  const keys: string[] = [];
  const id = text(record.id);
  const employerId = text(record.employerId);
  if (id) {
    keys.push(`record:${id}`);
    keys.push(`employer:${id}`);
  }
  if (employerId) keys.push(`employer:${employerId}`);

  const normalizedName = normalizeKeySegment(record.name);
  const slugBase = normalizeSlugBase(record);

  if (
    normalizedName &&
    slugBase &&
    (slugBase === normalizedName || slugBase.startsWith(`${normalizedName}-`) || normalizedName.startsWith(`${slugBase}-`))
  ) {
    keys.push(`org:${normalizedName}`);
  } else {
    if (slugBase) keys.push(`slug:${slugBase}`);
    if (normalizedName) keys.push(`name:${normalizedName}`);
  }

  if (keys.length === 0) {
    keys.push(`fallback:${id || normalizedName || slugBase || "unknown"}`);
  }

  return Array.from(new Set(keys));
}

function partnerSelectionScore(record: JsonRecord): number {
  const subscription =
    record.subscription && typeof record.subscription === "object"
      ? (record.subscription as JsonRecord)
      : {};
  const publicVisibility = text(record.publicVisibility).toLowerCase();
  const publicationStatus = text(record.publicationStatus).toUpperCase();
  const subscriptionStatus =
    text(subscription.status).toLowerCase() ||
    text(record.subscriptionStatus).toLowerCase();
  const employerId = text(record.employerId);
  let score = 0;

  if (record.isPartner === true) score += 1000;
  if (publicVisibility === "public") score += 80;
  if (record.isPublished === true) score += 50;
  if (publicationStatus === "PUBLISHED") score += 50;
  if (record.directoryVisible === true) score += 35;
  if (record.isDirectoryVisible === true) score += 35;
  if (subscriptionStatus === "active") score += 40;
  if (text(subscription.paymentId || record.paymentId)) score += 20;
  if ((numberValue(subscription.amountPaid) ?? numberValue(record.amountPaid) ?? 0) > 0) score += 20;
  if (text(record.logoUrl || record.logo)) score += 8;
  if (text(record.description || record.tagline)) score += 8;
  if (text(record.website)) score += 4;
  if (record.location && typeof record.location === "object") score += 4;
  if (employerId && employerId !== text(record.id)) score -= 120;

  return score;
}

function dedupePartners(records: JsonRecord[]): JsonRecord[] {
  const sorted = [...records].sort((left, right) => {
    const scoreDelta = partnerSelectionScore(right) - partnerSelectionScore(left);
    if (scoreDelta !== 0) return scoreDelta;
    return comparePartnerPromotion(left, right);
  });
  const seen = new Set<string>();
  const unique: JsonRecord[] = [];

  for (const record of sorted) {
    const keys = partnerIdentityKeys(record);
    if (keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    unique.push(record);
  }

  return unique;
}

export function buildPartnersPayload(records: JsonRecord[]) {
  const promotedRecords = dedupePartners(
    records.map((record) => withPartnerPromotion(serialize(record) as JsonRecord)),
  );
  const partners = promotedRecords
    .filter((org) => isPaidPartner(org))
    .sort(comparePartnerPromotion);

  return {
    partners,
    groups: {
      premium: partners.filter((partner) => partner.partnerTier === "premium"),
      school: partners.filter((partner) => partner.partnerTier === "school"),
      standard: partners.filter((partner) => partner.partnerTier === "standard"),
    },
  };
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("organizations").get();

    return NextResponse.json(
      buildPartnersPayload(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as JsonRecord),
      ),
    );
  } catch (err) {
    console.error("[api/partners] Error:", err);
    return NextResponse.json(
      { partners: [], groups: { premium: [], school: [], standard: [] } },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { comparePartnerPromotion, isPaidPartner, withPartnerPromotion } from "@/lib/server/partner-promotion";

export const runtime = "nodejs";
export const revalidate = 60;
export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("organizations").get();

    const partners = snapshot.docs
      .map((doc) => withPartnerPromotion(serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>))
      .filter((org) => isPaidPartner(org))
      .sort(comparePartnerPromotion);

    return NextResponse.json({
      partners,
      groups: {
        premium: partners.filter((partner) => partner.partnerTier === "premium"),
        school: partners.filter((partner) => partner.partnerTier === "school"),
        standard: partners.filter((partner) => partner.partnerTier === "standard"),
      },
    });
  } catch (err) {
    console.error("[api/partners] Error:", err);
    return NextResponse.json(
      { partners: [], groups: { premium: [], school: [], standard: [] } },
      { status: 500 },
    );
  }
}

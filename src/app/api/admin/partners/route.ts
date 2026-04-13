import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  getPartnerDirectorySettings,
  getPartnerEligibility,
  getPartnerSubscriptionTier,
  hasPartnerSubscription,
  withPartnerPromotion,
  type PartnerTier,
  type PartnerEligibilityReason,
} from "@/lib/server/partner-promotion";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as JsonRecord).toDate === "function") {
    return ((value as JsonRecord).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, field]) => [key, serialize(field)]),
    );
  }
  return value;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tierWeight(tier: PartnerTier | null): number {
  if (tier === "premium") return 300;
  if (tier === "school") return 220;
  if (tier === "standard") return 120;
  return 0;
}

function reasonWeight(reason: PartnerEligibilityReason): number {
  if (reason === "active_paid_subscription") return 1000;
  if (reason === "legacy_directory_partner") return 900;
  if (reason === "trial_only") return 400;
  if (reason === "admin_grant") return 250;
  if (reason === "expired") return 180;
  if (reason === "not_public") return 120;
  return 0;
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("organizations").orderBy("name", "asc").get();

    const partners = snapshot.docs
      .map((doc) => {
        const raw = serialize({ id: doc.id, ...doc.data() }) as JsonRecord;
        const normalized = withPartnerPromotion(raw);
        const directory = getPartnerDirectorySettings(raw);
        const eligibility = getPartnerEligibility(raw);
        const subscriptionTier = getPartnerSubscriptionTier(raw);
        const subscriptionStatus =
          text((normalized.subscription as JsonRecord | undefined)?.status) ||
          text(normalized.subscriptionStatus);

        return {
          id: doc.id,
          name: text(normalized.name),
          shortName: text(normalized.shortName),
          logoUrl: text(normalized.logoUrl || normalized.logo),
          websiteUrl: text(normalized.website),
          description: text(normalized.description || normalized.tagline),
          ownerType: text(normalized.ownerType || normalized.type) || "organization",
          verified: normalized.verified === true,
          status: text(normalized.status) || "unknown",
          publicVisibility: text(normalized.publicVisibility) || "public",
          isPublicPartner: normalized.isPartner === true,
          isEligibleForPublicPartner: eligibility.isEligible,
          eligibilityReason: eligibility.reason,
          subscriptionTier,
          subscriptionStatus,
          subscriptionEnd: eligibility.subscriptionEnd,
          spotlight: directory.spotlight === true,
          sectionOverride: directory.sectionOverride,
          partnerBadgeLabel:
            typeof normalized.partnerBadgeLabel === "string" ? normalized.partnerBadgeLabel : undefined,
          location: normalized.location,
        };
      })
      .filter((org) => org.spotlight || Boolean(org.sectionOverride) || org.isPublicPartner || hasPartnerSubscription(org as unknown as JsonRecord))
      .sort((left, right) => {
        const leftWeight =
          reasonWeight(left.eligibilityReason) +
          (left.spotlight ? 50 : 0) +
          tierWeight(left.subscriptionTier);
        const rightWeight =
          reasonWeight(right.eligibilityReason) +
          (right.spotlight ? 50 : 0) +
          tierWeight(right.subscriptionTier);

        if (leftWeight !== rightWeight) return rightWeight - leftWeight;
        return left.name.localeCompare(right.name);
      });

    return NextResponse.json({ partners });
  } catch (error) {
    console.error("[api/admin/partners][GET]", error);
    return NextResponse.json({ partners: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  return NextResponse.json(
    { error: "Partner listings are organization-backed. Create or update the organization instead." },
    { status: 405 },
  );
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  return NextResponse.json(
    { error: "Reordering legacy partner records is no longer supported." },
    { status: 405 },
  );
}

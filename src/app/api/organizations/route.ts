import { NextResponse } from "next/server";
import { getAdminDb, hasAdminRuntimeSupport } from "@/lib/firebase-admin";
import { getLocalDevOrganizations } from "@/lib/local-dev-business-data";
import { comparePartnerPromotion, isPaidPartner, withPartnerPromotion } from "@/lib/server/partner-promotion";
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord, stripOrganizationContactPII } from "@/lib/organization-profile";
import { isSchoolOrganization, isSchoolPubliclyVisible } from "@/lib/school-visibility";

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
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const partnersOnly = searchParams.get("partners") === "true";

  if (process.env.NODE_ENV !== "production" && !hasAdminRuntimeSupport()) {
    return NextResponse.json({ orgs: getLocalDevOrganizations(partnersOnly) });
  }

  try {
    const db = getAdminDb();

    if (partnersOnly) {
      const snapshot = await db.collection("organizations").get();
      const orgs = snapshot.docs
        .map((doc) =>
          stripOrganizationContactPII(
            normalizeOrganizationRecord(
              withPartnerPromotion(serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
            )
          )
        )
        .filter((org) => isSchoolOrganization(org) || isOrganizationPubliclyVisible(org))
        .filter((org) => !isSchoolOrganization(org) || isSchoolPubliclyVisible(org))
        .filter((org) => isPaidPartner(org))
        .sort(comparePartnerPromotion);
      return NextResponse.json({ orgs });
    }

    // Search / general: orgs that completed onboarding, are verified, or have been accepted
    const [onboardedSnap, verifiedSnap2, approvedSnap] = await Promise.all([
      db.collection("organizations")
        .where("onboardingComplete", "==", true)
        .get(),
      db.collection("organizations")
        .where("verified", "==", true)
        .get(),
      db.collection("organizations")
        .where("status", "==", "approved")
        .get(),
    ]);
    const seen2 = new Set<string>();
    const allDocs = [...onboardedSnap.docs, ...verifiedSnap2.docs, ...approvedSnap.docs].filter(d => {
      if (seen2.has(d.id)) return false;
      seen2.add(d.id);
      return true;
    });
    const orgs = allDocs
      .map((doc) =>
        stripOrganizationContactPII(
          normalizeOrganizationRecord(
            withPartnerPromotion(serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
          )
        )
      )
      .filter((org) => isSchoolOrganization(org) || isOrganizationPubliclyVisible(org))
      .filter((org) => !isSchoolOrganization(org) || isSchoolPubliclyVisible(org))
      .sort(comparePartnerPromotion);

    return NextResponse.json({ orgs });
  } catch (err) {
    console.error("[api/organizations] Error:", err);
    return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 });
  }
}

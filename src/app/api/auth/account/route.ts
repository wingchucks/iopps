import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { assertUserCanAccessApp, AccountAccessError } from "@/lib/server/account-access";
import { requireEmployerContext, EmployerApiError } from "@/lib/server/employer-auth";
import { getBusinessProfileReadiness, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization } from "@/lib/school-visibility";
import { accountDestination } from "@/lib/sign-in-destination";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(authorization.slice(7));
    const { userData } = await assertUserCanAccessApp(decoded);
    const member = await getAdminDb().collection("members").doc(decoded.uid).get();
    const memberData = member.data() || {};
    const admin = decoded.admin === true || [decoded.role, userData.role, memberData.role]
      .some(role => role === "admin" || role === "moderator");
    let organization;

    if (!admin) {
      try {
        const context = await requireEmployerContext(req);
        const raw = Object.keys(context.organizationData).length ? context.organizationData : context.employerData;
        const org = normalizeOrganizationRecord({
          ...raw,
          contactEmail: raw.contactEmail || raw.email || decoded.email,
        });
        const readiness = getBusinessProfileReadiness(org, { workspace: true });
        organization = {
          authorized: true,
          organizationType: isSchoolOrganization(org) ? "school" : "business",
          profileReady: readiness.isReady,
          missingProfileFields: readiness.missingFields,
        };
      } catch (error) {
        if (!(error instanceof EmployerApiError && error.status === 403 && error.message === "Not an employer")) {
          throw error;
        }
      }
    }

    return NextResponse.json({
      destination: accountDestination({ admin, hasMemberProfile: member.exists, organization }),
    }, { headers });
  } catch (error) {
    if (error instanceof AccountAccessError || error instanceof EmployerApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (["auth/id-token-expired", "auth/argument-error", "auth/invalid-id-token", "auth/id-token-revoked"].includes(code)) {
      return NextResponse.json({ error: "Your sign-in has expired. Please sign in again." }, { status: 401, headers });
    }
    console.error("Account destination lookup failed", error);
    return NextResponse.json({ error: "We couldn’t load your account. Please retry." }, { status: 503, headers });
  }
}

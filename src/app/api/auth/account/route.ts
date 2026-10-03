import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { assertUserCanAccessApp, AccountAccessError } from "@/lib/server/account-access";
import { requireEmployerContext, EmployerApiError } from "@/lib/server/employer-auth";
import { getBusinessProfileReadiness, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization } from "@/lib/school-visibility";
import { accountDestination } from "@/lib/sign-in-destination";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const ORGANIZATION_UNAVAILABLE_NOTICE =
  "Your organization's workspace is no longer available, so you are signed in to your personal profile. Contact support@iopps.ca if you think this is a mistake.";

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401, headers });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(authorization.slice(7));
    const { userData } = await assertUserCanAccessApp(decoded);
    const member = await getAdminDb().collection("members").doc(decoded.uid).get();
    // Only accounts the admin APIs accept (verifyAdminToken) are sent to /admin.
    // Moderators have no admin tools; they use their own or their organization's workspace.
    const admin = (decoded.admin === true || decoded.role === "admin") &&
      (userData.claimsValidAfter === undefined || userData.role === "admin");
    let organization;
    let organizationUnavailable = false;

    if (!admin) {
      try {
        const context = await requireEmployerContext(req);
        const raw = Object.keys(context.organizationData).length ? context.organizationData : context.employerData;
        // Readiness counts only public contact methods, never account emails.
        const org = normalizeOrganizationRecord({ ...raw } as Record<string, unknown>);
        const readiness = getBusinessProfileReadiness(org, { workspace: true });
        organization = {
          authorized: true,
          organizationType: isSchoolOrganization(org) ? "school" : "business",
          profileReady: readiness.isReady,
          missingProfileFields: readiness.missingFields,
        };
      } catch (error) {
        // A 403 without a code means no usable organization: none at all, or one an
        // administrator disabled or removed. The person's own profile stays available either way.
        // Account-level denials (disabled, deleted or suspended accounts) carry a code and are
        // reported as errors instead of being routed around.
        if (!(error instanceof EmployerApiError && error.status === 403 && !error.code)) throw error;
        organizationUnavailable = error.message !== "Not an employer";
      }
    }

    return NextResponse.json({
      destination: accountDestination({ admin, hasMemberProfile: member.exists, setupComplete: userData.setupComplete === true, signupIntent: userData.signupIntent, organization, organizationUnavailable }),
      ...(organizationUnavailable ? { notice: ORGANIZATION_UNAVAILABLE_NOTICE } : {}),
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

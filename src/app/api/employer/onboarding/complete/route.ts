import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { getBusinessProfileReadiness, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization } from "@/lib/school-visibility";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const context = await requireEmployerContext(req);

    if (!context.emailVerified) {
      return NextResponse.json(
        { error: "Verify your email before finishing organization setup." },
        { status: 403 },
      );
    }

    const normalizedOrg = normalizeOrganizationRecord({
      id: context.orgId,
      ...context.organizationData,
      contactEmail:
        context.organizationData.contactEmail ||
        context.employerData.contactEmail ||
        context.employerData.email ||
        context.userData.email ||
        context.memberData.email,
    });
    const school = isSchoolOrganization(normalizedOrg);
    const readiness = getBusinessProfileReadiness(normalizedOrg);

    if (!school && !readiness.isReady) {
      const labels: Record<string, string> = {
        logo: "upload a logo",
        description: "add a description",
        contact: "add a public contact method",
      };
      return NextResponse.json(
        {
          error: `Before finishing organization setup, please ${readiness.missingFields.map((field) => labels[field] || field).join(", ")}.`,
          missingFields: readiness.missingFields,
        },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();

    const employerRef = db.collection("employers").doc(context.employerId);
    const organizationRef = db.collection("organizations").doc(context.orgId);
    const userRef = db.collection("users").doc(context.uid);
    const memberRef = db.collection("members").doc(context.uid);

    await Promise.all([
      organizationRef.set({
        onboardingComplete: true,
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      }, { merge: true }),
      employerRef.set({
        onboardingComplete: true,
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      }, { merge: true }),
      userRef.set({
        onboardingComplete: true,
        updatedAt: now,
      }, { merge: true }),
      memberRef.set({
        onboardingComplete: true,
        updatedAt: now,
      }, { merge: true }),
      organizationRef.collection("activity").add({
        type: "onboarding_complete",
        message: "Organization setup completed and account accepted automatically.",
        timestamp: now,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof EmployerApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to complete organization setup";
    console.error("[employer/onboarding/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

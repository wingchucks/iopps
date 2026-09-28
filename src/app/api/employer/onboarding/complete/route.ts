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

    if (!["owner", "admin"].includes(context.orgRole)) throw new EmployerApiError(403, "Only an owner or manager can finish organization setup.");

    if (!context.emailVerified) {
      return NextResponse.json(
        { error: "Verify your email before finishing organization setup." },
        { status: 403 },
      );
    }

    // Account emails never stand in for a public contact method.
    const normalizedOrg = normalizeOrganizationRecord({
      id: context.orgId,
      ...context.organizationData,
    } as Record<string, unknown>);
    const school = isSchoolOrganization(normalizedOrg);
    const readiness = getBusinessProfileReadiness(normalizedOrg, { workspace: true });

    if (!school && !readiness.isReady) {
      const labels: Record<string, string> = {
        name: "add your organization name",
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

    await db.runTransaction(async tx => {
      const records = await Promise.all([tx.get(organizationRef), tx.get(employerRef)]);
      for (const record of records) {
        if (!record.exists) throw new EmployerApiError(404, "Organization account not found.");
        const status = record.data()?.status;
        tx.update(record.ref, {
          onboardingComplete: true, updatedAt: now,
          ...(!status || status === "pending" ? { status: "approved", approvedAt: now } : {}),
        });
      }
      tx.set(userRef, { onboardingComplete: true, updatedAt: now }, { merge: true });
      tx.set(memberRef, { onboardingComplete: true, updatedAt: now }, { merge: true });
      tx.set(organizationRef.collection("activity").doc(), {
        type: "onboarding_complete", message: "Organization setup completed. Directory review is managed separately.", timestamp: now,
      });
    });

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

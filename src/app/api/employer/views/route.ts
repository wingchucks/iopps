import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRequiredAppCheckFromRequest } from "@/lib/server/app-check";

// View counts feed employer dashboards. Only attested browsers may record a
// profile view, only for an existing organization, and no caller-supplied
// fields are stored.
function isOrganizationId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128
    && !value.includes("/") && value !== "." && value !== ".." && !/^__.*__$/.test(value);
}

export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  if (!await verifyRequiredAppCheckFromRequest(req)) {
    return NextResponse.json({ error: "Security check failed" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  }
  const { orgId, type } = body as { orgId?: unknown; type?: unknown };
  if (!isOrganizationId(orgId) || type !== "profile") {
    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  }

  try {
    const orgRef = adminDb.collection("organizations").doc(orgId);
    // Legacy directory profiles may exist only as employer records.
    const [organization, employer] = await Promise.all([
      orgRef.get(),
      adminDb.collection("employers").doc(orgId).get(),
    ]);
    if (!organization.exists && !employer.exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const batch = adminDb.batch();
    batch.set(orgRef.collection("views").doc(), {
      type: "profile",
      timestamp: FieldValue.serverTimestamp(),
    });
    batch.set(orgRef.collection("activity").doc(), {
      type: "profile_view",
      message: "Someone viewed your organization profile",
      timestamp: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[employer/views]", err instanceof Error ? err.name : "Error");
    return NextResponse.json({ error: "View could not be recorded" }, { status: 500 });
  }
}

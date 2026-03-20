import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { orgId, type, jobId, province } = body;

    if (!orgId || !type) {
      return NextResponse.json({ error: "Missing orgId or type" }, { status: 400 });
    }

    if (type !== "profile" && type !== "job") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Log view to subcollection
    const viewData: Record<string, unknown> = {
      type,
      timestamp: FieldValue.serverTimestamp(),
    };
    if (jobId) viewData.jobId = jobId;
    if (province) viewData.province = province;

    await adminDb
      .collection("organizations")
      .doc(orgId)
      .collection("views")
      .add(viewData);

    // Also log activity for profile views
    if (type === "profile") {
      await adminDb
        .collection("organizations")
        .doc(orgId)
        .collection("activity")
        .add({
          type: "profile_view",
          message: "Someone viewed your organization profile",
          timestamp: FieldValue.serverTimestamp(),
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[employer/views]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

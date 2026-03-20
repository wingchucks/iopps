import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Resolve org ID
    const memberDoc = await adminDb.collection("members").doc(uid).get();
    const memberOrgId = memberDoc.exists ? memberDoc.data()?.orgId : null;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const orgId = memberOrgId || userData?.employerId;

    if (!orgId) {
      return NextResponse.json({ error: "Not an employer" }, { status: 403 });
    }

    // Get recent activity from subcollection
    const activitySnap = await adminDb
      .collection("organizations")
      .doc(orgId)
      .collection("activity")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const activity = activitySnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ activity });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[employer/activity]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

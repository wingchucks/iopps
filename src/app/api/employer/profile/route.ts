import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req: NextRequest) {
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

    const body = await req.json();

    // Allowed fields to update
    const allowedFields = [
      "name", "tagline", "description", "location", "website",
      "contactEmail", "phone", "hours", "gallery",
      "indigenousGroups", "nation", "treatyTerritory",
      "tags", "services", "socialLinks",
      "logoUrl", "bannerUrl",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection("organizations").doc(orgId).update(updates);

    // Log activity
    await adminDb
      .collection("organizations")
      .doc(orgId)
      .collection("activity")
      .add({
        type: "profile_update",
        message: `Profile updated: ${Object.keys(updates).filter(k => k !== "updatedAt").join(", ")}`,
        timestamp: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[employer/profile]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

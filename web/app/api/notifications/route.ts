import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/notifications — list notifications for a user
export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-uid");
  if (!uid || !adminDb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
  const snap = await adminDb
    .collection("notifications")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(Math.min(limitParam, 100))
    .get();

  const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json(notifications);
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  const uid = req.headers.get("x-user-uid");
  if (!uid || !adminDb) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, all } = await req.json();

  if (all) {
    // Mark all as read
    const snap = await adminDb
      .collection("notifications")
      .where("uid", "==", uid)
      .where("read", "==", false)
      .get();
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
    return NextResponse.json({ updated: snap.size });
  }

  if (id) {
    // Mark single as read
    const ref = adminDb.collection("notifications").doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.uid !== uid) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await ref.update({ read: true });
    return NextResponse.json({ updated: 1 });
  }

  return NextResponse.json({ error: "id or all required" }, { status: 400 });
}

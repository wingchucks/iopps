import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/notifications — last 20 unread notifications
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const snap = await adminDb
      .collection("adminNotifications")
      .where("read", "==", false)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const notifications = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()
        ? doc.data().createdAt.toDate().toISOString()
        : doc.data().createdAt || "",
    }));

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("Failed to fetch admin notifications:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/notifications — mark read
// Body: { id: string } to mark one, or { markAll: true } to mark all
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    if (body.markAll) {
      // Mark all unread as read
      const snap = await adminDb
        .collection("adminNotifications")
        .where("read", "==", false)
        .get();

      const batch = adminDb.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();

      return NextResponse.json({ success: true, updated: snap.size });
    }

    if (body.id && typeof body.id === "string") {
      // Mark single notification as read
      const docRef = adminDb.collection("adminNotifications").doc(body.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }

      await docRef.update({ read: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Provide { id } or { markAll: true }" },
      { status: 400 },
    );
  } catch (err) {
    console.error("Failed to update notification:", err);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}

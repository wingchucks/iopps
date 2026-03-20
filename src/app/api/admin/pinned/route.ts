import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const PINNABLE_COLLECTIONS = ["jobs", "conferences", "scholarships"] as const;

// ---------------------------------------------------------------------------
// GET /api/admin/pinned
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const pinned: Record<string, unknown>[] = [];
    const featured: Record<string, unknown>[] = [];

    for (const collection of PINNABLE_COLLECTIONS) {
      const pinnedSnap = await adminDb.collection(collection).where("pinned", "==", true).get();
      pinnedSnap.docs.forEach((doc) => {
        pinned.push({ id: doc.id, collection, ...doc.data() });
      });

      const featuredSnap = await adminDb.collection(collection).where("featured", "==", true).get();
      featuredSnap.docs.forEach((doc) => {
        if (!doc.data().pinned) {
          featured.push({ id: doc.id, collection, ...doc.data() });
        }
      });
    }

    return NextResponse.json({ pinned, featured });
  } catch (err) {
    console.error("Error fetching pinned items:", err);
    return NextResponse.json({ error: "Failed to fetch pinned items" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/pinned
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { itemId, collection, action, autoUnpinAt } = body;

    if (!itemId || !collection || !action) {
      return NextResponse.json({ error: "itemId, collection, and action are required" }, { status: 400 });
    }

    if (!PINNABLE_COLLECTIONS.includes(collection)) {
      return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
    }

    const ref = adminDb.collection(collection).doc(itemId);

    if (action === "pin") {
      // Check max 5 pinned
      let totalPinned = 0;
      for (const col of PINNABLE_COLLECTIONS) {
        const snap = await adminDb.collection(col).where("pinned", "==", true).count().get();
        totalPinned += snap.data().count;
      }
      if (totalPinned >= 5) {
        return NextResponse.json({ error: "Maximum 5 pinned items allowed" }, { status: 400 });
      }

      await ref.update({
        pinned: true,
        pinnedAt: new Date().toISOString(),
        autoUnpinAt: autoUnpinAt || null,
        pinnedBy: auth.decodedToken.uid,
      });
    } else if (action === "unpin") {
      await ref.update({ pinned: false, pinnedAt: null, autoUnpinAt: null, pinnedBy: null });
    } else if (action === "feature") {
      await ref.update({ featured: true, featuredAt: new Date().toISOString() });
    } else if (action === "unfeature") {
      await ref.update({ featured: false, featuredAt: null });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating pinned item:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConferenceAction = "create" | "update" | "delete" | "feature" | "unfeature" | "activate" | "deactivate";

interface ConferenceBody {
  action: ConferenceAction;
  conferenceId?: string;
  title?: string;
  description?: string;
  date?: string;
  dates?: string;
  location?: string;
  organizer?: string;
  price?: string;
  status?: string;
  featured?: boolean;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// GET /api/admin/conferences
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
    const snapshot = await adminDb
      .collection("conferences")
      .orderBy("order", "asc")
      .limit(200)
      .get();

    const conferences = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ conferences });
  } catch (error) {
    console.error("[GET /api/admin/conferences] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conferences" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/conferences
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as ConferenceBody;
    const validActions: ReadonlySet<string> = new Set([
      "create",
      "update",
      "delete",
      "feature",
      "unfeature",
      "activate",
      "deactivate",
    ]);

    if (!body.action || !validActions.has(body.action)) {
      return NextResponse.json(
        { error: "action must be one of: create, update, delete, feature, unfeature, activate, deactivate" },
        { status: 400 },
      );
    }

    // ---- CREATE ----
    if (body.action === "create") {
      if (!body.title || typeof body.title !== "string") {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 },
        );
      }

      const slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const docRef = await adminDb.collection("conferences").add({
        title: body.title,
        slug,
        description: body.description || "",
        date: body.date || "",
        dates: body.dates || "",
        location: body.location || "",
        organizer: body.organizer || "",
        price: body.price || "",
        status: body.status || "active",
        active: body.active ?? true,
        featured: body.featured ?? false,
        order: 999,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, conferenceId: docRef.id });
    }

    // All other actions require conferenceId
    if (!body.conferenceId || typeof body.conferenceId !== "string") {
      return NextResponse.json(
        { error: "conferenceId is required" },
        { status: 400 },
      );
    }

    const docRef = adminDb.collection("conferences").doc(body.conferenceId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Conference not found" },
        { status: 404 },
      );
    }

    // ---- UPDATE ----
    if (body.action === "update") {
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (body.title !== undefined) {
        updates.title = body.title;
        updates.slug = body.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      if (body.description !== undefined) updates.description = body.description;
      if (body.date !== undefined) updates.date = body.date;
      if (body.dates !== undefined) updates.dates = body.dates;
      if (body.location !== undefined) updates.location = body.location;
      if (body.organizer !== undefined) updates.organizer = body.organizer;
      if (body.price !== undefined) updates.price = body.price;
      if (body.status !== undefined) updates.status = body.status;
      if (body.active !== undefined) updates.active = body.active;
      if (body.featured !== undefined) updates.featured = body.featured;

      await docRef.update(updates);

      return NextResponse.json({ success: true, conferenceId: body.conferenceId, action: "update" });
    }

    // ---- DELETE ----
    if (body.action === "delete") {
      await docRef.delete();
      return NextResponse.json({ success: true, conferenceId: body.conferenceId, action: "delete" });
    }

    // ---- FEATURE / UNFEATURE ----
    if (body.action === "feature") {
      await docRef.update({ featured: true, updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, conferenceId: body.conferenceId, action: "feature" });
    }

    if (body.action === "unfeature") {
      await docRef.update({ featured: false, updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, conferenceId: body.conferenceId, action: "unfeature" });
    }

    // ---- ACTIVATE / DEACTIVATE ----
    if (body.action === "activate") {
      await docRef.update({ active: true, status: "active", updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, conferenceId: body.conferenceId, action: "activate" });
    }

    if (body.action === "deactivate") {
      await docRef.update({ active: false, status: "inactive", updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, conferenceId: body.conferenceId, action: "deactivate" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/conferences] Error:", error);
    return NextResponse.json(
      { error: "Failed to process conference action" },
      { status: 500 },
    );
  }
}

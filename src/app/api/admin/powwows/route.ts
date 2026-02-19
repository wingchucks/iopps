import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PowWowAction = "create" | "update" | "delete" | "feature" | "unfeature";

interface PowWowBody {
  action: PowWowAction;
  powwowId?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  status?: string;
  featured?: boolean;
}

// ---------------------------------------------------------------------------
// GET /api/admin/powwows
// ---------------------------------------------------------------------------

/**
 * List all pow wows ordered by date descending.
 */
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
      .collection("powwows")
      .orderBy("startDate", "desc")
      .limit(200)
      .get();

    const powwows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ powwows });
  } catch (error) {
    console.error("[GET /api/admin/powwows] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pow wows" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/powwows
// ---------------------------------------------------------------------------

/**
 * CRUD actions for pow wows.
 *
 * Body:
 *   action    - "create" | "update" | "delete" | "feature" | "unfeature"
 *   powwowId  - required for update / delete / feature / unfeature
 *   name, startDate, endDate, location, description, status - for create/update
 */
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
    const body = (await request.json()) as PowWowBody;
    const validActions: ReadonlySet<string> = new Set([
      "create",
      "update",
      "delete",
      "feature",
      "unfeature",
    ]);

    if (!body.action || !validActions.has(body.action)) {
      return NextResponse.json(
        { error: "action must be one of: create, update, delete, feature, unfeature" },
        { status: 400 },
      );
    }

    // ---- CREATE ----
    if (body.action === "create") {
      if (!body.name || typeof body.name !== "string") {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 },
        );
      }

      const docRef = await adminDb.collection("powwows").add({
        name: body.name,
        startDate: body.startDate || "",
        endDate: body.endDate || "",
        location: body.location || "",
        description: body.description || "",
        status: body.status || "upcoming",
        featured: body.featured ?? false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, powwowId: docRef.id });
    }

    // All other actions require powwowId
    if (!body.powwowId || typeof body.powwowId !== "string") {
      return NextResponse.json(
        { error: "powwowId is required" },
        { status: 400 },
      );
    }

    const docRef = adminDb.collection("powwows").doc(body.powwowId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Pow wow not found" },
        { status: 404 },
      );
    }

    // ---- UPDATE ----
    if (body.action === "update") {
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (body.name !== undefined) updates.name = body.name;
      if (body.startDate !== undefined) updates.startDate = body.startDate;
      if (body.endDate !== undefined) updates.endDate = body.endDate;
      if (body.location !== undefined) updates.location = body.location;
      if (body.description !== undefined) updates.description = body.description;
      if (body.status !== undefined) updates.status = body.status;
      if (body.featured !== undefined) updates.featured = body.featured;

      await docRef.update(updates);

      return NextResponse.json({ success: true, powwowId: body.powwowId, action: "update" });
    }

    // ---- DELETE ----
    if (body.action === "delete") {
      await docRef.delete();
      return NextResponse.json({ success: true, powwowId: body.powwowId, action: "delete" });
    }

    // ---- FEATURE ----
    if (body.action === "feature") {
      await docRef.update({
        featured: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, powwowId: body.powwowId, action: "feature" });
    }

    // ---- UNFEATURE ----
    if (body.action === "unfeature") {
      await docRef.update({
        featured: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, powwowId: body.powwowId, action: "unfeature" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/admin/powwows] Error:", error);
    return NextResponse.json(
      { error: "Failed to process pow wow action" },
      { status: 500 },
    );
  }
}

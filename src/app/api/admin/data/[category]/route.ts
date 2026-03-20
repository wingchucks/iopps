import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = [
  "nations",
  "treaties",
  "jobCategories",
  "eventTypes",
  "businessCategories",
  "programCategories",
  "skills",
  "indigenousLanguages",
] as const;

interface RouteParams {
  params: Promise<{ category: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/admin/data/[category]
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { category } = await params;
    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const snap = await adminDb.collection("dataCategories").doc(category).collection("items").orderBy("order", "asc").get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Error fetching data items:", err);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/data/[category]
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { category } = await params;
    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const body = await request.json();
    const { name, order } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const item = {
      name,
      order: order ?? 0,
      createdAt: new Date().toISOString(),
    };

    const ref = await adminDb.collection("dataCategories").doc(category).collection("items").add(item);
    return NextResponse.json({ id: ref.id, ...item }, { status: 201 });
  } catch (err) {
    console.error("Error creating data item:", err);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/data/[category]
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { category } = await params;
    const body = await request.json();
    const { id, name, order } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (order !== undefined) updates.order = order;

    await adminDb.collection("dataCategories").doc(category).collection("items").doc(id).update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating data item:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/data/[category]
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { category } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await adminDb.collection("dataCategories").doc(category).collection("items").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting data item:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

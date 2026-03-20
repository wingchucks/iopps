import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/email/templates
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const snap = await adminDb.collection("emailTemplates").orderBy("createdAt", "desc").get();
    const templates = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Error fetching templates:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/email/templates
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, type, description, htmlContent } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    const template = {
      name,
      type,
      description: description || "",
      htmlContent: htmlContent || "",
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      createdBy: auth.decodedToken.uid,
    };

    const ref = await adminDb.collection("emailTemplates").add(template);
    return NextResponse.json({ id: ref.id, ...template }, { status: 201 });
  } catch (err) {
    console.error("Error creating template:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/admin/email/templates
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, name, type, description, htmlContent } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (htmlContent !== undefined) updates.htmlContent = htmlContent;

    await adminDb.collection("emailTemplates").doc(id).update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating template:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

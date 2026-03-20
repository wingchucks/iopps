import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/admin/email/campaigns/[campaignId]
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { campaignId } = await params;
    const doc = await adminDb.collection("emailCampaigns").doc(campaignId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("Error fetching campaign:", err);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/email/campaigns/[campaignId]
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { campaignId } = await params;
    const body = await request.json();
    const { subject, audience, body: emailBody, templateId, scheduledAt, status } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (subject !== undefined) updates.subject = subject;
    if (audience !== undefined) updates.audience = audience;
    if (emailBody !== undefined) updates.body = emailBody;
    if (templateId !== undefined) updates.templateId = templateId;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt;
    if (status !== undefined) updates.status = status;

    await adminDb.collection("emailCampaigns").doc(campaignId).update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating campaign:", err);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/email/campaigns/[campaignId]
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { campaignId } = await params;
    const doc = await adminDb.collection("emailCampaigns").doc(campaignId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const data = doc.data();
    if (data?.status === "sent") {
      return NextResponse.json({ error: "Cannot delete a sent campaign" }, { status: 400 });
    }

    await adminDb.collection("emailCampaigns").doc(campaignId).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting campaign:", err);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}

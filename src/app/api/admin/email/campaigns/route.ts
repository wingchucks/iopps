import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/admin/email/campaigns
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = adminDb.collection("emailCampaigns").orderBy("createdAt", "desc");
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const snap = await query.limit(100).get();
    const campaigns = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Get subscriber count
    const subscribersSnap = await adminDb.collection("users").where("emailOptIn", "==", true).count().get();
    const subscriberCount = subscribersSnap.data().count;

    return NextResponse.json({ campaigns, subscriberCount });
  } catch (err) {
    console.error("Error fetching campaigns:", err);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/email/campaigns
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { subject, audience, body: emailBody, templateId, scheduledAt, status } = body;

    if (!subject || !audience) {
      return NextResponse.json({ error: "Subject and audience are required" }, { status: 400 });
    }

    const campaign = {
      subject,
      audience,
      body: emailBody || "",
      templateId: templateId || null,
      status: status || "draft",
      scheduledAt: scheduledAt || null,
      sentAt: null,
      createdAt: new Date().toISOString(),
      createdBy: auth.decodedToken.uid,
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
    };

    const ref = await adminDb.collection("emailCampaigns").add(campaign);
    return NextResponse.json({ id: ref.id, ...campaign }, { status: 201 });
  } catch (err) {
    console.error("Error creating campaign:", err);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

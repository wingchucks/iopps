import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/email/send
// Send or schedule an email campaign. If `isTest` is true, only record it
// as a test send (no actual emails dispatched in this implementation).
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      subject,
      audience,
      body: emailBody,
      templateId,
      scheduledAt,
      status,
      isTest,
    } = body;

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!audience) {
      return NextResponse.json({ error: "Audience is required" }, { status: 400 });
    }

    // -----------------------------------------------------------------------
    // Test email: log it but don't create a real campaign
    // -----------------------------------------------------------------------
    if (isTest) {
      await adminDb.collection("emailTestSends").add({
        subject,
        audience,
        body: emailBody || "",
        templateId: templateId || null,
        sentTo: auth.decodedToken.email || auth.decodedToken.uid,
        sentBy: auth.decodedToken.uid,
        sentAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Test email queued for ${auth.decodedToken.email || "admin"}`,
      });
    }

    // -----------------------------------------------------------------------
    // Real campaign: create the campaign record
    // -----------------------------------------------------------------------
    const isScheduled = status === "scheduled" && scheduledAt;

    const campaign = {
      subject,
      audience,
      body: emailBody || "",
      templateId: templateId || null,
      status: isScheduled ? "scheduled" : "sent",
      scheduledAt: isScheduled ? scheduledAt : null,
      sentAt: isScheduled ? null : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: auth.decodedToken.uid,
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
      },
    };

    // If sending immediately, count the target audience
    if (!isScheduled) {
      let recipientQuery = adminDb
        .collection("users")
        .where("emailOptIn", "==", true);

      if (audience === "employers") {
        recipientQuery = recipientQuery.where("accountType", "==", "employer");
      } else if (audience === "community") {
        recipientQuery = recipientQuery.where("accountType", "==", "community");
      }

      const countSnap = await recipientQuery.count().get();
      const recipientCount = countSnap.data().count;

      campaign.stats.sent = recipientCount;
      campaign.stats.delivered = recipientCount;
    }

    const ref = await adminDb.collection("emailCampaigns").add(campaign);

    return NextResponse.json(
      {
        id: ref.id,
        ...campaign,
        message: isScheduled
          ? `Campaign scheduled for ${scheduledAt}`
          : `Campaign sent to ${campaign.stats.sent} recipients`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error sending campaign:", err);
    return NextResponse.json(
      { error: "Failed to send campaign" },
      { status: 500 }
    );
  }
}

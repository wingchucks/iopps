import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";
import { Resend } from "resend";
import { wrapEmail, emailHeader, escapeHtml, getUnsubscribeUrl } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

interface CampaignRequest {
  subject: string;
  previewText?: string;
  content: string;
  recipientFilter: "all" | "job_seekers" | "employers" | "digest_subscribers";
  testMode?: boolean;
  testEmail?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify admin role
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Parse request body
    const body: CampaignRequest = await request.json();
    const { subject, previewText, content, recipientFilter, testMode, testEmail } = body;

    // Validate required fields
    if (!subject || !content) {
      return NextResponse.json({ error: "Subject and content are required" }, { status: 400 });
    }

    // Check Resend API key
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Test mode - send to single email
    if (testMode && testEmail) {
      const htmlContent = buildCampaignHtml(subject, content, "test-user", testEmail);
      const textContent = buildCampaignText(subject, content);

      const { error } = await resend.emails.send({
        from: "IOPPS <campaigns@iopps.ca>",
        to: [testEmail],
        subject: `[TEST] ${subject}`,
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        return NextResponse.json({ error: `Failed to send test email: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        testMode: true,
        message: `Test email sent to ${testEmail}`,
      });
    }

    // Get recipients based on filter
    const recipients = await getRecipients(recipientFilter);

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No recipients found for selected filter",
      }, { status: 400 });
    }

    // Create campaign record
    const campaignRef = await db.collection("emailCampaigns").add({
      subject,
      previewText: previewText || "",
      content,
      recipientFilter,
      recipientCount: recipients.length,
      sentBy: userId,
      status: "sending",
      createdAt: new Date(),
      sentCount: 0,
      failedCount: 0,
    });

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        const htmlContent = buildCampaignHtml(subject, content, recipient.userId, recipient.email);
        const textContent = buildCampaignText(subject, content);

        const { error } = await resend.emails.send({
          from: "IOPPS <campaigns@iopps.ca>",
          to: [recipient.email],
          subject,
          html: htmlContent,
          text: textContent,
        });

        // Log the email
        await db.collection("emailLogs").add({
          userId: recipient.userId,
          userEmail: recipient.email,
          campaignType: "custom-campaign",
          campaignId: campaignRef.id,
          subject,
          status: error ? "failed" : "sent",
          error: error?.message || null,
          sentAt: new Date(),
        });

        if (error) {
          console.error(`Failed to send to ${recipient.email}:`, error);
          failedCount++;
        } else {
          sentCount++;
        }
      } catch (err) {
        console.error(`Error sending to ${recipient.email}:`, err);
        failedCount++;
      }
    }

    // Update campaign record
    await campaignRef.update({
      status: "completed",
      completedAt: new Date(),
      sentCount,
      failedCount,
    });

    return NextResponse.json({
      success: true,
      campaignId: campaignRef.id,
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      message: `Campaign sent to ${sentCount} recipients (${failedCount} failed)`,
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json(
      { error: "Failed to send campaign" },
      { status: 500 }
    );
  }
}

// Get campaign history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get recent campaigns
    const campaignsSnap = await db
      .collection("emailCampaigns")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const campaigns = campaignsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString(),
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

async function getRecipients(filter: string): Promise<{ userId: string; email: string }[]> {
  if (!db) return [];

  const recipients: { userId: string; email: string }[] = [];

  try {
    switch (filter) {
      case "all": {
        // Get all users with email preferences who haven't unsubscribed
        const prefsSnap = await db
          .collection("emailPreferences")
          .where("unsubscribedAll", "==", false)
          .get();

        const userIds = prefsSnap.docs.map((doc) => doc.id);

        for (const userId of userIds) {
          const userDoc = await db.collection("users").doc(userId).get();
          const email = userDoc.data()?.email;
          if (email) {
            recipients.push({ userId, email });
          }
        }
        break;
      }

      case "job_seekers": {
        // Get community members who have job alerts enabled
        const prefsSnap = await db
          .collection("emailPreferences")
          .where("unsubscribedAll", "==", false)
          .where("jobAlertsEnabled", "==", true)
          .get();

        const userIds = prefsSnap.docs.map((doc) => doc.id);

        for (const userId of userIds) {
          const userDoc = await db.collection("users").doc(userId).get();
          const userData = userDoc.data();
          if (userData?.email && userData?.role === "community") {
            recipients.push({ userId, email: userData.email });
          }
        }
        break;
      }

      case "employers": {
        // Get all approved employers
        const employersSnap = await db
          .collection("employers")
          .where("status", "==", "approved")
          .get();

        for (const doc of employersSnap.docs) {
          const email = doc.data().email;
          if (email) {
            recipients.push({ userId: doc.id, email });
          }
        }
        break;
      }

      case "digest_subscribers": {
        // Get users subscribed to weekly digest
        const prefsSnap = await db
          .collection("emailPreferences")
          .where("unsubscribedAll", "==", false)
          .where("weeklyDigest", "==", true)
          .get();

        const userIds = prefsSnap.docs.map((doc) => doc.id);

        for (const userId of userIds) {
          const userDoc = await db.collection("users").doc(userId).get();
          const email = userDoc.data()?.email;
          if (email) {
            recipients.push({ userId, email });
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error fetching recipients:", error);
  }

  return recipients;
}

function buildCampaignHtml(subject: string, content: string, userId: string, email: string): string {
  const unsubscribeUrl = getUnsubscribeUrl(userId, email, "campaign");

  // Convert markdown-like content to HTML
  const htmlContent = content
    .split("\n\n")
    .map((paragraph) => {
      if (paragraph.startsWith("# ")) {
        return `<h1 style="margin: 24px 0 16px; font-size: 24px; color: #f1f5f9;">${escapeHtml(paragraph.slice(2))}</h1>`;
      }
      if (paragraph.startsWith("## ")) {
        return `<h2 style="margin: 20px 0 12px; font-size: 20px; color: #f1f5f9;">${escapeHtml(paragraph.slice(3))}</h2>`;
      }
      if (paragraph.startsWith("- ")) {
        const items = paragraph.split("\n").map((line) =>
          `<li style="margin: 4px 0; color: #cbd5e1;">${escapeHtml(line.slice(2))}</li>`
        ).join("");
        return `<ul style="margin: 16px 0; padding-left: 24px;">${items}</ul>`;
      }
      return `<p style="margin: 16px 0; color: #cbd5e1; line-height: 1.6;">${escapeHtml(paragraph)}</p>`;
    })
    .join("");

  return wrapEmail(
    `${emailHeader(subject)}
    <tr>
      <td style="padding: 24px;">
        ${htmlContent}
      </td>
    </tr>`,
    unsubscribeUrl
  );
}

function buildCampaignText(subject: string, content: string): string {
  return `${subject}\n\n${content}\n\n---\nIOPPS - Indigenous Opportunities Platform\nManage preferences: ${process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca"}/member/email-preferences`;
}

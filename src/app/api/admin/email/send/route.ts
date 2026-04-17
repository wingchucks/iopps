import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdminToken } from "@/lib/api-auth";
import { Resend } from "resend";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for large sends

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "IOPPS <notifications@iopps.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";

const SEND_COOLDOWN_MS = 60_000;

function generateUnsubToken(uid: string): string {
  return createHmac("sha256", process.env.CRON_SECRET || "").update(uid).digest("hex").substring(0, 32);
}

function personalizeHtml(html: string, uid: string): string {
  const token = generateUnsubToken(uid);
  const unsubUrl = `${SITE_URL}/api/unsubscribe?uid=${uid}&token=${token}`;
  return html.replace(/UNSUBSCRIBE_URL/g, unsubUrl);
}

async function enforceAdminSendCooldown(uid: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const db = getAdminDb();
  const ref = db.collection("emailSendCooldowns").doc(uid);
  const now = Date.now();
  const snap = await ref.get();
  const lastSent = snap.exists ? Number(snap.data()?.lastSentAt ?? 0) : 0;
  const elapsed = now - lastSent;
  if (lastSent && elapsed < SEND_COOLDOWN_MS) {
    return { ok: false, retryAfterSec: Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000) };
  }
  await ref.set({ lastSentAt: now }, { merge: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Email HTML builder
// ---------------------------------------------------------------------------
function buildNewsletterHtml(body: string, subject: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="background:linear-gradient(135deg,#0F2B4C,#0D9488);padding:32px 24px;text-align:center;border-radius:16px 16px 0 0;">
      <img src="https://www.iopps.ca/logo.png" alt="IOPPS" style="height:48px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;" /><h1 style="color:#fff;font-weight:900;font-size:28px;letter-spacing:3px;margin:0;">IOPPS</h1>
      <p style="color:rgba(255,255,255,.6);font-size:12px;margin:4px 0 0;letter-spacing:1px;">EMPOWERING INDIGENOUS SUCCESS</p>
    </div>
    <div style="padding:32px 24px;background:#ffffff;">
      <h2 style="color:#0F2B4C;font-size:22px;font-weight:800;margin:0 0 16px;">${subject}</h2>
      <div style="color:#374151;font-size:15px;line-height:1.7;">
        ${body}
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${SITE_URL}/feed" style="display:inline-block;padding:14px 28px;background:#0D9488;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
          Explore IOPPS
        </a>
      </div>
    </div>
    <div style="padding:24px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${year} IOPPS.ca &mdash; Indigenous Opportunities, Partnerships, Programs &amp; Services</p>
      <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;">
        <a href="UNSUBSCRIBE_URL" style="color:#0D9488;text-decoration:none;">Unsubscribe</a> &middot;
        <a href="${SITE_URL}" style="color:#0D9488;text-decoration:none;">iopps.ca</a>
      </p>
    </div>
  </div>
</body></html>`;
}

// ---------------------------------------------------------------------------
// POST /api/admin/email/send
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return authResult.response;
  const admin = authResult.decodedToken;

  const db = getAdminDb();

  try {
    const payload = await request.json();
    const {
      subject,
      audience,
      body: emailBody,
      scheduledAt,
      status,
      isTest,
      testEmail,
    } = payload;

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!audience) {
      return NextResponse.json({ error: "Audience is required" }, { status: 400 });
    }

    const html = buildNewsletterHtml(emailBody || "", subject);

    // -------------------------------------------------------------------
    // TEST SEND - send to admin's own email only
    // -------------------------------------------------------------------
    if (isTest) {
      if (!resend) {
        return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
      }

      const toEmail = testEmail || admin.email;
      if (!toEmail) {
        return NextResponse.json({ error: "No test email available" }, { status: 400 });
      }

      const cooldown = await enforceAdminSendCooldown(admin.uid);
      if (!cooldown.ok) {
        return NextResponse.json(
          { error: `Too many sends. Try again in ${cooldown.retryAfterSec}s.` },
          { status: 429, headers: { "Retry-After": String(cooldown.retryAfterSec) } },
        );
      }

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: toEmail,
          subject: `[TEST] ${subject}`,
          html,
        });
      } catch (err) {
        console.error("[newsletter] Test send failed:", err);
        return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
      }

      await db.collection("emailTestSends").add({
        subject,
        audience,
        body: emailBody || "",
        sentTo: toEmail,
        sentBy: admin.uid,
        sentAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent to ${toEmail}`,
      });
    }

    // -------------------------------------------------------------------
    // SCHEDULED - save for later
    // -------------------------------------------------------------------
    if (status === "scheduled" && scheduledAt) {
      const campaign = {
        subject,
        audience,
        body: emailBody || "",
        html,
        status: "scheduled" as const,
        scheduledAt,
        sentAt: null as string | null,
        createdAt: new Date().toISOString(),
        createdBy: admin.uid,
        stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
      };
      const ref = await db.collection("emailCampaigns").add(campaign);
      return NextResponse.json({ id: ref.id, ...campaign, message: `Campaign scheduled for ${scheduledAt}` }, { status: 201 });
    }

    // -------------------------------------------------------------------
    // SEND NOW - fetch recipients, batch send via Resend
    // -------------------------------------------------------------------
    if (!resend) {
      return NextResponse.json({ error: "Resend not configured (RESEND_API_KEY missing)" }, { status: 500 });
    }

    const cooldown = await enforceAdminSendCooldown(admin.uid);
    if (!cooldown.ok) {
      return NextResponse.json(
        { error: `Too many sends. Try again in ${cooldown.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(cooldown.retryAfterSec) } },
      );
    }

    // Build recipient query
    let query: FirebaseFirestore.Query = db.collection("users").where("newsletterOptIn", "==", true);

    if (audience === "employers") {
      query = query.where("role", "==", "employer");
    } else if (audience === "community") {
      query = query.where("role", "==", "community");
    }

    const snap = await query.get();
    const recipients: { email: string; uid: string }[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.email && typeof data.email === "string") {
        recipients.push({ email: data.email, uid: doc.id });
      }
    });

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No subscribers found for this audience" }, { status: 400 });
    }

    // Create campaign record first
    const campaignData = {
      subject,
      audience,
      body: emailBody || "",
      status: "sending",
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: admin.uid,
      recipientCount: recipients.length,
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 },
    };
    const campaignRef = await db.collection("emailCampaigns").add(campaignData);

    // Send in batches of 50 (Resend batch limit is 100)
    const BATCH_SIZE = 50;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE) as { email: string; uid: string }[];

      const batchPayload = batch.map(({ email, uid }) => ({
        from: FROM_EMAIL,
        to: email,
        subject,
        html: personalizeHtml(html, uid),
      }));

      try {
        await resend.batch.send(batchPayload);
        totalSent += batch.length;
      } catch (err) {
        console.error(`[newsletter] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err);
        totalFailed += batch.length;
      }

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Update campaign with final stats
    await campaignRef.update({
      status: "sent",
      "stats.sent": totalSent,
      "stats.delivered": totalSent,
      ...(totalFailed > 0 ? { "stats.bounced": totalFailed } : {}),
    });

    return NextResponse.json({
      id: campaignRef.id,
      success: true,
      message: `Newsletter sent to ${totalSent} of ${recipients.length} subscribers`,
      stats: {
        total: recipients.length,
        sent: totalSent,
        failed: totalFailed,
      },
    }, { status: 201 });

  } catch (err) {
    console.error("[newsletter] Send error:", err);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
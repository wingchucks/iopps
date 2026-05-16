import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = "IOPPS Updates <notifications@iopps.ca>";
const REPLY_TO_EMAIL = "Nathan Arias <nathan.arias@iopps.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";

function generateUnsubToken(uid: string): string {
  return createHmac("sha256", process.env.CRON_SECRET || "").update(uid).digest("hex").substring(0, 32);
}

function personalizeHtml(html: string, uid: string): string {
  const token = generateUnsubToken(uid);
  const unsubUrl = `${SITE_URL}/api/unsubscribe?uid=${uid}&token=${token}`;
  return html.replace(/UNSUBSCRIBE_URL/g, unsubUrl);
}

function unsubscribeUrl(uid: string): string {
  const token = generateUnsubToken(uid);
  return `${SITE_URL}/api/unsubscribe?uid=${encodeURIComponent(uid)}&token=${token}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "-")
    .replace(/&middot;/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function campaignHeaders(campaignId: string, uid: string): Record<string, string> {
  const unsubUrl = unsubscribeUrl(uid);
  return {
    "List-Unsubscribe": `<${unsubUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": `campaign-${campaignId}-${uid}`,
  };
}

function buildHtml(body: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="background:linear-gradient(135deg,#0F2B4C,#0D9488);padding:32px 24px;text-align:center;border-radius:16px 16px 0 0;">
      <img src="https://www.iopps.ca/logo.png" alt="IOPPS" style="height:48px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;" /><h1 style="color:#fff;font-weight:900;font-size:28px;letter-spacing:3px;margin:0;">IOPPS</h1>
      <p style="color:rgba(255,255,255,.6);font-size:12px;margin:4px 0 0;letter-spacing:1px;">EMPOWERING INDIGENOUS SUCCESS</p>
    </div>
    <div style="padding:32px 24px;background:#ffffff;">
      ${body}
    </div>
    <div style="padding:24px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${year} IOPPS.ca &mdash; Indigenous Opportunities, Partnerships, Programs &amp; Services</p>
      <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;"><a href="UNSUBSCRIBE_URL" style="color:#0D9488;text-decoration:none;">Unsubscribe</a> &middot; <a href="${SITE_URL}" style="color:#0D9488;text-decoration:none;">iopps.ca</a></p>
    </div>
  </div>
</body></html>`;
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resend) return NextResponse.json({ error: "Resend not configured" }, { status: 500 });

  const db = getAdminDb();
  const now = new Date().toISOString();

  // Find campaigns due to send
  const snap = await db.collection("emailCampaigns")
    .where("status", "==", "scheduled")
    .where("scheduledAt", "<=", now)
    .get();

  if (snap.empty) return NextResponse.json({ message: "No campaigns due", sent: 0 });

  let totalSent = 0;

  for (const doc of snap.docs) {
    const campaign = doc.data();
    const { subject, audience, body: emailBody } = campaign;

    // Build recipients
    let query: FirebaseFirestore.Query = db.collection("users").where("newsletterOptIn", "==", true);
    if (audience === "employers") query = query.where("role", "==", "employer");
    else if (audience === "community") query = query.where("role", "==", "community");

    const usersSnap = await query.get();
    const recipients: { email: string; uid: string }[] = [];
    usersSnap.forEach(u => { const d = u.data(); if (d.email) recipients.push({ email: d.email, uid: u.id }); });

    if (recipients.length === 0) {
      await doc.ref.update({ status: "sent", sentAt: now, "stats.sent": 0 });
      continue;
    }

    const html = buildHtml(emailBody || "");
    const BATCH_SIZE = 50;
    let sent = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE).map(({ email, uid }) => ({
        from: FROM_EMAIL,
        to: email,
        replyTo: REPLY_TO_EMAIL,
        subject,
        html: personalizeHtml(html, uid),
        text: htmlToText(personalizeHtml(html, uid)),
        headers: campaignHeaders(doc.id, uid),
      }));
      try { await resend.batch.send(batch); sent += batch.length; } catch { /* continue */ }
      if (i + BATCH_SIZE < recipients.length) await new Promise(r => setTimeout(r, 500));
    }

    await doc.ref.update({ status: "sent", sentAt: now, "stats.sent": sent, "stats.delivered": sent, recipientCount: recipients.length });
    totalSent += sent;
  }

  return NextResponse.json({ message: `Sent ${snap.size} campaign(s) to ${totalSent} subscribers`, sent: totalSent });
}

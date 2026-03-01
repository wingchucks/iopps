import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = "IOPPS <notifications@iopps.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";

function buildHtml(body: string, subject: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="background:linear-gradient(135deg,#0F2B4C,#0D9488);padding:32px 24px;text-align:center;border-radius:16px 16px 0 0;">
      <h1 style="color:#fff;font-weight:900;font-size:28px;letter-spacing:3px;margin:0;">IOPPS</h1>
      <p style="color:rgba(255,255,255,.6);font-size:12px;margin:4px 0 0;letter-spacing:1px;">EMPOWERING INDIGENOUS SUCCESS</p>
    </div>
    <div style="padding:32px 24px;background:#ffffff;">
      ${body}
    </div>
    <div style="padding:24px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">&copy; ${year} IOPPS.ca &mdash; Indigenous Opportunities, Partnerships, Programs &amp; Services</p>
      <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;"><a href="${SITE_URL}/settings/notifications" style="color:#0D9488;text-decoration:none;">Unsubscribe</a> &middot; <a href="${SITE_URL}" style="color:#0D9488;text-decoration:none;">iopps.ca</a></p>
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
    const recipients: string[] = [];
    usersSnap.forEach(u => { const d = u.data(); if (d.email) recipients.push(d.email); });

    if (recipients.length === 0) {
      await doc.ref.update({ status: "sent", sentAt: now, "stats.sent": 0 });
      continue;
    }

    const html = buildHtml(emailBody || "", subject);
    const BATCH_SIZE = 50;
    let sent = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE).map(email => ({ from: FROM_EMAIL, to: email, subject, html }));
      try { await resend.batch.send(batch); sent += batch.length; } catch { /* continue */ }
      if (i + BATCH_SIZE < recipients.length) await new Promise(r => setTimeout(r, 500));
    }

    await doc.ref.update({ status: "sent", sentAt: now, "stats.sent": sent, "stats.delivered": sent, recipientCount: recipients.length });
    totalSent += sent;
  }

  return NextResponse.json({ message: `Sent ${snap.size} campaign(s) to ${totalSent} subscribers`, sent: totalSent });
}
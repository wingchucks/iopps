import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "IOPPS <notifications@iopps.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";

// ── Shared styles ──────────────────────────────────────────────
const STYLES = {
  container: "max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;",
  header: "background:linear-gradient(135deg,#0F2B4C,#0D9488);padding:32px 24px;text-align:center;border-radius:16px 16px 0 0;",
  logo: "color:#fff;font-weight:900;font-size:28px;letter-spacing:3px;margin:0;",
  tagline: "color:rgba(255,255,255,.6);font-size:12px;margin:4px 0 0;letter-spacing:1px;",
  body: "padding:32px 24px;background:#ffffff;",
  footer: "padding:24px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;",
  footerText: "color:#9ca3af;font-size:12px;margin:0;",
  button: "display:inline-block;padding:14px 28px;background:#0D9488;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;",
  h2: "color:#0F2B4C;font-size:22px;font-weight:800;margin:0 0 16px;",
  text: "color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;",
  muted: "color:#9ca3af;font-size:13px;",
  divider: "border:none;border-top:1px solid #e5e7eb;margin:24px 0;",
};

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;">
  <div style="${STYLES.container}">
    <div style="${STYLES.header}">
      <h1 style="${STYLES.logo}">IOPPS</h1>
      <p style="${STYLES.tagline}">EMPOWERING INDIGENOUS SUCCESS</p>
    </div>
    <div style="${STYLES.body}">
      ${content}
    </div>
    <div style="${STYLES.footer}">
      <p style="${STYLES.footerText}">© ${new Date().getFullYear()} IOPPS.ca — Indigenous Opportunities, Partnerships, Programs & Services</p>
      <p style="${STYLES.footerText};margin-top:8px">
        <a href="${SITE_URL}" style="color:#0D9488;text-decoration:none;">iopps.ca</a>
      </p>
    </div>
  </div>
</body></html>`;
}

// ── Email Templates ────────────────────────────────────────────

export async function sendApplicationNotification(opts: {
  employerEmail: string;
  employerName: string;
  applicantName: string;
  jobTitle: string;
  jobId: string;
  orgId: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured (RESEND_API_KEY missing)" };

  const html = emailWrapper(`
    <h2 style="${STYLES.h2}">New Application Received! 🎉</h2>
    <p style="${STYLES.text}">
      <strong>${opts.applicantName}</strong> has applied for
      <strong>${opts.jobTitle}</strong> at ${opts.employerName}.
    </p>
    <p style="${STYLES.text}">
      Review their application and respond promptly — great candidates move fast.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${SITE_URL}/org/dashboard/applications" style="${STYLES.button}">
        Review Applications
      </a>
    </div>
    <hr style="${STYLES.divider}">
    <p style="${STYLES.muted}">
      You received this email because someone applied to a job posted on IOPPS.ca.
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.employerEmail,
      subject: `New application: ${opts.applicantName} applied for ${opts.jobTitle}`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Application notification failed:", err);
    return { success: false, error: String(err) };
  }
}

export async function sendEmployerWelcome(opts: {
  email: string;
  contactName: string;
  orgName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured" };

  const html = emailWrapper(`
    <h2 style="${STYLES.h2}">Welcome to IOPPS, ${opts.contactName}! 👋</h2>
    <p style="${STYLES.text}">
      <strong>${opts.orgName}</strong> is now registered on IOPPS.ca — Canada's
      Indigenous careers, events, and community platform.
    </p>
    <p style="${STYLES.text}">Here's what to do next:</p>
    <ol style="${STYLES.text}">
      <li><strong>Complete your profile</strong> — Add your logo, description, and contact info</li>
      <li><strong>Choose a plan</strong> — Start posting jobs and reaching Indigenous talent</li>
      <li><strong>Post your first job</strong> — Get it in front of ${">"}750 community members</li>
    </ol>
    <div style="text-align:center;margin:28px 0;">
      <a href="${SITE_URL}/org/onboarding" style="${STYLES.button}">
        Complete Your Profile
      </a>
    </div>
    <hr style="${STYLES.divider}">
    <p style="${STYLES.muted}">
      Questions? Reply to this email or contact us at hello@iopps.ca
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.email,
      subject: `Welcome to IOPPS — ${opts.orgName} is registered!`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Welcome email failed:", err);
    return { success: false, error: String(err) };
  }
}

export async function sendSubscriptionConfirmation(opts: {
  email: string;
  contactName: string;
  orgName: string;
  planName: string;
  amount: number;
  gst: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured" };

  const total = opts.amount + opts.gst;
  const html = emailWrapper(`
    <h2 style="${STYLES.h2}">Payment Confirmed ✅</h2>
    <p style="${STYLES.text}">
      Thank you, ${opts.contactName}! Your <strong>${opts.planName}</strong> plan
      for <strong>${opts.orgName}</strong> is now active.
    </p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;font-size:14px;color:#374151;">
        <tr><td>Plan</td><td style="text-align:right;font-weight:700">${opts.planName}</td></tr>
        <tr><td>Amount</td><td style="text-align:right">$${opts.amount.toFixed(2)} CAD</td></tr>
        <tr><td>GST (5%)</td><td style="text-align:right">$${opts.gst.toFixed(2)} CAD</td></tr>
        <tr style="border-top:1px solid #e5e7eb"><td style="font-weight:700;padding-top:8px">Total</td><td style="text-align:right;font-weight:700;padding-top:8px">$${total.toFixed(2)} CAD</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${SITE_URL}/org/dashboard" style="${STYLES.button}">
        Go to Dashboard
      </a>
    </div>
    <hr style="${STYLES.divider}">
    <p style="${STYLES.muted}">
      Your plan renews in 12 months. We'll send a reminder before renewal.
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.email,
      subject: `IOPPS Payment Confirmed — ${opts.planName} Plan Active`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Subscription confirmation failed:", err);
    return { success: false, error: String(err) };
  }
}

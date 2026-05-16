import { Resend } from "resend";
import { buildAccountVerificationEmailContent } from "@/lib/auth-verification-email";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "IOPPS Notifications <notifications@iopps.ca>";
const ADMIN_EMAIL = "nathan.arias@iopps.ca";
const REPLY_TO_EMAIL = "Nathan Arias <nathan.arias@iopps.ca>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.iopps.ca";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deliveryHeaders(entityRef: string): Record<string, string> {
  return {
    "Auto-Submitted": "auto-generated",
    "X-Entity-Ref-ID": entityRef,
  };
}

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
  const employerName = escapeHtml(opts.employerName);
  const applicantName = escapeHtml(opts.applicantName);
  const jobTitle = escapeHtml(opts.jobTitle);

  const html = emailWrapper(`
    <h2 style="${STYLES.h2}">New application received</h2>
    <p style="${STYLES.text}">
      <strong>${applicantName}</strong> has applied for
      <strong>${jobTitle}</strong> at ${employerName}.
    </p>
    <p style="${STYLES.text}">
      You can review the application in your IOPPS employer dashboard.
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
  const text = [
    "New application received",
    "",
    `${opts.applicantName} has applied for ${opts.jobTitle} at ${opts.employerName}.`,
    "Review the application in your IOPPS employer dashboard:",
    `${SITE_URL}/org/dashboard/applications`,
    "",
    "You received this email because someone applied to a job posted on IOPPS.ca.",
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.employerEmail,
      replyTo: REPLY_TO_EMAIL,
      subject: `New application for ${opts.jobTitle}`,
      html,
      text,
      headers: deliveryHeaders(`application-${opts.orgId}-${opts.jobId}`),
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
  verificationLink?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured" };
  const contactName = escapeHtml(opts.contactName);
  const orgName = escapeHtml(opts.orgName);

  const confirmationBlock = opts.verificationLink
    ? `
    <div style="background:#ecfdf5;border:1px solid #99f6e4;border-radius:14px;padding:18px;margin:22px 0;">
      <h3 style="color:#0F2B4C;font-size:17px;font-weight:800;margin:0 0 8px;">Confirm your email to activate employer tools</h3>
      <p style="${STYLES.text};margin-bottom:14px;">
        Please confirm this email address so you can finish onboarding, manage your organization, and post public content.
      </p>
      <a href="${opts.verificationLink}" style="${STYLES.button}">Confirm Email</a>
    </div>`
    : "";

  const html = emailWrapper(`
    <h2 style="${STYLES.h2}">Welcome to IOPPS, ${contactName}</h2>
    <p style="${STYLES.text}">
      <strong>${orgName}</strong> is now registered on IOPPS.ca, Canada's
      Indigenous careers, events, and community platform.
    </p>
    ${confirmationBlock}
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
  const text = [
    `Welcome to IOPPS, ${opts.contactName}`,
    "",
    `${opts.orgName} is now registered on IOPPS.ca, Canada's Indigenous careers, events, and community platform.`,
    opts.verificationLink ? `Confirm your email: ${opts.verificationLink}` : "",
    `Complete your profile: ${SITE_URL}/org/onboarding`,
    "",
    "Questions? Reply to this email or contact hello@iopps.ca.",
  ].filter(Boolean).join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.email,
      replyTo: REPLY_TO_EMAIL,
      subject: `Welcome to IOPPS: ${opts.orgName}`,
      html,
      text,
      headers: deliveryHeaders(`employer-welcome-${opts.email}`),
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Welcome email failed:", err);
    return { success: false, error: String(err) };
  }
}

export async function sendAccountVerificationEmail(opts: {
  email: string;
  displayName?: string | null;
  verificationLink: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) return { success: false, error: "Email not configured" };

  const html = emailWrapper(buildAccountVerificationEmailContent({
    displayName: opts.displayName,
    verificationLink: opts.verificationLink,
  }));
  const text = [
    `Confirm your IOPPS account`,
    "",
    opts.displayName ? `Hello ${opts.displayName},` : "Hello,",
    "Please confirm this email address to finish setting up your IOPPS account.",
    opts.verificationLink,
    "",
    "If you did not request this email, you can ignore it.",
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.email,
      replyTo: REPLY_TO_EMAIL,
      subject: "Confirm your IOPPS account",
      html,
      text,
      headers: deliveryHeaders(`account-verification-${opts.email}`),
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Account verification email failed:", err);
    return { success: false, error: String(err) };
  }
}

export async function sendAdminNewSignup(opts: {
  name: string;
  email: string;
  type: "community" | "employer" | "upgrade";
  orgName?: string;
  uid?: string;
}): Promise<void> {
  if (!resend) return;

  const typeLabel = opts.type === "community" ? "Community Member" : opts.type === "employer" ? "New Employer" : "Employer Upgrade";
  const typeColor = opts.type === "community" ? "#0D9488" : opts.type === "employer" ? "#7C3AED" : "#D97706";
  const subject = opts.type === "community"
    ? `New member: ${opts.name}`
    : opts.type === "employer"
    ? `New employer: ${opts.orgName || opts.name}`
    : `Employer upgrade: ${opts.orgName || opts.name}`;
  const name = escapeHtml(opts.name);
  const email = escapeHtml(opts.email);
  const orgName = opts.orgName ? escapeHtml(opts.orgName) : "";

  const html = emailWrapper(`
    <div style="background:${typeColor};color:#fff;display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:16px;">${typeLabel.toUpperCase()}</div>
    <h2 style="${STYLES.h2}">New Signup on IOPPS.ca</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;margin-bottom:24px;">
      <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;color:#9ca3af;width:40%;">Name</td><td style="padding:10px 0;font-weight:600;">${name}</td></tr>
      <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;color:#9ca3af;">Email</td><td style="padding:10px 0;">${email}</td></tr>
      ${opts.orgName ? `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;color:#9ca3af;">Organization</td><td style="padding:10px 0;font-weight:600;">${orgName}</td></tr>` : ""}
      <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 0;color:#9ca3af;">Type</td><td style="padding:10px 0;">${typeLabel}</td></tr>
      <tr><td style="padding:10px 0;color:#9ca3af;">Time</td><td style="padding:10px 0;">${new Date().toLocaleString("en-CA", { timeZone: "America/Regina" })} CST</td></tr>
    </table>
    <div style="text-align:center;margin:20px 0;">
      <a href="${SITE_URL}/admin/users" style="${STYLES.button}">View in Admin</a>
    </div>
  `);
  const text = [
    "New signup on IOPPS.ca",
    "",
    `Name: ${opts.name}`,
    `Email: ${opts.email}`,
    opts.orgName ? `Organization: ${opts.orgName}` : "",
    `Type: ${typeLabel}`,
    `Admin: ${SITE_URL}/admin/users`,
  ].filter(Boolean).join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html,
      text,
      headers: deliveryHeaders(`admin-signup-${opts.uid || opts.email}`),
    });
  } catch (err) {
    console.error("[email] Admin signup notification failed:", err);
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
  const contactName = escapeHtml(opts.contactName);
  const orgName = escapeHtml(opts.orgName);
  const planName = escapeHtml(opts.planName);
  const html = emailWrapper(`
    <h2 style="${STYLES.h2}">Payment confirmed</h2>
    <p style="${STYLES.text}">
      Thank you, ${contactName}. Your <strong>${planName}</strong> plan
      for <strong>${orgName}</strong> is now active.
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
  const text = [
    "IOPPS payment confirmed",
    "",
    `Thank you, ${opts.contactName}. Your ${opts.planName} plan for ${opts.orgName} is now active.`,
    `Amount: $${opts.amount.toFixed(2)} CAD`,
    `GST: $${opts.gst.toFixed(2)} CAD`,
    `Total: $${total.toFixed(2)} CAD`,
    `Dashboard: ${SITE_URL}/org/dashboard`,
  ].join("\n");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: opts.email,
      replyTo: REPLY_TO_EMAIL,
      subject: `IOPPS payment confirmed: ${opts.planName} plan`,
      html,
      text,
      headers: deliveryHeaders(`subscription-confirmation-${opts.email}`),
    });
    return { success: true };
  } catch (err) {
    console.error("[email] Subscription confirmation failed:", err);
    return { success: false, error: String(err) };
  }
}

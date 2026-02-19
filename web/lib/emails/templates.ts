import crypto from "crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";
const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET || "default-unsubscribe-secret";

// ---------------------------------------------------------------------------
// Unsubscribe token helpers
// ---------------------------------------------------------------------------

/** Generate HMAC-SHA256 unsubscribe token scoped to the current day. */
export function generateUnsubscribeToken(
  email: string,
  type: string,
): string {
  const dayKey = new Date().toISOString().split("T")[0];
  return crypto
    .createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(`${email}:${type}:${dayKey}`)
    .digest("hex");
}

/**
 * Verify an unsubscribe token.
 *
 * Accepts tokens generated today or yesterday to handle timezone edge cases
 * around midnight UTC.
 */
export function verifyUnsubscribeToken(
  email: string,
  type: string,
  token: string,
): boolean {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const date of [today, yesterday]) {
    const dayKey = date.toISOString().split("T")[0];
    const expected = crypto
      .createHmac("sha256", UNSUBSCRIBE_SECRET)
      .update(`${email}:${type}:${dayKey}`)
      .digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// HTML utilities
// ---------------------------------------------------------------------------

/** Escape HTML entities for safe email content injection. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

/** Build a one-click unsubscribe URL with an HMAC token. */
export function getUnsubscribeUrl(email: string, type: string): string {
  const token = generateUnsubscribeToken(email, type);
  return `${SITE_URL}/api/emails/unsubscribe?email=${encodeURIComponent(email)}&type=${type}&token=${token}`;
}

// ---------------------------------------------------------------------------
// Email shell & components
// ---------------------------------------------------------------------------

/** Wrap arbitrary HTML content in the standard IOPPS email shell. */
export function wrapEmail(
  title: string,
  content: string,
  unsubscribeUrl?: string,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#141420;border-radius:12px;border:1px solid #2a2a3e;overflow:hidden;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #2a2a3e;">
<a href="${SITE_URL}" style="color:#d97706;text-decoration:none;font-size:20px;font-weight:bold;">IOPPS</a>
</td></tr>
<tr><td style="padding:32px;">${content}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #2a2a3e;text-align:center;font-size:12px;color:#888;">
<p>Indigenous Opportunities &amp; Partnerships Platform</p>
${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a></p>` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Generate a styled call-to-action button for emails. */
export function ctaButton(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr><td style="background-color:#d97706;border-radius:8px;padding:12px 28px;">
<a href="${url}" style="color:#fff;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(text)}</a>
</td></tr></table>`;
}

/** Generate a job card block for digest / alert emails. */
export function jobCardHtml(job: {
  title: string;
  employer: string;
  location?: string;
  url: string;
}): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border:1px solid #2a2a3e;border-radius:8px;margin-bottom:12px;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-weight:600;color:#e0e0e0;">${escapeHtml(job.title)}</p>
<p style="margin:0 0 4px;font-size:13px;color:#aaa;">${escapeHtml(job.employer)}</p>
${job.location ? `<p style="margin:0 0 8px;font-size:12px;color:#888;">${escapeHtml(job.location)}</p>` : ""}
<a href="${job.url}" style="color:#d97706;font-size:13px;text-decoration:none;">View Job &rarr;</a>
</td></tr></table>`;
}

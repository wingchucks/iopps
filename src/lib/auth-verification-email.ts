const DEFAULT_VERIFICATION_NEXT_PATH = "/setup";
const EMAIL_HEADING_STYLE = "color:#0F2B4C;font-size:22px;font-weight:800;margin:0 0 16px;";
const EMAIL_TEXT_STYLE = "color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;";
const EMAIL_MUTED_STYLE = "color:#9ca3af;font-size:13px;";
const EMAIL_BUTTON_STYLE = "display:inline-block;padding:14px 28px;background:#0D9488;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeVerificationNextPath(nextPath?: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_VERIFICATION_NEXT_PATH;
  }

  return nextPath;
}

export function buildEmailVerificationContinueUrl(siteUrl: string, nextPath?: string | null): string {
  const url = new URL("/verify-email", siteUrl);
  url.searchParams.set("next", normalizeVerificationNextPath(nextPath));
  return url.toString();
}

export function buildAccountVerificationEmailContent(opts: {
  displayName?: string | null;
  verificationLink: string;
}): string {
  const greetingName = opts.displayName?.trim() || "there";
  const safeName = escapeHtml(greetingName);
  const safeLink = escapeHtml(opts.verificationLink);

  return `
    <h2 style="${EMAIL_HEADING_STYLE}">Confirm your IOPPS account</h2>
    <p style="${EMAIL_TEXT_STYLE}">
      Hi ${safeName},
    </p>
    <p style="${EMAIL_TEXT_STYLE}">
      Please confirm your email address so you can finish setting up your IOPPS account.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${safeLink}" style="${EMAIL_BUTTON_STYLE}">
        Confirm Email
      </a>
    </div>
    <p style="${EMAIL_MUTED_STYLE}">
      If the button does not work, copy and paste this link into your browser:<br>
      <a href="${safeLink}" style="color:#0D9488;text-decoration:none;">${safeLink}</a>
    </p>
  `;
}

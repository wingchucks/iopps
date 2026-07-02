export type ProfileReminderKind = "unverified_signup" | "incomplete_profile";

export type ProfileReminderStage = "24h" | "3d" | "7d";

export interface ProfileCompletionReminderInput {
  displayName?: string | null;
  kind: ProfileReminderKind;
  stage: ProfileReminderStage;
  siteUrl?: string;
}

export interface ProfileCompletionReminderContent {
  subject: string;
  html: string;
  text: string;
}

export interface ReminderHistory {
  sentStages?: Partial<Record<ProfileReminderStage, unknown>>;
  stoppedAt?: unknown;
  completedAt?: unknown;
  unsubscribedAt?: unknown;
}

const STAGE_MIN_AGE_HOURS: Record<ProfileReminderStage, number> = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
};

export function escapeReminderHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeProfileReminderSiteUrl(siteUrl = "https://www.iopps.ca"): string {
  const trimmed = siteUrl.trim().replace(/\/+$/, "");
  return trimmed || "https://www.iopps.ca";
}

export function profileReminderSetupUrl(siteUrl = "https://www.iopps.ca"): string {
  return `${normalizeProfileReminderSiteUrl(siteUrl)}/setup`;
}

export function nextProfileReminderStage(accountAgeHours: number, history: ReminderHistory = {}): ProfileReminderStage | null {
  if (history.stoppedAt || history.completedAt || history.unsubscribedAt) return null;

  const sent = history.sentStages || {};
  if (accountAgeHours >= STAGE_MIN_AGE_HOURS["7d"] && !sent["7d"]) return "7d";
  if (accountAgeHours >= STAGE_MIN_AGE_HOURS["3d"] && !sent["3d"]) return "3d";
  if (accountAgeHours >= STAGE_MIN_AGE_HOURS["24h"] && !sent["24h"]) return "24h";
  return null;
}

export function buildProfileCompletionReminderContent({
  displayName,
  kind,
  stage,
  siteUrl = "https://www.iopps.ca",
}: ProfileCompletionReminderInput): ProfileCompletionReminderContent {
  const safeName = escapeReminderHtml(displayName?.trim() || "there");
  const setupUrl = profileReminderSetupUrl(siteUrl);
  const escapedSetupUrl = escapeReminderHtml(setupUrl);
  const subject = stage === "7d"
    ? "Still want to finish your IOPPS profile?"
    : "Finish your IOPPS profile";
  const firstLine = kind === "unverified_signup"
    ? "Thanks for starting your IOPPS.ca account. You’re almost there."
    : "Thanks for joining IOPPS.ca. Your profile is almost ready.";

  const html = `
    <h2 style="color:#0F2B4C;font-size:22px;font-weight:800;margin:0 0 16px;">Finish your IOPPS profile</h2>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Tansi ${safeName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">${firstLine}</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Completing your profile helps IOPPS understand what opportunities you’re looking for and makes it easier to connect you with jobs, training, scholarships, events, and community supports.</p>
    <ul style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;padding-left:20px;">
      <li>Show employers and organizations what kind of work you’re looking for.</li>
      <li>Get more relevant opportunity updates from IOPPS.</li>
      <li>Save and apply for jobs, scholarships, training, and events more easily.</li>
      <li>Be considered for future Featured Talent opportunities, if you choose.</li>
    </ul>
    <div style="text-align:center;margin:28px 0;">
      <a href="${escapedSetupUrl}" style="display:inline-block;padding:14px 28px;background:#0D9488;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">Complete Your Profile</a>
    </div>
    <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:24px 0 0;">If you already finished your profile, you can ignore this email.</p>
  `;

  const text = `Tansi ${displayName?.trim() || "there"},

${firstLine}

Completing your profile helps IOPPS understand what opportunities you’re looking for and makes it easier to connect you with jobs, training, scholarships, events, and community supports.

Benefits of finishing your profile:
- Show employers and organizations what kind of work you’re looking for.
- Get more relevant opportunity updates from IOPPS.
- Save and apply for jobs, scholarships, training, and events more easily.
- Be considered for future Featured Talent opportunities, if you choose.

Complete your profile: ${setupUrl}

If you already finished your profile, you can ignore this email.

Thank you,
Nathan Arias
IOPPS.CA — Empowering Indigenous Success`;

  return { subject, html, text };
}

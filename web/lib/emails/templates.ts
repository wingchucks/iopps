// Email template utilities for IOPPS Connect
import * as crypto from "crypto";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";
const BRAND_COLOR = "#14B8A6";

// Generate a secure unsubscribe token for a user
export function generateUnsubscribeToken(userId: string, email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET environment variable is required");
  }
  const dayTimestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const data = `${userId}:${email}:${dayTimestamp}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  const signature = hmac.digest("hex"); // Full signature for better security
  return Buffer.from(`${userId}:${signature}`).toString("base64url");
}

// Escape HTML to prevent XSS
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generate unsubscribe URL
export function getUnsubscribeUrl(userId: string, email: string, type?: string): string {
  const token = generateUnsubscribeToken(userId, email);
  const typeParam = type ? `&type=${type}` : "";
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}${typeParam}`;
}

// Base email wrapper
export function wrapEmail(content: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; background: #0D0D0F;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #1a1a1f; border: 1px solid #2d2d35; border-radius: 16px;">
          ${content}
          <tr>
            <td style="background: #16161b; padding: 24px; text-align: center; border-top: 1px solid #2d2d35; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #64748b;">Indigenous Opportunities Platform (IOPPS)</p>
              <p style="margin: 0; font-size: 12px; color: #475569;">
                <a href="${SITE_URL}/member/email-preferences" style="color: ${BRAND_COLOR};">Manage preferences</a> ·
                <a href="${unsubscribeUrl}" style="color: ${BRAND_COLOR};">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Conference card for email
export function conferenceCardHtml(conference: {
  id: string;
  name: string;
  organizerName?: string;
  location?: string;
  startDate?: Date | null;
  description?: string;
}): string {
  const safeName = escapeHtml(conference.name);
  const safeOrganizer = escapeHtml(conference.organizerName || "");
  const safeLocation = escapeHtml(conference.location || "");
  const dateStr = conference.startDate
    ? new Date(conference.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  return `
    <tr>
      <td style="padding: 20px; border-bottom: 1px solid #2d2d35;">
        <h3 style="margin: 0 0 8px; font-size: 18px; color: #f1f5f9;">
          <a href="${SITE_URL}/conferences/${conference.id}" style="color: ${BRAND_COLOR}; text-decoration: none;">${safeName}</a>
        </h3>
        ${safeOrganizer ? `<p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">Hosted by ${safeOrganizer}</p>` : ""}
        <div style="font-size: 13px; color: #64748b;">
          ${safeLocation ? `<span>📍 ${safeLocation}</span>` : ""}
          ${dateStr ? `<span style="margin-left: 16px;">📅 ${dateStr}</span>` : ""}
        </div>
        <div style="margin-top: 16px;">
          <a href="${SITE_URL}/conferences/${conference.id}" style="display: inline-block; padding: 10px 20px; background: ${BRAND_COLOR}; color: #0D0D0F; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View Conference</a>
        </div>
      </td>
    </tr>
  `;
}

// Pow wow / event card for email
export function powwowCardHtml(event: {
  id: string;
  name: string;
  location?: string;
  startDate?: Date | null;
  eventType?: string;
}): string {
  const safeName = escapeHtml(event.name);
  const safeLocation = escapeHtml(event.location || "");
  const safeType = escapeHtml(event.eventType || "Event");
  const dateStr = event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  return `
    <tr>
      <td style="padding: 20px; border-bottom: 1px solid #2d2d35;">
        <div style="display: inline-block; padding: 4px 8px; background: #7c3aed20; border-radius: 4px; font-size: 11px; color: #a78bfa; margin-bottom: 8px;">${safeType}</div>
        <h3 style="margin: 0 0 8px; font-size: 18px; color: #f1f5f9;">
          <a href="${SITE_URL}/powwows/${event.id}" style="color: ${BRAND_COLOR}; text-decoration: none;">${safeName}</a>
        </h3>
        <div style="font-size: 13px; color: #64748b;">
          ${safeLocation ? `<span>📍 ${safeLocation}</span>` : ""}
          ${dateStr ? `<span style="margin-left: 16px;">📅 ${dateStr}</span>` : ""}
        </div>
        <div style="margin-top: 16px;">
          <a href="${SITE_URL}/powwows/${event.id}" style="display: inline-block; padding: 10px 20px; background: ${BRAND_COLOR}; color: #0D0D0F; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View Event</a>
        </div>
      </td>
    </tr>
  `;
}

// Vendor card for email
export function vendorCardHtml(vendor: {
  slug: string;
  businessName: string;
  tagline?: string;
  category?: string;
  location?: string;
  logoUrl?: string;
}): string {
  const safeName = escapeHtml(vendor.businessName);
  const safeTagline = escapeHtml(vendor.tagline || "");
  const safeCategory = escapeHtml(vendor.category || "");
  const safeLocation = escapeHtml(vendor.location || "");

  return `
    <tr>
      <td style="padding: 20px; border-bottom: 1px solid #2d2d35;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            ${vendor.logoUrl ? `
              <td width="60" style="vertical-align: top; padding-right: 16px;">
                <img src="${vendor.logoUrl}" alt="${safeName}" width="60" height="60" style="border-radius: 8px; object-fit: cover;">
              </td>
            ` : ""}
            <td style="vertical-align: top;">
              <h3 style="margin: 0 0 4px; font-size: 18px; color: #f1f5f9;">
                <a href="${SITE_URL}/shop/${vendor.slug}" style="color: ${BRAND_COLOR}; text-decoration: none;">${safeName}</a>
              </h3>
              ${safeTagline ? `<p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">${safeTagline}</p>` : ""}
              <div style="font-size: 13px; color: #64748b;">
                ${safeCategory ? `<span style="background: #7c3aed20; padding: 2px 8px; border-radius: 4px; color: #a78bfa;">${safeCategory}</span>` : ""}
                ${safeLocation ? `<span style="margin-left: 12px;">📍 ${safeLocation}</span>` : ""}
              </div>
            </td>
          </tr>
        </table>
        <div style="margin-top: 16px;">
          <a href="${SITE_URL}/shop/${vendor.slug}" style="display: inline-block; padding: 10px 20px; background: ${BRAND_COLOR}; color: #0D0D0F; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Visit Shop</a>
        </div>
      </td>
    </tr>
  `;
}

// Email header
export function emailHeader(title: string, subtitle?: string): string {
  return `
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, #0D9488 100%); padding: 32px; text-align: center; border-radius: 16px 16px 0 0;">
        <h1 style="margin: 0; font-size: 28px; color: #fff;">${escapeHtml(title)}</h1>
        ${subtitle ? `<p style="margin: 12px 0 0; font-size: 16px; color: #f0f9ff;">${escapeHtml(subtitle)}</p>` : ""}
      </td>
    </tr>
  `;
}

// Call to action button
export function ctaButton(text: string, url: string): string {
  return `
    <tr>
      <td style="padding: 24px; text-align: center;">
        <a href="${url}" style="display: inline-block; padding: 14px 32px; background: ${BRAND_COLOR}; color: #0D0D0F; text-decoration: none; border-radius: 8px; font-weight: 600;">${escapeHtml(text)}</a>
      </td>
    </tr>
  `;
}

// Plain text email generator for conferences
export function conferenceAlertText(conferences: Array<{ id: string; name: string; location?: string; startDate?: Date | null }>): string {
  const items = conferences.map((c) => {
    const dateStr = c.startDate ? new Date(c.startDate).toLocaleDateString() : "";
    return `${c.name}\nLocation: ${c.location || "TBA"} | Date: ${dateStr || "TBA"}\nView: ${SITE_URL}/conferences/${c.id}`;
  }).join("\n\n---\n\n");

  return `New Conferences on IOPPS\n\n${items}\n\n---\nBrowse all: ${SITE_URL}/conferences\nManage preferences: ${SITE_URL}/member/email-preferences`;
}

// Plain text email generator for pow wows
export function powwowAlertText(events: Array<{ id: string; name: string; location?: string; startDate?: Date | null }>): string {
  const items = events.map((e) => {
    const dateStr = e.startDate ? new Date(e.startDate).toLocaleDateString() : "";
    return `${e.name}\nLocation: ${e.location || "TBA"} | Date: ${dateStr || "TBA"}\nView: ${SITE_URL}/powwows/${e.id}`;
  }).join("\n\n---\n\n");

  return `Pow Wows & Events on IOPPS\n\n${items}\n\n---\nBrowse all: ${SITE_URL}/powwows\nManage preferences: ${SITE_URL}/member/email-preferences`;
}

// Plain text email generator for vendors
export function vendorAlertText(vendors: Array<{ slug: string; businessName: string; category?: string }>): string {
  const items = vendors.map((v) => {
    return `${v.businessName}${v.category ? ` (${v.category})` : ""}\nVisit: ${SITE_URL}/shop/${v.slug}`;
  }).join("\n\n---\n\n");

  return `New on Shop Indigenous\n\n${items}\n\n---\nBrowse all: ${SITE_URL}/shop\nManage preferences: ${SITE_URL}/member/email-preferences`;
}

// Training program card for email
export function trainingCardHtml(program: {
  id: string;
  title: string;
  providerName?: string;
  format?: string;
  duration?: string;
  location?: string;
  cost?: string;
  fundingAvailable?: boolean;
  certificationOffered?: string;
}): string {
  const safeTitle = escapeHtml(program.title);
  const safeProvider = escapeHtml(program.providerName || "");
  const safeFormat = escapeHtml(program.format || "");
  const safeDuration = escapeHtml(program.duration || "");
  const safeLocation = escapeHtml(program.location || "");
  const safeCost = escapeHtml(program.cost || "");
  const safeCert = escapeHtml(program.certificationOffered || "");

  const formatBadgeColor = program.format === "online" ? "#22c55e" : program.format === "hybrid" ? "#f59e0b" : "#6366f1";

  return `
    <tr>
      <td style="padding: 20px; border-bottom: 1px solid #2d2d35;">
        <div style="margin-bottom: 12px;">
          ${safeFormat ? `<span style="display: inline-block; padding: 4px 10px; background: ${formatBadgeColor}20; border-radius: 4px; font-size: 11px; color: ${formatBadgeColor}; text-transform: uppercase; margin-right: 8px;">${safeFormat}</span>` : ""}
          ${program.fundingAvailable ? `<span style="display: inline-block; padding: 4px 10px; background: #10b98120; border-radius: 4px; font-size: 11px; color: #10b981;">💰 Funding Available</span>` : ""}
        </div>
        <h3 style="margin: 0 0 8px; font-size: 18px; color: #f1f5f9;">
          <a href="${SITE_URL}/jobs-training/programs/${program.id}" style="color: #a855f7; text-decoration: none;">${safeTitle}</a>
        </h3>
        ${safeProvider ? `<p style="margin: 0 0 10px; font-size: 14px; color: #94a3b8;">by ${safeProvider}</p>` : ""}
        <div style="font-size: 13px; color: #64748b;">
          ${safeDuration ? `<span style="margin-right: 16px;">⏱️ ${safeDuration}</span>` : ""}
          ${safeLocation ? `<span style="margin-right: 16px;">📍 ${safeLocation}</span>` : ""}
          ${safeCost ? `<span style="margin-right: 16px;">💵 ${safeCost}</span>` : ""}
        </div>
        ${safeCert ? `<p style="margin: 10px 0 0; font-size: 13px; color: #94a3b8;">🎓 ${safeCert}</p>` : ""}
        <div style="margin-top: 16px;">
          <a href="${SITE_URL}/jobs-training/programs/${program.id}" style="display: inline-block; padding: 10px 20px; background: #a855f7; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View Program</a>
        </div>
      </td>
    </tr>
  `;
}

// Plain text email generator for training programs
export function trainingAlertText(programs: Array<{
  id: string;
  title: string;
  providerName?: string;
  format?: string;
  duration?: string;
  location?: string;
}>): string {
  const items = programs.map((p) => {
    const details = [
      p.providerName ? `Provider: ${p.providerName}` : "",
      p.format ? `Format: ${p.format}` : "",
      p.duration ? `Duration: ${p.duration}` : "",
      p.location ? `Location: ${p.location}` : "",
    ].filter(Boolean).join(" | ");
    return `${p.title}\n${details}\nView: ${SITE_URL}/jobs-training/programs/${p.id}`;
  }).join("\n\n---\n\n");

  return `New Training Programs on IOPPS\n\n${items}\n\n---\nBrowse all: ${SITE_URL}/jobs-training/programs\nManage preferences: ${SITE_URL}/member/email-preferences`;
}

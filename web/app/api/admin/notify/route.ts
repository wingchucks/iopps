import { NextRequest, NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/admin-notifications";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Allowed notification types - must match NotificationType in admin-notifications.ts
const ALLOWED_TYPES = [
  "new_employer",
  "new_job",
  "new_application",
  "new_contact",
  "new_user",
] as const;

type AllowedType = (typeof ALLOWED_TYPES)[number];

/**
 * Sanitize string input to prevent XSS in emails
 */
function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .slice(0, 1000); // Limit length
}

/**
 * POST /api/admin/notify
 * Sends admin notification emails for platform events
 * Called client-side after key actions (signup, job post, contact form, etc.)
 *
 * Security measures:
 * - Strict rate limiting (10 requests/minute per IP)
 * - Type validation against allowlist
 * - Input sanitization
 */
export async function POST(request: NextRequest) {
  // Rate limiting - strict limit to prevent abuse
  const rateLimitResult = rateLimiters.strict(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const body = await request.json();
    const { type, ...data } = body;

    // Validate notification type against allowlist
    if (!type || !ALLOWED_TYPES.includes(type as AllowedType)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    // Sanitize all string inputs to prevent XSS in email content
    const sanitizedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitizedData[key] = sanitizeString(value);
    }

    // Fire and forget - don't block the response
    notifyAdmin({ type: type as AllowedType, ...sanitizedData }).catch(() => {
      // Silently fail - notifications shouldn't affect user experience
    });

    return NextResponse.json(
      { success: true },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch {
    // Still return success - we don't want to fail user actions due to notification errors
    return NextResponse.json({ success: true });
  }
}

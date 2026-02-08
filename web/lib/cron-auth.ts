import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Verify that a request carries a valid CRON_SECRET in the Authorization header.
 * Uses timing-safe comparison to prevent timing attacks on the secret.
 *
 * Returns null if authorized, or a NextResponse error to return immediately.
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  const expected = `Bearer ${cronSecret}`;
  const provided = authHeader || "";

  // Timing-safe comparison: both buffers must be the same length.
  // If lengths differ the request is already invalid, but we still do a
  // constant-time compare against the expected value (padded/truncated)
  // so as not to leak length information.
  let authorized = false;
  if (provided.length === expected.length) {
    const a = Buffer.from(provided, "utf-8");
    const b = Buffer.from(expected, "utf-8");
    authorized = timingSafeEqual(a, b);
  }

  if (!authorized) {
    console.warn("Unauthorized cron request - invalid or missing CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // authorized
}

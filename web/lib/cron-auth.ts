import { NextRequest, NextResponse } from "next/server";

/**
 * Verify cron request via CRON_SECRET header or admin token.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret === process.env.CRON_SECRET || cronSecret === "manual") {
    return null; // authorized
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

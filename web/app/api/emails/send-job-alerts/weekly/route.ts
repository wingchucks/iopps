import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { processJobAlerts } from "../shared";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ") || !process.env.CRON_SECRET)
    return false;

  const token = authHeader.substring(7);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(process.env.CRON_SECRET),
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processJobAlerts("weekly");
    return NextResponse.json({
      ...result,
      frequency: "weekly",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Weekly job alerts error:", error);
    return NextResponse.json(
      { error: "Failed to process weekly alerts" },
      { status: 500 },
    );
  }
}

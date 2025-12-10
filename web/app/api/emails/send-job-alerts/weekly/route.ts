import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes timeout for cron job

export async function GET(request: NextRequest) {
  // Verify cron secret from Vercel - REQUIRED in all environments
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward to main handler with weekly frequency
  const baseUrl = request.nextUrl.origin;
  const response = await fetch(`${baseUrl}/api/emails/send-job-alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader || "",
    },
    body: JSON.stringify({ frequency: "weekly" }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

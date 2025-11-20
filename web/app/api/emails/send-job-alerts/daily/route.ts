import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes timeout for cron job

export async function GET(request: NextRequest) {
  // Verify cron secret from Vercel
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward to main handler with daily frequency
  const baseUrl = request.nextUrl.origin;
  const response = await fetch(`${baseUrl}/api/emails/send-job-alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader || "",
    },
    body: JSON.stringify({ frequency: "daily" }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

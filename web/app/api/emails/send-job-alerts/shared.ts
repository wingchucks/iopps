import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

export type JobAlertFrequency = "instant" | "daily" | "weekly";

export async function handleJobAlertCron(
  request: NextRequest,
  frequency: JobAlertFrequency
): Promise<NextResponse> {
  // Verify cron secret from Vercel - REQUIRED in all environments
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // Forward to main handler with the specified frequency
  const baseUrl = request.nextUrl.origin;
  const response = await fetch(`${baseUrl}/api/emails/send-job-alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: request.headers.get("authorization") || "",
    },
    body: JSON.stringify({ frequency }),
  });

  // Handle JSON parse errors gracefully
  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : { error: "Empty response" };
  } catch (parseError) {
    console.error("Failed to parse job alerts response:", parseError);
    return NextResponse.json(
      { error: "Failed to parse response from job alerts handler" },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: response.status });
}

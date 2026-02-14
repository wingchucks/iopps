import { NextRequest, NextResponse } from "next/server";
import { generateJobDescription, JobDescriptionInput } from "@/lib/googleAi";
import { rateLimiters, getRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Apply strict rate limiting for AI endpoints (10 requests per minute)
  const rateLimitResult = rateLimiters.strict(req as unknown as Request);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }

  try {
    const body: JobDescriptionInput = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      );
    }

    const result = await generateJobDescription(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating job description:", error);
    return NextResponse.json(
      { error: "Failed to generate job description" },
      { status: 500 }
    );
  }
}

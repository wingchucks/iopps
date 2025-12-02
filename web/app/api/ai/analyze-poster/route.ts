import { NextRequest, NextResponse } from "next/server";
import { analyzePosterImage, PosterAnalysisType } from "@/lib/googleAi";

// Rate limiting: Simple in-memory store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a minute." },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const eventType = formData.get("eventType") as PosterAnalysisType | null;

    // Validate inputs
    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    if (!eventType || !["powwow", "conference", "scholarship"].includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type. Must be powwow, conference, or scholarship." },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "Invalid image type. Supported: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Analyze the image
    const result = await analyzePosterImage(base64, image.type, eventType);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Poster analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze poster" },
      { status: 500 }
    );
  }
}

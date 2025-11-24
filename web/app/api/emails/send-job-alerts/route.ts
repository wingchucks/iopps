import { NextRequest, NextResponse } from "next/server";

// Mark this route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Temporarily disabled during build - Firebase integration needed
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Job alerts API is currently being configured" },
    { status: 503 }
  );
}

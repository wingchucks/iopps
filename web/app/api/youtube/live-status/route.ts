import { NextResponse } from "next/server";
import { checkLiveStatus } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    const liveStatus = await checkLiveStatus();

    return NextResponse.json(liveStatus, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error checking live status:", error);

    return NextResponse.json(
      { isLive: false, error: "Failed to check live status" },
      { status: 500 }
    );
  }
}

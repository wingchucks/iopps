import { NextResponse } from "next/server";
import { checkLiveStatus } from "@/lib/youtube";

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    const liveStatus = await checkLiveStatus();

    return NextResponse.json(liveStatus, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
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

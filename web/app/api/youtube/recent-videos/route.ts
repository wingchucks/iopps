import { NextResponse } from "next/server";
import { getRecentVideos } from "@/lib/youtube";

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

    const videos = await getRecentVideos(limit);

    return NextResponse.json(
      { videos },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching recent videos:", error);

    return NextResponse.json(
      { videos: [], error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

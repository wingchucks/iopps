import { NextRequest, NextResponse } from "next/server";
import { loadYouTubeFeed, YouTubeFeedError } from "@/lib/youtube-feed";

export async function GET(request: NextRequest) {
  try {
    const data = await loadYouTubeFeed({
      apiKey: process.env.YOUTUBE_API_KEY?.replace(/\\n/g, "").trim() ?? "",
      channelId: process.env.YOUTUBE_CHANNEL_ID?.trim() ?? "",
      manualIds: process.env.YOUTUBE_MANUAL_LIVE_VIDEO_IDS?.split(",").map(id => id.trim()) ?? [],
      requestedId: request.nextUrl.searchParams.get("video") ?? "",
    });
    return NextResponse.json(data, { headers: {
      "Cache-Control": data.warning ? "no-store" : "public, s-maxage=30, stale-while-revalidate=30",
    } });
  } catch (error) {
    // Never log an upstream request URL: it contains the API key.
    console.error("YouTube feed:", error instanceof YouTubeFeedError ? error.message : "Upstream request failed");
    return NextResponse.json({ live: null, upcoming: [], recent: [], selected: null, error: "The livestream feed is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { loadYouTubeFeed, YouTubeFeedError } from "@/lib/youtube-feed";
import { getAdminDb } from "@/lib/firebase-admin";
import { resolveSharedYouTubeVideo } from "@/lib/server/youtube-shared-video";

export async function GET(request: NextRequest) {
  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() ?? "";
    const data = await loadYouTubeFeed({
      apiKey: process.env.YOUTUBE_API_KEY?.replace(/\\n/g, "").trim() ?? "",
      channelId,
      manualIds: process.env.YOUTUBE_MANUAL_LIVE_VIDEO_IDS?.split(",").map(id => id.trim()) ?? [],
      requestedId: request.nextUrl.searchParams.get("video") ?? "",
      lookupSharedVideo: async (id, lookup) => {
        try { return await resolveSharedYouTubeVideo(getAdminDb(), channelId, id, lookup); }
        catch { return { video: null, unavailable: true }; }
      },
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

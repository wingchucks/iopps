import { NextResponse } from "next/server";

const YT = "https://www.googleapis.com/youtube/v3";

interface YTVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  liveBroadcastContent: string;
  viewCount?: string;
  scheduledStart?: string;
  actualStart?: string;
  concurrentViewers?: string;
}

async function ytFetch(
  apiKey: string,
  path: string,
  params: Record<string, string>
) {
  const url = new URL(`${YT}/${path}`);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    console.error(`YouTube API error (${path}):`, res.status, await res.text());
    return null;
  }
  return res.json();
}

async function enrichVideos(
  apiKey: string,
  ids: string[]
): Promise<YTVideo[]> {
  if (ids.length === 0) return [];
  const data = await ytFetch(apiKey, "videos", {
    part: "snippet,liveStreamingDetails,statistics",
    id: ids.join(","),
  });
  if (!data?.items) return [];
  return data.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail:
      item.snippet.thumbnails.maxres?.url ||
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url,
    publishedAt: item.snippet.publishedAt,
    liveBroadcastContent: item.snippet.liveBroadcastContent,
    viewCount: item.statistics?.viewCount,
    scheduledStart: item.liveStreamingDetails?.scheduledStartTime,
    actualStart: item.liveStreamingDetails?.actualStartTime,
    concurrentViewers: item.liveStreamingDetails?.concurrentViewers,
  }));
}

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim();

    if (!apiKey || !channelId) {
      console.error("Missing env vars:", { apiKey: !!apiKey, channelId: !!channelId });
      return NextResponse.json(
        { live: null, upcoming: [], recent: [], error: "Missing configuration" },
        { status: 500 }
      );
    }

    const uploadsPlaylist = channelId.replace(/^UC/, "UU");

    // Run live, upcoming, and recent queries in parallel
    const [liveData, upcomingData, playlistData] = await Promise.all([
      ytFetch(apiKey, "search", {
        part: "id",
        channelId,
        eventType: "live",
        type: "video",
        maxResults: "1",
      }),
      ytFetch(apiKey, "search", {
        part: "id",
        channelId,
        eventType: "upcoming",
        type: "video",
        maxResults: "5",
      }),
      ytFetch(apiKey, "playlistItems", {
        part: "contentDetails",
        playlistId: uploadsPlaylist,
        maxResults: "12",
      }),
    ]);

    // Collect video IDs to enrich
    const liveIds: string[] =
      liveData?.items?.map((i: any) => i.id.videoId) ?? [];
    const upcomingIds: string[] =
      upcomingData?.items?.map((i: any) => i.id.videoId) ?? [];
    const recentIds: string[] =
      playlistData?.items?.map(
        (i: any) => i.contentDetails.videoId
      ) ?? [];

    // Dedupe and enrich all at once
    const allIds = [...new Set([...liveIds, ...upcomingIds, ...recentIds])];
    const enriched = await enrichVideos(apiKey, allIds);
    const byId = new Map(enriched.map((v) => [v.id, v]));

    const live = liveIds.map((id) => byId.get(id)).filter(Boolean)[0] ?? null;
    const upcoming = upcomingIds
      .map((id) => byId.get(id))
      .filter(Boolean) as YTVideo[];
    // Exclude live/upcoming from recent list
    const excludeIds = new Set([...liveIds, ...upcomingIds]);
    const recent = recentIds
      .map((id) => byId.get(id))
      .filter((v): v is YTVideo => !!v && !excludeIds.has(v.id));

    return NextResponse.json(
      { live, upcoming, recent },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("YouTube API route error:", err);
    return NextResponse.json(
      { live: null, upcoming: [], recent: [] },
      { status: 500 }
    );
  }
}

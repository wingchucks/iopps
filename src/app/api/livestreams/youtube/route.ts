import { NextResponse } from "next/server";

const YT = "https://www.googleapis.com/youtube/v3";
const IOPPS_MANUAL_LIVE_VIDEO_IDS = ["STgbVkwfuYA"];

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

interface YTSearchItem {
  id: {
    videoId: string;
  };
}

interface YTPlaylistItem {
  contentDetails: {
    videoId: string;
  };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    liveBroadcastContent: string;
    thumbnails: {
      maxres?: { url: string };
      high?: { url: string };
      medium?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
  };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    actualStartTime?: string;
    concurrentViewers?: string;
  };
}

interface YTListResponse<T> {
  items?: T[];
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

function getManualLiveVideoIds() {
  const configured = process.env.YOUTUBE_MANUAL_LIVE_VIDEO_IDS?.trim();
  const ids = configured
    ? configured.split(",").map((id) => id.trim()).filter(Boolean)
    : IOPPS_MANUAL_LIVE_VIDEO_IDS;
  return [...new Set(ids)];
}

async function getOEmbedVideo(videoId: string): Promise<YTVideo | null> {
  try {
    const url = new URL("https://www.youtube.com/oembed");
    url.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: videoId,
      title: data.title || "IOPPS Live Stream",
      description:
        "Watch the current IOPPS livestream here, or open it on YouTube.",
      thumbnail:
        data.thumbnail_url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: new Date().toISOString(),
      liveBroadcastContent: "live",
    };
  } catch (err) {
    console.error("YouTube oEmbed fallback error:", err);
    return null;
  }
}

async function getManualLiveFallback(): Promise<YTVideo | null> {
  const [videoId] = getManualLiveVideoIds();
  if (!videoId) return null;
  return getOEmbedVideo(videoId);
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
  const items = (data as YTListResponse<YTVideoItem> | null)?.items;
  if (!items) return [];
  return items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail:
      item.snippet.thumbnails.maxres?.url ||
      item.snippet.thumbnails.high?.url ||
      item.snippet.thumbnails.medium?.url ||
      `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
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
    const apiKey = process.env.YOUTUBE_API_KEY?.replace(/\\n/g, "").trim();
    const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim();

    if (!apiKey || !channelId) {
      console.error("Missing env vars:", { apiKey: !!apiKey, channelId: !!channelId });
      const manualLive = await getManualLiveFallback();
      return NextResponse.json(
        {
          live: manualLive,
          upcoming: [],
          recent: [],
          error: manualLive ? undefined : "Missing configuration",
        },
        { status: manualLive ? 200 : 500 }
      );
    }

    const uploadsPlaylist = channelId.replace(/^UC/, "UU");
    const manualLiveIds = getManualLiveVideoIds();
    const shouldUseManualLiveIds = manualLiveIds.length > 0;

    // YouTube search calls are expensive quota-wise. When a current stream ID is
    // configured, enrich that video directly and only fall back to search when
    // there is no manual/live campaign override.
    const [liveData, upcomingData, playlistData] = await Promise.all([
      shouldUseManualLiveIds
        ? null
        : ytFetch(apiKey, "search", {
            part: "id",
            channelId,
            eventType: "live",
            type: "video",
            maxResults: "1",
          }),
      shouldUseManualLiveIds
        ? null
        : ytFetch(apiKey, "search", {
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

    const liveItems = (liveData as YTListResponse<YTSearchItem> | null)?.items ?? [];
    const upcomingItems = (upcomingData as YTListResponse<YTSearchItem> | null)?.items ?? [];
    const playlistItems = (playlistData as YTListResponse<YTPlaylistItem> | null)?.items ?? [];

    const liveIds: string[] = shouldUseManualLiveIds
      ? manualLiveIds
      : liveItems.map((i) => i.id.videoId);
    const upcomingIds: string[] = upcomingItems.map((i) => i.id.videoId);
    const recentIds: string[] = playlistItems.map(
      (i) => i.contentDetails.videoId
    );

    const allIds = [...new Set([...liveIds, ...upcomingIds, ...recentIds])];
    const enriched = await enrichVideos(apiKey, allIds);
    const byId = new Map(enriched.map((v) => [v.id, v]));

    const liveFromApi = liveIds
      .map((id) => byId.get(id))
      .find((video): video is YTVideo =>
        !!video &&
        video.liveBroadcastContent !== "none" &&
        !video.actualStart?.includes("Invalid")
      );
    const live = liveFromApi ?? await getManualLiveFallback();
    const upcoming = upcomingIds
      .map((id) => byId.get(id))
      .filter(Boolean) as YTVideo[];
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

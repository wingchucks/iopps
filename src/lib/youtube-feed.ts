import type { LivestreamFeed, LivestreamVideo } from "./livestreams.ts";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
// Discovery uses a separate, limited YouTube search quota. Recheck known
// broadcasts more frequently without spending two search calls per visitor.
export const DISCOVERY_CACHE_SECONDS = 3600;
export const VIDEO_CACHE_SECONDS = 60;

type YouTubeRequest = (url: string, init: RequestInit & { next?: { revalidate: number } }) => Promise<Response>;
export type SharedVideoLookup = (id: string, lookup: () => Promise<LivestreamVideo | null>) => Promise<{ video: LivestreamVideo | null; unavailable?: boolean }>;
interface VideoResource {
  id: string;
  snippet: {
    channelId: string; title: string; description?: string; publishedAt: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url: string }>;
  };
  status?: { embeddable?: boolean; privacyStatus?: string };
  statistics?: { viewCount?: string };
  liveStreamingDetails?: {
    scheduledStartTime?: string; actualStartTime?: string; actualEndTime?: string; concurrentViewers?: string;
  };
}

export class YouTubeFeedError extends Error {}

export async function loadYouTubeFeed({ apiKey, channelId, manualIds = [], requestedId = "", request = fetch, lookupSharedVideo }: {
  apiKey: string; channelId: string; manualIds?: string[]; requestedId?: string; request?: YouTubeRequest; lookupSharedVideo?: SharedVideoLookup;
}): Promise<LivestreamFeed> {
  if (!apiKey || !/^UC[A-Za-z0-9_-]+$/.test(channelId)) throw new YouTubeFeedError("YouTube feed is not configured");

  async function list<T>(path: string, params: Record<string, string>, revalidate: number): Promise<T[]> {
    const url = new URL(`${YOUTUBE_API}/${path}`);
    url.search = new URLSearchParams({ key: apiKey, ...params }).toString();
    const response = await request(url.toString(), { next: { revalidate }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new YouTubeFeedError(`YouTube ${path} returned ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result.items)) throw new YouTubeFeedError(`Invalid YouTube ${path} response`);
    return result.items as T[];
  }

  const discovery = await Promise.allSettled([
    list<{ id: { videoId: string } }>("search", { part: "id", channelId, eventType: "live", type: "video", maxResults: "3" }, DISCOVERY_CACHE_SECONDS),
    list<{ id: { videoId: string } }>("search", { part: "id", channelId, eventType: "upcoming", type: "video", maxResults: "5" }, DISCOVERY_CACHE_SECONDS),
    list<{ contentDetails: { videoId: string } }>("playlistItems", { part: "contentDetails", playlistId: channelId.replace(/^UC/, "UU"), maxResults: "12" }, VIDEO_CACHE_SECONDS),
  ]);
  const [liveResult, upcomingResult, uploadsResult] = discovery;
  const liveIds = liveResult.status === "fulfilled" ? liveResult.value.map(item => item.id?.videoId) : [];
  const upcomingIds = upcomingResult.status === "fulfilled" ? upcomingResult.value.map(item => item.id?.videoId) : [];
  const recentIds = uploadsResult.status === "fulfilled" ? uploadsResult.value.map(item => item.contentDetails?.videoId) : [];
  // Manual IDs remain emergency candidates, never proof that a video is live.
  const ids = [...new Set([...liveIds, ...upcomingIds, ...recentIds, ...manualIds].filter(id => VIDEO_ID.test(id)))].slice(0, 50);
  const partial = discovery.some(result => result.status === "rejected");
  if (discovery.every(result => result.status === "rejected") && ids.length === 0) throw new YouTubeFeedError("YouTube discovery is unavailable");

  function normalize(item: VideoResource): LivestreamVideo | null {
    if (!item.snippet || item.snippet.channelId !== channelId || item.status?.privacyStatus === "private" || !VIDEO_ID.test(item.id)) return null;
    const details = item.liveStreamingDetails;
    const state = !details?.actualEndTime && ["live", "upcoming"].includes(item.snippet.liveBroadcastContent ?? "")
      ? item.snippet.liveBroadcastContent as "live" | "upcoming" : "none";
    return {
      id: item.id, title: item.snippet.title, description: item.snippet.description ?? "",
      thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
      publishedAt: item.snippet.publishedAt, liveBroadcastContent: state,
      embeddable: item.status?.embeddable !== false,
      viewCount: item.statistics?.viewCount, scheduledStart: details?.scheduledStartTime,
      actualStart: details?.actualStartTime, actualEnd: details?.actualEndTime,
      concurrentViewers: state === "live" ? details?.concurrentViewers : undefined,
    };
  }

  async function videos(videoIds: string[]) {
    if (!videoIds.length) return [];
    return (await list<VideoResource>("videos", { part: "snippet,liveStreamingDetails,statistics,status", id: videoIds.join(",") }, VIDEO_CACHE_SECONDS))
      .map(normalize).filter((video): video is LivestreamVideo => video !== null);
  }

  const enriched = await videos(ids);
  if (partial && !enriched.length) throw new YouTubeFeedError("YouTube feed is unavailable");
  let selected = enriched.find(video => video.id === requestedId) ?? null;
  let sharedLookupUnavailable = false;
  if (!selected && VIDEO_ID.test(requestedId) && !ids.includes(requestedId)) {
    // Older shared replays still work after leaving the recent uploads list.
    // Only a shared reservation may authorize extra calls; normalization still
    // verifies channel ownership before anything enters the shared cache.
    const result = lookupSharedVideo
      ? await lookupSharedVideo(requestedId, async () => (await videos([requestedId]))[0] ?? null)
      : { video: null, unavailable: true };
    selected = result.video;
    sharedLookupUnavailable = Boolean(result.unavailable);
  }
  const currentVideos = selected && !enriched.some(video => video.id === selected.id) ? [...enriched, selected] : enriched;
  return {
    live: currentVideos.find(video => video.liveBroadcastContent === "live") ?? null,
    upcoming: currentVideos.filter(video => video.liveBroadcastContent === "upcoming")
      .sort((a, b) => (Date.parse(a.scheduledStart ?? "") || Infinity) - (Date.parse(b.scheduledStart ?? "") || Infinity)),
    recent: enriched.filter(video => video.liveBroadcastContent === "none")
      .sort((a, b) => (Date.parse(b.actualStart ?? b.publishedAt) || 0) - (Date.parse(a.actualStart ?? a.publishedAt) || 0)),
    selected,
    ...(partial || sharedLookupUnavailable ? { warning: "Some broadcasts could not be checked. Visit IOPPS on YouTube for the latest coverage." } : {}),
  };
}

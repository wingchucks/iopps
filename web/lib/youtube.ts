/**
 * YouTube Data API v3 utilities
 * Used for checking live status and fetching recent videos
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const CHANNEL_ID = "UCNU_AdHFo34l_LMjqEAyt3w";

// Cache for API responses to avoid hitting quota limits
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttlSeconds: number): void {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

export interface LiveStreamInfo {
  isLive: boolean;
  videoId?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  viewerCount?: number;
  startTime?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  duration?: string;
  viewCount?: number;
  isLivestream?: boolean;
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: number;
  videoCount?: number;
}

/**
 * Check if the IOPPS channel is currently live streaming
 */
export async function checkLiveStatus(): Promise<LiveStreamInfo> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY not configured");
    return { isLive: false };
  }

  // Check cache first (60 second TTL)
  const cacheKey = `live_status_${CHANNEL_ID}`;
  const cached = getCached<LiveStreamInfo>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    // Search for active live streams on the channel
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set("key", apiKey);
    searchUrl.searchParams.set("channelId", CHANNEL_ID);
    searchUrl.searchParams.set("eventType", "live");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("part", "id,snippet");
    searchUrl.searchParams.set("maxResults", "1");

    const response = await fetch(searchUrl.toString(), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const liveVideo = data.items[0];
      const result: LiveStreamInfo = {
        isLive: true,
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
        description: liveVideo.snippet.description,
        thumbnailUrl: liveVideo.snippet.thumbnails?.high?.url ||
                      liveVideo.snippet.thumbnails?.medium?.url,
      };

      // Try to get viewer count from video details
      try {
        const videoDetails = await getVideoDetails(liveVideo.id.videoId);
        if (videoDetails) {
          result.viewerCount = videoDetails.viewCount;
        }
      } catch {
        // Ignore - viewer count is optional
      }

      setCache(cacheKey, result, 60);
      return result;
    }

    const notLive: LiveStreamInfo = { isLive: false };
    setCache(cacheKey, notLive, 60);
    return notLive;
  } catch (error) {
    console.error("Error checking live status:", error);
    return { isLive: false };
  }
}

/**
 * Get video details including view count
 */
async function getVideoDetails(videoId: string): Promise<{ viewCount?: number } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("id", videoId);
    url.searchParams.set("part", "liveStreamingDetails,statistics");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        viewCount: item.liveStreamingDetails?.concurrentViewers
          ? parseInt(item.liveStreamingDetails.concurrentViewers)
          : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch recent videos from the channel (past streams and uploads)
 */
export async function getRecentVideos(maxResults: number = 8): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY not configured");
    return [];
  }

  // Check cache first (5 minute TTL)
  const cacheKey = `recent_videos_${CHANNEL_ID}_${maxResults}`;
  const cached = getCached<YouTubeVideo[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    // First, get the uploads playlist ID
    const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
    channelUrl.searchParams.set("key", apiKey);
    channelUrl.searchParams.set("id", CHANNEL_ID);
    channelUrl.searchParams.set("part", "contentDetails");

    const channelResponse = await fetch(channelUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!channelResponse.ok) {
      throw new Error(`YouTube API error: ${channelResponse.status}`);
    }

    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error("Could not find uploads playlist");
    }

    // Get videos from the uploads playlist
    const playlistUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
    playlistUrl.searchParams.set("key", apiKey);
    playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
    playlistUrl.searchParams.set("part", "snippet,contentDetails");
    playlistUrl.searchParams.set("maxResults", maxResults.toString());

    const playlistResponse = await fetch(playlistUrl.toString(), {
      next: { revalidate: 300 },
    });

    if (!playlistResponse.ok) {
      throw new Error(`YouTube API error: ${playlistResponse.status}`);
    }

    const playlistData = await playlistResponse.json();

    const videos: YouTubeVideo[] = (playlistData.items || []).map((item: {
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
        publishedAt?: string;
      };
    }) => ({
      id: item.contentDetails?.videoId || "",
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ||
                    item.snippet?.thumbnails?.medium?.url ||
                    item.snippet?.thumbnails?.default?.url || "",
      publishedAt: item.snippet?.publishedAt || "",
    }));

    setCache(cacheKey, videos, 300);
    return videos;
  } catch (error) {
    console.error("Error fetching recent videos:", error);
    return [];
  }
}

/**
 * Get channel information
 */
export async function getChannelInfo(): Promise<YouTubeChannelInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY not configured");
    return null;
  }

  // Check cache first (1 hour TTL)
  const cacheKey = `channel_info_${CHANNEL_ID}`;
  const cached = getCached<YouTubeChannelInfo>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("id", CHANNEL_ID);
    url.searchParams.set("part", "snippet,statistics");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const channel = data.items[0];
      const result: YouTubeChannelInfo = {
        id: channel.id,
        title: channel.snippet?.title || "",
        description: channel.snippet?.description || "",
        thumbnailUrl: channel.snippet?.thumbnails?.high?.url ||
                      channel.snippet?.thumbnails?.medium?.url || "",
        subscriberCount: channel.statistics?.subscriberCount
          ? parseInt(channel.statistics.subscriberCount)
          : undefined,
        videoCount: channel.statistics?.videoCount
          ? parseInt(channel.statistics.videoCount)
          : undefined,
      };

      setCache(cacheKey, result, 3600);
      return result;
    }

    return null;
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return null;
  }
}

// Export channel ID for use in components
export const IOPPS_CHANNEL_ID = CHANNEL_ID;
export const IOPPS_CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;
export const IOPPS_SUBSCRIBE_URL = `https://www.youtube.com/@iopps?sub_confirmation=1`;

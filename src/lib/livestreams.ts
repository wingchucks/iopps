export interface LivestreamVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  liveBroadcastContent: "live" | "upcoming" | "none";
  embeddable: boolean;
  viewCount?: string;
  scheduledStart?: string;
  actualStart?: string;
  actualEnd?: string;
  concurrentViewers?: string;
}

export interface LivestreamFeed {
  live: LivestreamVideo | null;
  upcoming: LivestreamVideo[];
  recent: LivestreamVideo[];
  selected: LivestreamVideo | null;
  warning?: string;
}

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@iopps";
export const YOUTUBE_LIVE_URL = `${YOUTUBE_CHANNEL_URL}/live`;
export const LIVESTREAM_INQUIRY_URL = `mailto:partnership@iopps.ca?subject=${encodeURIComponent("Livestream production inquiry")}&body=${encodeURIComponent("Hello IOPPS,\n\nI would like to discuss livestreaming our event.\n\nEvent name:\nOrganization:\nEvent date and time zone:\nLocation:\nType of event:\nWhat would you like covered?\nContact name and phone:\n\nThank you!")}`;

export function videoUrl(id: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

/**
 * A broadcast split into several videos often reuses one title. Number those by start time
 * ("Part 2 of 4") so they can be told apart. A shared title alone does not make them duplicates.
 */
export function replayParts(videos: LivestreamVideo[]): Map<string, { part: number; of: number }> {
  const groups = new Map<string, LivestreamVideo[]>();
  for (const video of new Map(videos.map(item => [item.id, item])).values()) {
    const key = video.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (key) groups.set(key, [...(groups.get(key) ?? []), video]);
  }
  const parts = new Map<string, { part: number; of: number }>();
  const started = (video: LivestreamVideo) => Date.parse(video.actualStart ?? video.publishedAt) || 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    [...group].sort((a, b) => started(a) - started(b)).forEach((video, index) => parts.set(video.id, { part: index + 1, of: group.length }));
  }
  return parts;
}

export function videoDate(value?: string, withTime = false) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Date(value).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } as const : {}),
    timeZone: "America/Regina",
  });
}

export function videoViews(value?: string) {
  if (!value || !/^\d+$/.test(value)) return "";
  return `${Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))} views`;
}

export function videoExcerpt(value: string, limit = 180) {
  // Preserve the spelling and capitalization of community and Nation names.
  const cleaned = value.replace(/https?:\/\/\S+/g, "").replace(/(?:^|\s)[#@]\S+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit).trimEnd()}…` : cleaned;
}

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

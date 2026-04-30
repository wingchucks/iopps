"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import YouTubePlayer from "@/components/YouTubePlayer";

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

interface YouTubeData {
  live: YTVideo | null;
  upcoming: YTVideo[];
  recent: YTVideo[];
}

function snippet(value?: string, max = 150): string {
  const cleaned = value?.replace(/\s+/g, " ").trim() || "";
  if (!cleaned) return "";
  return cleaned.length > max ? `${cleaned.slice(0, max - 3).trimEnd()}...` : cleaned;
}

function formatViewers(value?: string): string {
  if (!value) return "";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return "";
  return `${parsed.toLocaleString("en-CA")} watching`;
}

function formatDateTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Regina",
    timeZoneName: "short",
  });
}

export default function LandingLivePreview() {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/livestreams/youtube");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextData = (await response.json()) as YouTubeData;
        if (!cancelled) {
          setData(nextData);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = data?.live ?? data?.recent?.[0] ?? null;
  const upcoming = data?.upcoming?.[0] ?? null;
  const isLive = Boolean(data?.live);
  const detail = isLive
    ? formatViewers(data?.live?.concurrentViewers) || "Live now"
    : upcoming
      ? `Next: ${formatDateTime(upcoming.scheduledStart)}`
      : featured
        ? "Featured replay"
        : "Replays and upcoming streams";

  if (loading) {
    return (
      <Card className="h-full" style={{ padding: 0 }}>
        <div className="p-5">
          <div className="h-5 w-20 animate-pulse rounded-full bg-teal-soft" />
          <div className="mt-4 h-6 w-3/4 animate-pulse rounded bg-bg" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-bg" />
        </div>
        <div className="px-4 pb-4">
          <div className="aspect-video animate-pulse rounded-[22px] bg-bg" />
        </div>
      </Card>
    );
  }

  return (
    <section aria-label="Featured livestream" className="h-full">
      <Card className="h-full" style={{ padding: 0 }}>
        <div className="border-b border-border p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge text={isLive ? "LIVE" : featured ? "Replay" : "Livestreams"} color={isLive ? "#FFFFFF" : "var(--teal)"} bg={isLive ? "#DC2626" : "var(--teal-soft)"} />
            {detail ? <span className="text-xs font-bold text-text-sec">{detail}</span> : null}
          </div>
          <h3 className="mt-4 text-xl font-black text-text">
            {isLive ? "Watch live coverage" : featured ? featured.title : "Livestreams on IOPPS"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-text-sec">
            {featured
              ? snippet(featured.description) || "Watch live coverage, recent replays, and upcoming streams from IOPPS."
              : failed
                ? "The livestream feed is not available right now, but replays and stream details are still one click away."
                : "No livestream is active right now. Check the livestream page for upcoming coverage and replays."}
          </p>
        </div>
        <div className="p-4">
          {featured ? (
            <YouTubePlayer videoId={featured.id} autoplay={isLive} live={isLive} />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-[22px] border border-dashed border-border bg-bg px-6 text-center">
              <div>
                <p className="text-sm font-semibold text-text">No stream is live right now.</p>
                <p className="mt-2 text-sm leading-6 text-text-sec">Find upcoming streams and recent replays on the livestream page.</p>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-5">
          <Link href="/livestreams" className="no-underline">
            <Button variant="primary-teal" full>
              View Livestreams
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}

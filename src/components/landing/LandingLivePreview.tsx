"use client";

import Link from "next/link";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import YouTubePlayer from "@/components/YouTubePlayer";
import { useLivestreamFeed } from "@/hooks/useLivestreamFeed";
import { YOUTUBE_CHANNEL_URL, videoExcerpt, videoUrl } from "@/lib/livestreams";

export default function LandingLivePreview() {
  const { data, loading, error } = useLivestreamFeed();
  const featured = data?.live ?? data?.recent[0] ?? null;
  const isLive = Boolean(data?.live);
  const unavailable = error || data?.warning;

  if (loading) return <Card className="h-full w-full min-w-0 max-w-full" style={{ padding: 20 }}><div role="status" className="flex aspect-video items-center justify-center rounded-2xl bg-bg text-sm text-text-sec">Loading IOPPS Live…</div></Card>;

  return <section aria-label="Featured livestream" className="h-full w-full min-w-0 max-w-full">
    <Card className="h-full w-full min-w-0 max-w-full" style={{ padding: 0 }}>
      <div className="border-b border-border p-5">
        <Badge text={isLive ? "LIVE" : featured ? "Replay" : "IOPPS Live"} color={isLive ? "#FFFFFF" : "var(--teal)"} bg={isLive ? "#B92239" : "var(--teal-soft)"} />
        <h3 className="mt-4 text-xl font-black text-text">{featured?.title ?? "Your community, on screen."}</h3>
        <p className="mt-2 text-sm leading-6 text-text-sec">{featured ? videoExcerpt(featured.description, 150) || "Watch Indigenous events, conversations and community coverage from IOPPS." : unavailable ? "The broadcast feed is temporarily unavailable. Visit our YouTube channel for the latest coverage." : "Explore IOPPS on YouTube, and check back for our next broadcast."}</p>
        {data?.warning && featured && <p className="mt-2 text-xs leading-5 text-text-sec" role="status">{data.warning}</p>}
      </div>
      <div className="p-4">
        {featured?.embeddable ? <YouTubePlayer videoId={featured.id} title={`Watch ${featured.title}`} /> : <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-bg px-6 text-center"><a href={featured ? videoUrl(featured.id) : YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-teal underline">Watch IOPPS on YouTube ↗</a></div>}
      </div>
      <div className="border-t border-border p-5">
        <Link href={featured ? `/livestreams?video=${featured.id}` : "/livestreams"} className="flex min-h-12 items-center justify-center rounded-xl button-gradient px-4 py-3 text-sm font-bold text-white no-underline">{isLive ? "Join the broadcast" : "Watch & explore IOPPS Live"} <span aria-hidden="true" className="ml-2">↗</span></Link>
      </div>
    </Card>
  </section>;
}

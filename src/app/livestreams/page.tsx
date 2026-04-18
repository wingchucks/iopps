"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Badge from "@/components/Badge";
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

const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@iopps";
const YOUTUBE_SUBSCRIBE_URL = "https://www.youtube.com/@iopps?sub_confirmation=1";
const LIVESTREAM_INQUIRY_URL = "mailto:partnership@iopps.ca?subject=Livestream%20Production%20Inquiry";
const SERVICE_TYPES = [
  "Pow wows and cultural events",
  "Conferences and panels",
  "Hockey and tournament coverage",
  "Community and business broadcasts",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Regina",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Regina",
    timeZoneName: "short",
  });
}

function formatViews(count?: string) {
  if (!count) return "";
  const parsed = parseInt(count, 10);
  if (Number.isNaN(parsed)) return "";
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M views`;
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(1)}K views`;
  return `${parsed} views`;
}

function getVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// M-8 — YouTube descriptions imported from the Data API often come in
// ALL CAPS plus pasted URLs + hashtags + "subscribe and follow" boilerplate.
// The featured replay card used to render them verbatim, which read as raw
// and unedited. Normalize before rendering.
function cleanYouTubeCaption(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  // Drop URLs.
  t = t.replace(/https?:\/\/\S+/g, "").trim();
  // Drop lines of repeated hashtags / social handles.
  t = t.replace(/(?:^|\s)#\S+/g, "").replace(/(?:^|\s)@\S+/g, "").trim();
  // If the text is more than 70% uppercase letters, sentence-case it.
  const letters = t.match(/[A-Za-z]/g) || [];
  const upperLetters = t.match(/[A-Z]/g) || [];
  if (letters.length > 0 && upperLetters.length / letters.length > 0.7) {
    t = t.toLowerCase().replace(/(^\s*|(?<=[.!?]\s))([a-z])/g, (_m, lead, ch) => lead + ch.toUpperCase());
  }
  return t.replace(/\s+/g, " ").trim();
}

function snippet(text?: string, maxLength = 180) {
  if (!text) return "";
  const cleaned = cleanYouTubeCaption(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}...`;
}

export default function LivestreamsPage() {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(null);
  const playerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/livestreams/youtube");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextData = (await response.json()) as YouTubeData;
        if (cancelled) return;
        setData(nextData);
        setError(null);
        setSelectedReplayId(nextData.live ? null : nextData.recent[0]?.id ?? null);
      } catch (fetchError) {
        if (cancelled) return;
        console.error("Failed to load livestreams:", fetchError);
        setError("We could not load the livestream feed right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedReplay =
    data?.recent.find((video) => video.id === selectedReplayId) ??
    data?.recent[0] ??
    null;
  const featuredVideo = data?.live ?? selectedReplay;
  const nextUpcoming = data?.upcoming[0] ?? null;
  const isLive = !!data?.live;

  function chooseReplay(videoId: string) {
    setSelectedReplayId(videoId);
    window.requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <section
          className="relative overflow-hidden border-b border-black/10"
          style={{
            background:
              "linear-gradient(145deg, var(--navy-deep) 0%, var(--navy) 48%, var(--teal) 100%)",
          }}
        >
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
            <Badge
              text={isLive ? "LIVE ON IOPPS" : "IOPPS LIVESTREAMS"}
              color="#FFFFFF"
              bg="rgba(255,255,255,.14)"
            />
            <h1 className="mt-5 max-w-[820px] text-3xl font-black tracking-tight text-white md:text-5xl">
              Watch the livestream here. Hire IOPPS to stream your next event.
            </h1>
            <p className="mt-4 max-w-[700px] text-base leading-relaxed text-white/80 md:text-lg">
              Pow wows, conferences, community gatherings — watch live or catch
              the replay. IOPPS has been livestreaming Indigenous events across
              North America since 2015.
            </p>
          </div>
        </section>

        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
          {loading ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
              <div className="h-[520px] rounded-[28px] bg-card animate-pulse" />
              <div className="h-[420px] rounded-[28px] bg-card animate-pulse" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
                <section ref={playerRef}>
                  <Card className="overflow-hidden" style={{ padding: 0 }}>
                    <div className="border-b border-border px-5 py-5 md:px-6">
                      <div className="flex flex-wrap items-center gap-2">
                        {isLive && <Badge text="LIVE NOW" color="#FFFFFF" bg="#DC2626" />}
                        {!isLive && featuredVideo && (
                          <Badge text="FEATURED REPLAY" color="var(--teal)" />
                        )}
                        {!isLive && !featuredVideo && nextUpcoming && (
                          <Badge text="NEXT STREAM" color="#2563EB" />
                        )}
                        {isLive && data?.live?.concurrentViewers && (
                          <span className="text-sm font-medium text-text-sec">
                            {parseInt(data.live.concurrentViewers, 10).toLocaleString()} watching
                          </span>
                        )}
                      </div>
                      <h2 className="mt-4 text-2xl font-black tracking-tight text-text md:text-3xl">
                        {isLive
                          ? "Watch live on IOPPS"
                          : featuredVideo
                            ? "Recent replay"
                            : nextUpcoming
                              ? "Coming up next"
                              : "IOPPS Live"}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-text-sec md:text-base">
                        {isLive
                          ? "Join the live broadcast right here, or open it on YouTube."
                          : featuredVideo
                            ? "Catch up on a recent Indigenous event streamed by IOPPS."
                            : nextUpcoming
                              ? "Save the date — this broadcast goes live soon."
                              : "Follow us on YouTube to get notified when the next stream starts."}
                      </p>
                    </div>

                    <div className="px-4 py-4 md:px-6 md:py-6">
                      {featuredVideo ? (
                        <YouTubePlayer
                          videoId={featuredVideo.id}
                          autoplay={isLive}
                          live={isLive}
                        />
                      ) : nextUpcoming ? (
                        <div className="overflow-hidden rounded-2xl border border-border bg-bg">
                          {nextUpcoming.thumbnail ? (
                            <img
                              src={nextUpcoming.thumbnail}
                              alt={nextUpcoming.title}
                              className="aspect-video w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center bg-navy text-4xl text-white">
                              ▶
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-bg px-6 text-center">
                          <p className="max-w-[420px] text-sm leading-relaxed text-text-sec">
                            {error ||
                              "Nothing is live right now — follow us on YouTube for alerts, or get in touch to have your next event streamed by IOPPS."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border px-5 py-5 md:px-6">
                      {featuredVideo ? (
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                          <div className="max-w-[760px]">
                            <h3 className="text-xl font-bold text-text">
                              {featuredVideo.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-text-sec md:text-base">
                              {snippet(featuredVideo.description, 220) ||
                                (isLive
                                  ? "IOPPS is live now."
                                  : "Watch this IOPPS replay here, then explore more productions below.")}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted">
                              {isLive && data?.live?.actualStart && (
                                <span>Started {formatDateTime(data.live.actualStart)}</span>
                              )}
                              {!isLive && featuredVideo.publishedAt && (
                                <span>Published {formatDate(featuredVideo.publishedAt)}</span>
                              )}
                              {featuredVideo.viewCount && (
                                <span>{formatViews(featuredVideo.viewCount)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <a
                              href={getVideoUrl(featuredVideo.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white no-underline"
                              style={{
                                background: isLive ? "#DC2626" : "var(--teal)",
                              }}
                            >
                              {isLive
                                ? "Open live stream on YouTube"
                                : "Open replay on YouTube"}
                            </a>
                            <a
                              href={YOUTUBE_SUBSCRIBE_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold no-underline"
                              style={{ color: "var(--navy-deep)" }}
                            >
                              Subscribe for alerts
                            </a>
                          </div>
                        </div>
                      ) : nextUpcoming ? (
                        <div className="flex flex-col gap-3">
                          <h3 className="text-xl font-bold text-text">
                            {nextUpcoming.title}
                          </h3>
                          {nextUpcoming.scheduledStart && (
                            <p className="text-sm font-semibold text-text">
                              Starts {formatDateTime(nextUpcoming.scheduledStart)}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </Card>
                </section>

                <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                  <Card
                    className="overflow-hidden"
                    style={{
                      padding: 0,
                      background:
                        "linear-gradient(180deg, rgba(15,43,76,.98) 0%, rgba(9,30,54,1) 100%)",
                      borderColor: "rgba(20,184,166,.18)",
                    }}
                  >
                    <div className="p-6 md:p-7">
                      <Badge
                        text="HIRE IOPPS LIVE"
                        color="#FFFFFF"
                        bg="rgba(20,184,166,.18)"
                      />
                      <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                        Need your event livestreamed?
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-white/80 md:text-base">
                        We bring pow wows, conferences, and community
                        gatherings to audiences everywhere. Professional
                        multi-camera production, reliable streams, and replays
                        that live on so your moment keeps reaching people.
                      </p>
                      <div className="mt-6 space-y-3 text-sm text-white/90">
                        {SERVICE_TYPES.map((service) => (
                          <div key={service} className="flex items-start gap-3">
                            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-teal-light" />
                            <span>{service}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-7 flex flex-col gap-3">
                        <a
                          href={LIVESTREAM_INQUIRY_URL}
                          className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white no-underline"
                          style={{ background: "var(--teal)" }}
                        >
                          Book IOPPS to livestream your event
                        </a>
                        <Link
                          href="/contact"
                          className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-bold text-white no-underline"
                          style={{
                            borderColor: "rgba(255,255,255,.18)",
                            background: "rgba(255,255,255,.06)",
                          }}
                        >
                          Contact the IOPPS team
                        </Link>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
                      Follow IOPPS
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-text-sec">
                      Subscribe on YouTube to catch new livestreams, replays,
                      and upcoming event coverage.
                    </p>
                    <div className="mt-4 space-y-3">
                      <a
                        href={YOUTUBE_CHANNEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-2xl border border-border px-4 py-4 text-left no-underline transition-colors hover:bg-bg"
                      >
                        <p className="font-bold text-text">YouTube channel</p>
                        <p className="mt-1 text-sm text-text-sec">
                          Full livestreams and replay coverage
                        </p>
                      </a>
                      <a
                        href={YOUTUBE_SUBSCRIBE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold no-underline"
                        style={{ color: "var(--navy-deep)" }}
                      >
                        Subscribe on YouTube
                      </a>
                    </div>
                  </Card>
                </aside>
              </div>

              {data?.upcoming && data.upcoming.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-2xl font-black tracking-tight text-text">
                    Upcoming streams
                  </h2>
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {data.upcoming.map((video) => (
                      <Card key={video.id} style={{ padding: 0 }} className="overflow-hidden">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="aspect-video w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center bg-navy text-4xl text-white">
                            ▶
                          </div>
                        )}
                        <div className="p-5">
                          <p className="text-lg font-bold leading-snug text-text">
                            {video.title}
                          </p>
                          {video.scheduledStart && (
                            <p className="mt-2 text-sm font-semibold text-text">
                              {formatDateTime(video.scheduledStart)}
                            </p>
                          )}
                          <a
                            href={getVideoUrl(video.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white no-underline"
                            style={{ background: "var(--teal)" }}
                          >
                            Open watch page
                          </a>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {data?.recent && data.recent.length > 0 && (
                <section className="mt-10">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <h2 className="text-2xl font-black tracking-tight text-text">
                      Recent productions
                    </h2>
                    {!isLive && (
                      <p className="text-sm font-medium text-text-muted">
                        Select a replay to load it in the player above.
                      </p>
                    )}
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {data.recent.map((video) => {
                      const card = (
                        <Card
                          className="h-full overflow-hidden"
                          style={{
                            padding: 0,
                            borderColor:
                              !isLive && selectedReplayId === video.id
                                ? "var(--teal)"
                                : undefined,
                          }}
                        >
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="aspect-video w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center bg-navy text-4xl text-white">
                              ▶
                            </div>
                          )}
                          <div className="p-4">
                            <p className="line-clamp-2 text-base font-bold text-text">
                              {video.title}
                            </p>
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-sec">
                              {snippet(video.description, 110) ||
                                "Watch this replay on YouTube."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                              {video.viewCount && (
                                <span>{formatViews(video.viewCount)}</span>
                              )}
                              <span>{formatDate(video.publishedAt)}</span>
                            </div>
                          </div>
                        </Card>
                      );

                      return isLive ? (
                        <a
                          key={video.id}
                          href={getVideoUrl(video.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="no-underline"
                        >
                          {card}
                        </a>
                      ) : (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => chooseReplay(video.id)}
                          className="text-left"
                        >
                          {card}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}

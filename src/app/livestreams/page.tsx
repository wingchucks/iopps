"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatViews(count: string | undefined) {
  if (!count) return "";
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

export default function LivestreamsPage() {
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/livestreams/youtube")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.live) setActiveVideo(d.live.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        {/* Hero */}
        <section
          className="relative overflow-hidden text-center"
          style={{
            background:
              "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
            padding: "clamp(40px, 6vw, 64px) clamp(20px, 6vw, 80px)",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              top: -80,
              right: -80,
              width: 300,
              height: 300,
              background: "rgba(220,38,38,.06)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: -40,
              left: -40,
              width: 200,
              height: 200,
              background: "rgba(13,148,136,.06)",
            }}
          />

          {/* Live icon */}
          <div
            className="relative mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(220,38,38,.15)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(220,38,38,.3)" }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: "#DC2626",
                  animation: data?.live
                    ? "pulse-live 2s ease-in-out infinite"
                    : undefined,
                }}
              />
            </div>
          </div>

          <h1 className="relative text-white font-black text-2xl md:text-4xl mb-3">
            IOPPS Live
          </h1>
          <p
            className="relative text-base md:text-lg mx-auto max-w-[520px] leading-relaxed"
            style={{ color: "rgba(255,255,255,.7)" }}
          >
            Live streams, interviews, panels, and community events — streaming
            directly to you.
          </p>
        </section>

        <div className="max-w-[1000px] mx-auto px-4 md:px-10 py-8">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-card animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {/* LIVE NOW */}
              {data?.live && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-extrabold text-text">
                      Live Now
                    </h2>
                    <Badge
                      text="LIVE"
                      color="#fff"
                      bg="#DC2626"
                      icon={
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-white"
                          style={{
                            animation: "pulse-live 2s ease-in-out infinite",
                          }}
                        />
                      }
                    />
                    {data.live.concurrentViewers && (
                      <span className="text-xs text-text-muted">
                        {parseInt(data.live.concurrentViewers).toLocaleString()}{" "}
                        watching
                      </span>
                    )}
                  </div>
                  <YouTubePlayer
                    videoId={data.live.id}
                    autoplay
                    live
                  />
                  <p className="mt-3 font-bold text-text text-lg">
                    {data.live.title}
                  </p>
                </section>
              )}

              {/* UPCOMING */}
              {data?.upcoming && data.upcoming.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-extrabold text-text mb-4">
                    Upcoming
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.upcoming.map((v) => (
                      <Card key={v.id} style={{ padding: 0, overflow: "hidden" }}>
                        <div className="relative">
                          {v.thumbnail && (
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              className="w-full aspect-video object-cover"
                            />
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge text="UPCOMING" color="#3B82F6" small />
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="font-bold text-text text-sm mb-1 line-clamp-2">
                            {v.title}
                          </p>
                          {v.scheduledStart && (
                            <p className="text-xs text-text-muted">
                              {formatDateTime(v.scheduledStart)}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* ACTIVE PLAYER for selected past stream */}
              {activeVideo && !data?.live && (
                <section className="mb-10">
                  <YouTubePlayer videoId={activeVideo} />
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="mt-2 text-xs text-text-muted hover:text-text cursor-pointer"
                  >
                    Close player
                  </button>
                </section>
              )}

              {/* RECENT STREAMS */}
              {data?.recent && data.recent.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xl font-extrabold text-text mb-4">
                    Recent Streams
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.recent.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setActiveVideo(v.id)}
                        className="text-left cursor-pointer bg-transparent border-0 p-0 group"
                      >
                        <Card
                          style={{
                            padding: 0,
                            overflow: "hidden",
                            outline:
                              activeVideo === v.id
                                ? "2px solid var(--teal)"
                                : undefined,
                          }}
                        >
                          <div className="relative">
                            {v.thumbnail ? (
                              <img
                                src={v.thumbnail}
                                alt={v.title}
                                className="w-full aspect-video object-cover"
                              />
                            ) : (
                              <div className="w-full aspect-video bg-navy flex items-center justify-center text-white text-3xl">
                                ▶
                              </div>
                            )}
                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="var(--navy)"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="font-bold text-text text-sm mb-1 line-clamp-2">
                              {v.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              {v.viewCount && (
                                <span>{formatViews(v.viewCount)}</span>
                              )}
                              <span>{formatDate(v.publishedAt)}</span>
                            </div>
                          </div>
                        </Card>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* No content state */}
              {!data?.live &&
                (!data?.upcoming || data.upcoming.length === 0) &&
                (!data?.recent || data.recent.length === 0) && (
                  <div className="text-center py-16">
                    <p className="text-4xl mb-4">📡</p>
                    <p className="text-lg font-bold text-text mb-2">
                      No streams yet
                    </p>
                    <p className="text-sm text-text-sec max-w-[400px] mx-auto">
                      Subscribe to the IOPPS YouTube channel to get notified
                      when we go live.
                    </p>
                  </div>
                )}

              {/* Subscribe CTA */}
              <section className="text-center border-t border-border pt-10 pb-4">
                <p className="text-lg font-extrabold text-text mb-2">
                  Never Miss a Stream
                </p>
                <p className="text-sm text-text-sec mb-5 max-w-[400px] mx-auto">
                  Subscribe to the IOPPS YouTube channel and turn on
                  notifications to catch every livestream.
                </p>
                <a
                  href="https://www.youtube.com/@iopps?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[14px] px-7 py-3 font-bold text-sm no-underline text-white"
                  style={{ background: "#DC2626" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Subscribe on YouTube
                </a>
              </section>
            </>
          )}
        </div>

        <style>{`
          @keyframes pulse-live {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
        `}</style>
      </div>
    </AppShell>
  );
}

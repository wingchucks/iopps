"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import PageSkeleton from "@/components/PageSkeleton";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Livestream {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  scheduledDate: string;
  status: "scheduled" | "live" | "archived";
  category?: string;
  duration?: string;
  viewCount: number;
  createdAt: unknown;
}

const categories = ["All", "Interviews", "Community Stories", "Events", "Training"];

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return count.toLocaleString();
}

function extractEmbedUrl(url: string): string {
  if (!url) return "";
  // YouTube watch URL -> embed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Already an embed URL
  if (url.includes("/embed/")) return url;
  return url;
}

export default function SpotlightPage() {
  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      <SpotlightContent />
    </div>
    </AppShell>
  );
}

function SpotlightContent() {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  const load = useCallback(async () => {
    try {
      const q = query(collection(db, "livestreams"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setStreams(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Livestream)
      );
    } catch (err) {
      console.error("Failed to load spotlight data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageSkeleton variant="grid" />;

  const liveStream = streams.find((s) => s.status === "live");
  const featured = streams.find((s) => s.status !== "live");
  const archived = streams.filter((s) => s.id !== liveStream?.id && s.id !== featured?.id);
  const filtered =
    activeCategory === "All"
      ? archived
      : archived.filter(
          (s) => s.category?.toLowerCase() === activeCategory.toLowerCase()
        );

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2B4C 0%, #581C87 50%, #0F2B4C 100%)",
          padding: "clamp(40px, 6vw, 80px) 16px",
        }}
      >
        <div className="max-w-[1100px] mx-auto text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            IOPPS Spotlight
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-[520px] mx-auto">
            Watch interviews, community stories, and livestreams
          </p>
        </div>
        {/* Decorative dots */}
        <div
          className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Live Now Banner */}
      {liveStream && (
        <div className="bg-[#DC2626] text-white">
          <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-bold text-sm tracking-wide">LIVE NOW</span>
            <span className="text-sm text-white/90 truncate">{liveStream.title}</span>
          </div>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto px-4 py-6 md:px-10 md:py-8">
        {/* Live Stream Embed */}
        {liveStream && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge text="LIVE" color="#fff" bg="#DC2626" small />
              <h2 className="text-xl font-extrabold text-text">{liveStream.title}</h2>
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden bg-card border border-border">
              {liveStream.videoUrl ? (
                <iframe
                  src={extractEmbedUrl(liveStream.videoUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={liveStream.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <span className="text-5xl">&#9654;</span>
                </div>
              )}
            </div>
            {liveStream.description && (
              <p className="text-sm text-text-sec mt-3">{liveStream.description}</p>
            )}
          </div>
        )}

        {/* Featured Video */}
        {featured && !liveStream && (
          <div className="mb-8">
            <h2 className="text-xl font-extrabold text-text mb-3">Featured</h2>
            <Card>
              <div className="aspect-video bg-card overflow-hidden">
                {featured.videoUrl ? (
                  <iframe
                    src={extractEmbedUrl(featured.videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={featured.title}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #0F2B4C 0%, #581C87 100%)",
                    }}
                  >
                    <span className="text-6xl text-white/30">&#9654;</span>
                  </div>
                )}
              </div>
              <div style={{ padding: 20 }}>
                <h3 className="text-lg font-bold text-text mb-1">{featured.title}</h3>
                {featured.description && (
                  <p className="text-sm text-text-sec mb-2 line-clamp-2">
                    {featured.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  {featured.scheduledDate && <span>{featured.scheduledDate}</span>}
                  {featured.viewCount > 0 && <span>{formatViewCount(featured.viewCount)} views</span>}
                  {featured.category && (
                    <Badge text={featured.category} color="var(--teal)" small />
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeCategory === cat
                  ? "bg-[var(--navy)] text-white"
                  : "bg-card text-text-sec border border-border hover:bg-bg"
              }`}
              style={{ border: activeCategory === cat ? "none" : undefined }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Archive Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#127909;</p>
            <h3 className="text-lg font-bold text-text mb-1">No videos yet</h3>
            <p className="text-sm text-text-muted">
              {activeCategory === "All"
                ? "Check back soon for new content."
                : `No ${activeCategory.toLowerCase()} videos available.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <a
                key={s.id}
                href={s.videoUrl || "#"}
                target={s.videoUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="no-underline group"
              >
                <Card className="h-full">
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden">
                    {s.thumbnailUrl ? (
                      <img
                        src={s.thumbnailUrl}
                        alt={s.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, #0F2B4C 0%, #581C87 100%)",
                        }}
                      >
                        <span className="text-4xl text-white/30 group-hover:text-white/50 transition-colors">
                          &#9654;
                        </span>
                      </div>
                    )}
                    {/* Duration badge */}
                    {s.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                        {s.duration}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <h4 className="text-sm font-bold text-text mb-1 line-clamp-2 group-hover:text-teal transition-colors">
                      {s.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {s.scheduledDate && <span>{s.scheduledDate}</span>}
                      {s.viewCount > 0 && <span>{formatViewCount(s.viewCount)} views</span>}
                      {s.category && (
                        <Badge text={s.category} color="var(--teal)" small />
                      )}
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

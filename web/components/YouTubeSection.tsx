"use client";

import { useEffect, useState, useCallback } from "react";
import { PlayIcon, VideoCameraIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { LiveStreamInfo, YouTubeVideo } from "@/lib/youtube";
import { IOPPS_SUBSCRIBE_URL, IOPPS_CHANNEL_URL } from "@/lib/youtube";

// Polling interval for live status (60 seconds)
const LIVE_CHECK_INTERVAL = 60000;

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function VideoCard({ video }: { video: YouTubeVideo }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-surface transition-all hover:border-[var(--card-border)] hover:bg-surface hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-surface">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Play overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <PlayIcon className="h-7 w-7 text-white ml-1" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h4 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-teal-300 transition-colors">
          {video.title}
        </h4>
        {video.publishedAt && (
          <p className="mt-2 text-xs text-foreground0">
            {formatDate(video.publishedAt)}
          </p>
        )}
      </div>
    </a>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-surface">
      <div className="aspect-video animate-pulse bg-surface" />
      <div className="p-4 space-y-2">
        <div className="h-4 animate-pulse rounded bg-slate-700 w-full" />
        <div className="h-4 animate-pulse rounded bg-slate-700 w-3/4" />
        <div className="h-3 animate-pulse rounded bg-surface w-1/4 mt-3" />
      </div>
    </div>
  );
}

function LiveBanner({
  liveInfo,
  onWatchClick,
}: {
  liveInfo: LiveStreamInfo;
  onWatchClick: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-red-500/50 bg-gradient-to-br from-red-900/30 via-red-800/20 to-slate-900 p-6 sm:p-8">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-red-500/5 animate-pulse" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-red-400">
              Live Now
            </span>
            {liveInfo.viewerCount && (
              <span className="rounded-full bg-surface px-3 py-1 text-xs text-[var(--text-secondary)]">
                {liveInfo.viewerCount.toLocaleString()} watching
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {liveInfo.title || "IOPPS is Live!"}
          </h2>

          {liveInfo.description && (
            <p className="max-w-xl text-[var(--text-secondary)] line-clamp-2">
              {liveInfo.description}
            </p>
          )}
        </div>

        <button
          onClick={onWatchClick}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-500 hover:scale-105 hover:shadow-xl hover:shadow-red-900/40"
        >
          <PlayIcon className="h-6 w-6" />
          Watch Live
        </button>
      </div>
    </div>
  );
}

function LivePlayer({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="text-sm font-semibold text-red-400">Live Stream</span>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          Minimize
        </button>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-red-500/30 bg-black shadow-2xl shadow-red-900/20">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="h-full w-full"
          title="IOPPS Live Stream"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function NotLiveStatus() {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
          <VideoCameraIcon className="h-7 w-7 text-foreground0" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Not Currently Live</h3>
          <p className="mt-1 text-[var(--text-muted)]">
            Check out our past broadcasts below or subscribe to get notified when we go live.
          </p>
        </div>
        <a
          href={IOPPS_SUBSCRIBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Subscribe
        </a>
      </div>
    </div>
  );
}

export function YouTubeSection() {
  const [liveStatus, setLiveStatus] = useState<LiveStreamInfo | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLivePlayer, setShowLivePlayer] = useState(false);
  const [error, setError] = useState(false);

  const fetchLiveStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/youtube/live-status");
      if (response.ok) {
        const data = await response.json();
        setLiveStatus(data);
        // Auto-show player when going live
        if (data.isLive && !liveStatus?.isLive) {
          setShowLivePlayer(true);
        }
      }
    } catch (err) {
      console.error("Error fetching live status:", err);
    }
  }, [liveStatus?.isLive]);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await fetch("/api/youtube/recent-videos?limit=8");
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLiveStatus();
    fetchVideos();

    // Poll for live status
    const interval = setInterval(fetchLiveStatus, LIVE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchLiveStatus, fetchVideos]);

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">IOPPS Live & Videos</h2>
          <p className="text-[var(--text-muted)]">
            Watch our live broadcasts and past streams from the community.
          </p>
        </div>
        <a
          href={IOPPS_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-teal-300 transition-colors"
        >
          View Channel
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </a>
      </div>

      {/* Live Status Section */}
      {liveStatus?.isLive ? (
        showLivePlayer && liveStatus.videoId ? (
          <LivePlayer
            videoId={liveStatus.videoId}
            onClose={() => setShowLivePlayer(false)}
          />
        ) : (
          <LiveBanner
            liveInfo={liveStatus}
            onWatchClick={() => setShowLivePlayer(true)}
          />
        )
      ) : (
        <NotLiveStatus />
      )}

      {/* Recent Videos Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-t border-[var(--card-border)]/50 pt-8">
          <h3 className="text-xl font-bold text-foreground">
            Past Broadcasts & Replays
          </h3>
          <a
            href={`${IOPPS_CHANNEL_URL}/videos`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--text-muted)] hover:text-white transition-colors"
          >
            View all
          </a>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : error || videos.length === 0 ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-8 text-center">
            <VideoCameraIcon className="mx-auto h-12 w-12 text-[var(--text-secondary)]" />
            <h4 className="mt-4 text-lg font-semibold text-white">
              No videos available
            </h4>
            <p className="mt-2 text-[var(--text-muted)]">
              Visit our YouTube channel to see all our content.
            </p>
            <a
              href={IOPPS_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Visit YouTube Channel
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* CTA Card */}
      <div className="rounded-2xl border border-[var(--card-border)]/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">
              Never miss a broadcast
            </h4>
            <p className="mt-1 text-[var(--text-muted)]">
              Subscribe to our channel and turn on notifications to be the first to know when we go live.
            </p>
          </div>
          <a
            href={IOPPS_SUBSCRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-500 whitespace-nowrap"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Subscribe on YouTube
          </a>
        </div>
      </div>
    </section>
  );
}

"use client";

import { CompanyVideo } from "@/lib/types";

interface CompanyIntroVideoProps {
  video: CompanyVideo;
  organizationName: string;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extracts Vimeo video ID from various Vimeo URL formats
 */
function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export default function CompanyIntroVideo({
  video,
  organizationName,
}: CompanyIntroVideoProps) {
  // Get the video ID based on provider
  let videoId: string | null = video.videoId || null;

  if (!videoId) {
    if (video.videoProvider === "youtube" || !video.videoProvider) {
      videoId = extractYouTubeId(video.videoUrl);
    } else if (video.videoProvider === "vimeo") {
      videoId = extractVimeoId(video.videoUrl);
    }
  }

  if (!videoId) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-gradient-to-br from-emerald-900/20 to-slate-950/50 p-6 backdrop-blur-sm">
      {/* Section Header */}
      <div className="mb-6 border-b border-[var(--card-border)] pb-4">
        <h2 className="text-2xl font-bold text-foreground">
          {video.title || `About ${organizationName}`}
        </h2>
        {video.description && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{video.description}</p>
        )}
      </div>

      {/* Video Player */}
      <div>
        <div className="relative overflow-hidden rounded-lg" style={{ paddingBottom: "56.25%" }}>
          {video.videoProvider === "vimeo" ? (
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://player.vimeo.com/video/${videoId}?color=14B8A6&title=0&byline=0&portrait=0`}
              title={video.title || `About ${organizationName}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&color=white`}
              title={video.title || `About ${organizationName}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </section>
  );
}

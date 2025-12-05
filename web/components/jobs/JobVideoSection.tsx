"use client";

import { JobVideo } from "@/lib/types";

interface JobVideoSectionProps {
  video: JobVideo;
  jobTitle: string;
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

export default function JobVideoSection({
  video,
  jobTitle,
}: JobVideoSectionProps) {
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
    <section className="rounded-2xl border border-slate-800 bg-[#08090C] p-6 sm:p-8">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {video.isIOPPSInterview && (
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-400">
              IOPPS Interview
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-200">
          {video.title || `Learn More About This Role`}
        </h2>
        {video.description && (
          <p className="mt-2 text-sm text-slate-400">{video.description}</p>
        )}
      </div>

      {/* Video Player */}
      <div>
        <div className="relative overflow-hidden rounded-lg" style={{ paddingBottom: "56.25%" }}>
          {video.videoProvider === "vimeo" ? (
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://player.vimeo.com/video/${videoId}?color=14B8A6&title=0&byline=0&portrait=0`}
              title={video.title || jobTitle}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&color=white`}
              title={video.title || jobTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </section>
  );
}

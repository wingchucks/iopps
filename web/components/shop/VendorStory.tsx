"use client";

import type { Vendor } from "@/lib/firebase/vendors";

interface VendorStoryProps {
  vendor: Vendor;
}

export function VendorStory({ vendor }: VendorStoryProps) {
  if (!vendor.description) {
    return null;
  }

  // Parse description - support basic markdown-like formatting
  const paragraphs = vendor.description.split("\n\n").filter(Boolean);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100">Our Story</h2>
      <div className="prose prose-invert prose-slate max-w-none">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-slate-300 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Video Embed */}
      {vendor.videoUrl && (
        <div className="mt-6">
          <VideoEmbed url={vendor.videoUrl} />
        </div>
      )}
    </div>
  );
}

/**
 * Video embed component for YouTube/Vimeo
 */
function VideoEmbed({ url }: { url: string }) {
  // Extract video ID from various URL formats
  let videoId = "";
  let platform: "youtube" | "vimeo" | null = null;

  // YouTube patterns
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    videoId = youtubeMatch[1];
    platform = "youtube";
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    videoId = vimeoMatch[1];
    platform = "vimeo";
  }

  if (!platform || !videoId) {
    // Fallback: just show a link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-[#14B8A6] hover:underline"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Watch our video
      </a>
    );
  }

  const embedUrl =
    platform === "youtube"
      ? `https://www.youtube.com/embed/${videoId}`
      : `https://player.vimeo.com/video/${videoId}`;

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
      <iframe
        src={embedUrl}
        title="Vendor video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

export function VendorStorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-32 animate-pulse rounded bg-slate-800" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}

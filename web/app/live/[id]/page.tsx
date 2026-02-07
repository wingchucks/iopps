"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getLiveStream } from "@/lib/firestore";
import type { LiveStreamEvent } from "@/lib/types";
import { ArrowLeft, Radio, Clock, PlayCircle, Monitor, Calendar, User, Tag } from "lucide-react";

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      // youtube.com/watch?v=ID or youtube.com/live/ID or youtu.be/ID
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/live/")) return u.pathname.split("/live/")[1];
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1];
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
    }
  } catch {
    // not a valid URL
  }
  return null;
}

function getEmbedUrl(stream: LiveStreamEvent): string | null {
  // Try videoUrl first
  if (stream.videoUrl) {
    const ytId = extractYouTubeId(stream.videoUrl);
    if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  }
  // Try platform field (sometimes contains a YouTube URL)
  if (stream.platform) {
    const ytId = extractYouTubeId(stream.platform);
    if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Live Now") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        Live Now
      </span>
    );
  }

  if (status === "Upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
        <Clock className="h-3 w-3" />
        Upcoming
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/50 border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-300">
      <PlayCircle className="h-3 w-3" />
      Replay
    </span>
  );
}

export default function LiveStreamDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [stream, setStream] = useState<LiveStreamEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getLiveStream(id);
        setStream(data);
      } catch (error) {
        console.error("Error loading live stream:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020306] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-[#020306]">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <Link
            href="/live"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live
          </Link>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <Radio className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-300 mb-2">
              Stream Not Found
            </h2>
            <p className="text-sm text-slate-500">
              This live stream may have been removed or the link is invalid.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const embedUrl = getEmbedUrl(stream);

  return (
    <div className="min-h-screen bg-[#020306]">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {/* Back nav */}
        <Link
          href="/live"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live
        </Link>

        {/* Status + Title */}
        <div className="mb-6">
          <div className="mb-3">
            <StatusBadge status={stream.status} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">{stream.title}</h1>
        </div>

        {/* Video Embed or Platform Card */}
        {embedUrl ? (
          <div className="mb-6 rounded-2xl overflow-hidden border border-slate-800 bg-black">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                src={embedUrl}
                title={stream.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <Monitor className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p className="text-sm font-medium text-slate-300 mb-1">
              Streaming on {stream.platform || "External Platform"}
            </p>
            {stream.videoUrl ? (
              <a
                href={stream.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                Watch on {stream.platform || "Platform"}
              </a>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                No direct link available yet. Check back closer to the stream
                time.
              </p>
            )}
          </div>
        )}

        {/* Stream Metadata Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Stream Details
          </h2>

          <div className="space-y-4">
            {stream.host && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Host</p>
                  <p className="text-sm text-slate-200">{stream.host}</p>
                </div>
              </div>
            )}

            {stream.category && (
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="text-sm text-slate-200">{stream.category}</p>
                </div>
              </div>
            )}

            {stream.startTime && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Start Time</p>
                  <p className="text-sm text-slate-200">
                    {new Date(stream.startTime).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )}

            {stream.platform && (
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Platform</p>
                  <p className="text-sm text-slate-200">{stream.platform}</p>
                </div>
              </div>
            )}

            {stream.description && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Description</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {stream.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

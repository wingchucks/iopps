export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "IOPPS Live — Indigenous Livestreams & Replays | IOPPS.ca",
  description:
    "Watch live broadcasts and replays of pow wows, Indigenous sports, community events, and professional gatherings from across Canada.",
  path: "/live",
  type: "website",
});

interface Livestream {
  id: string;
  title: string;
  description: string;
  youtubeVideoId?: string;
  streamCategory?: string;
  isLive?: boolean;
  coverImage?: string;
  orgName?: string;
  orgLogoURL?: string;
  createdAt?: { seconds: number };
  startDate?: { seconds: number };
  status: string;
}

async function getLivestreams(): Promise<Livestream[]> {
  if (!adminDb) return [];
  try {
    const snapshot = await adminDb
      .collection("posts")
      .where("type", "==", "livestream")
      .where("status", "==", "active")
      .orderBy("isLive", "desc") // Live streams first
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Livestream[];
  } catch {
    return [];
  }
}

function formatDate(seconds?: number): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function getYouTubeThumbnail(videoId?: string): string | null {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default async function LivePage() {
  const streams = await getLivestreams();
  const liveNow = streams.filter((s) => s.isLive);
  const replays = streams.filter((s) => !s.isLive);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">IOPPS Live</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Watch live broadcasts and replays of pow wows, Indigenous sports,
          community events, and professional gatherings from across Canada.
        </p>
      </section>

      {/* Live Now Section */}
      {liveNow.length > 0 && (
        <section className="py-12 px-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Live Now
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {liveNow.map((stream) => (
              <Link
                key={stream.id}
                href={`/live/${stream.id}`}
                className="group block bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48 bg-[var(--surface-raised)] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      stream.coverImage ||
                      getYouTubeThumbnail(stream.youtubeVideoId) ||
                      "/placeholder-video.png"
                    }
                    alt={stream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    LIVE
                  </div>
                </div>
                <div className="p-5">
                  {stream.streamCategory && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2 block">
                      {stream.streamCategory}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-2">
                    {stream.title}
                  </h3>
                  {stream.orgName && (
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      {stream.orgName}
                    </p>
                  )}
                  <p className="text-sm text-[var(--text-secondary)]">
                    {truncate(stream.description, 120)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Replays Section */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
          {liveNow.length > 0 ? "Replays" : "Recent Broadcasts"}
        </h2>

        {replays.length === 0 && liveNow.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">📺</span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              No Streams Yet
            </h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-8">
              We&apos;re gearing up to bring you live coverage of pow wows,
              Indigenous sports, and community events. Check back soon!
            </p>
            <Link
              href="/contact"
              className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Request Coverage
            </Link>
          </div>
        ) : replays.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-center py-8">
            No replays available yet. Check back after the live broadcast ends!
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {replays.map((stream) => (
              <Link
                key={stream.id}
                href={`/live/${stream.id}`}
                className="group block bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative h-40 bg-[var(--surface-raised)] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      stream.coverImage ||
                      getYouTubeThumbnail(stream.youtubeVideoId) ||
                      "/placeholder-video.png"
                    }
                    alt={stream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 rounded-full p-3">
                      <svg
                        className="w-6 h-6 text-[var(--accent)]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {stream.streamCategory && (
                    <span className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full mb-2 inline-block">
                      {stream.streamCategory}
                    </span>
                  )}
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1 line-clamp-2">
                    {stream.title}
                  </h3>
                  {stream.orgName && (
                    <p className="text-xs text-[var(--text-secondary)] mb-1">
                      {stream.orgName}
                    </p>
                  )}
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDate(
                      stream.startDate?.seconds || stream.createdAt?.seconds
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section className="bg-[var(--surface-raised)] py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            What We Cover
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
            Professional multi-camera livestream production for Indigenous
            events across Canada.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: "🪶", label: "Pow Wows", desc: "Traditional gatherings" },
              {
                emoji: "🏒",
                label: "Sports",
                desc: "Hockey, lacrosse, & more",
              },
              {
                emoji: "🎤",
                label: "Conferences",
                desc: "Professional events",
              },
              {
                emoji: "🎉",
                label: "Community",
                desc: "Celebrations & gatherings",
              },
            ].map((cat) => (
              <div
                key={cat.label}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6"
              >
                <span className="text-3xl mb-2 block">{cat.emoji}</span>
                <h3 className="font-bold text-[var(--text-primary)]">
                  {cat.label}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {cat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Want Your Event Livestreamed?
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
          We bring professional multi-camera production to pow wows, sports
          tournaments, conferences, and community events. Reach a global
          audience.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Request Coverage
          </Link>
          <Link
            href="/events"
            className="inline-block border border-[var(--card-border)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </section>
    </div>
  );
}

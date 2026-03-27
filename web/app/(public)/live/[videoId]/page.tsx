export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { buildMetadata } from "@/lib/seo";

interface Livestream {
  id: string;
  title: string;
  description: string;
  youtubeVideoId?: string;
  streamCategory?: string;
  isLive?: boolean;
  coverImage?: string;
  orgId?: string;
  orgName?: string;
  orgLogoURL?: string;
  createdAt?: { seconds: number };
  startDate?: { seconds: number };
  endDate?: { seconds: number };
  venue?: string;
  location?: { city: string; province: string };
  status: string;
}

async function getLivestream(id: string): Promise<Livestream | null> {
  if (!adminDb) return null;
  try {
    const doc = await adminDb.collection("posts").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (data?.type !== "livestream" || data?.status !== "active") return null;
    return { id: doc.id, ...data } as Livestream;
  } catch {
    return null;
  }
}

async function getRelatedStreams(
  currentId: string,
  category?: string
): Promise<Livestream[]> {
  if (!adminDb) return [];
  try {
    const query = adminDb
      .collection("posts")
      .where("type", "==", "livestream")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(7);

    const snapshot = await query.get();
    return snapshot.docs
      .filter((doc) => doc.id !== currentId)
      .slice(0, 6)
      .map((doc) => ({ id: doc.id, ...doc.data() })) as Livestream[];
  } catch {
    return [];
  }
}

export async function generateMetadata(props: {
  params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
  const { videoId } = await props.params;
  const stream = await getLivestream(videoId);

  if (!stream) {
    return buildMetadata({
      title: "Video Not Found | IOPPS.ca",
      description: "The requested video could not be found.",
      path: `/live/${videoId}`,
    });
  }

  return buildMetadata({
    title: `${stream.isLive ? "🔴 LIVE: " : ""}${stream.title} | IOPPS Live`,
    description: stream.description?.slice(0, 160) || "Watch on IOPPS Live",
    path: `/live/${videoId}`,
    type: "website",
    image: stream.coverImage || 
      (stream.youtubeVideoId 
        ? `https://img.youtube.com/vi/${stream.youtubeVideoId}/maxresdefault.jpg`
        : undefined),
  });
}

function formatDate(seconds?: number): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getYouTubeThumbnail(videoId?: string): string | null {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default async function LivestreamDetailPage(props: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await props.params;
  const stream = await getLivestream(videoId);

  if (!stream) {
    notFound();
  }

  const relatedStreams = await getRelatedStreams(stream.id, stream.streamCategory);

  return (
    <div>
      {/* Video Player Section */}
      <section className="bg-black">
        <div className="max-w-5xl mx-auto">
          {stream.youtubeVideoId ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${stream.youtubeVideoId}?autoplay=1&rel=0`}
                title={stream.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : (
            <div className="relative w-full bg-[var(--surface-raised)] flex items-center justify-center" style={{ paddingBottom: "56.25%" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                <span className="text-5xl mb-4">📺</span>
                <p>Video not available</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Video Info Section */}
      <section className="py-8 px-4 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {stream.isLive && (
            <span className="flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              LIVE NOW
            </span>
          )}
          {stream.streamCategory && (
            <span className="bg-[var(--accent-light)] text-[var(--accent)] text-xs font-semibold px-3 py-1.5 rounded">
              {stream.streamCategory}
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4">
          {stream.title}
        </h1>

        {/* Organization Info */}
        {stream.orgName && (
          <div className="flex items-center gap-3 mb-6">
            {stream.orgLogoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stream.orgLogoURL}
                alt={stream.orgName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
                <span className="text-lg">🏢</span>
              </div>
            )}
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {stream.orgName}
              </p>
              {stream.location && (
                <p className="text-sm text-[var(--text-secondary)]">
                  {stream.location.city}, {stream.location.province}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {stream.startDate && (
            <div className="flex items-start gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Date</p>
                <p className="text-[var(--text-primary)]">
                  {formatDate(stream.startDate.seconds)}
                </p>
              </div>
            </div>
          )}
          {stream.venue && (
            <div className="flex items-start gap-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Venue</p>
                <p className="text-[var(--text-primary)]">{stream.venue}</p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            About
          </h2>
          <p className="text-[var(--text-secondary)] whitespace-pre-wrap">
            {stream.description}
          </p>
        </div>

        {/* Share / Actions */}
        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-[var(--card-border)]">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-raised)] hover:bg-[var(--card-border)] text-[var(--text-primary)] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Share
          </button>
          {stream.orgId && (
            <Link
              href={`/organizations/${stream.orgId}`}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-raised)] hover:bg-[var(--card-border)] text-[var(--text-primary)] rounded-lg transition-colors"
            >
              View Organizer
            </Link>
          )}
        </div>
      </section>

      {/* Related Videos */}
      {relatedStreams.length > 0 && (
        <section className="py-12 px-4 bg-[var(--surface-raised)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
              More Broadcasts
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedStreams.map((related) => (
                <Link
                  key={related.id}
                  href={`/live/${related.id}`}
                  className="group flex bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative w-40 h-24 flex-shrink-0 bg-[var(--surface-raised)] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        related.coverImage ||
                        getYouTubeThumbnail(related.youtubeVideoId) ||
                        "/placeholder-video.png"
                      }
                      alt={related.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {related.isLive && (
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 mb-1">
                      {related.title}
                    </h3>
                    {related.streamCategory && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {related.streamCategory}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href="/live"
                className="inline-block text-[var(--accent)] hover:underline font-medium"
              >
                View All Broadcasts →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
          Want Your Event Livestreamed?
        </h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Professional multi-camera production for pow wows, sports, and
          community events.
        </p>
        <Link
          href="/contact"
          className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Request Coverage
        </Link>
      </section>
    </div>
  );
}

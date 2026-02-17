"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getPost, type Post } from "@/lib/firestore/posts";

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <EventDetailContent />
      </div>
    </ProtectedRoute>
  );
}

function EventDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const postData = await getPost(`event-${slug}`);
        setPost(postData);
      } catch (err) {
        console.error("Failed to load event:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-[200px] rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="skeleton h-[150px] rounded-2xl" />
          </div>
          <div>
            <div className="skeleton h-[250px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🎪</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Event Not Found</h2>
        <p className="text-text-sec mb-6">This event doesn&apos;t exist or may have been removed.</p>
        <Link href="/feed">
          <Button primary>Back to Feed →</Button>
        </Link>
      </div>
    );
  }

  const emoji = post.eventType === "Pow Wow" ? "🪶" : post.eventType === "Career Fair" ? "💼" : post.eventType === "Round Dance" ? "💃" : "🎪";

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Feed
      </Link>

      {/* Hero Banner */}
      <div
        className="rounded-2xl mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15,43,76,.06), rgba(217,119,6,.08))",
          padding: "clamp(24px, 4vw, 48px)",
        }}
      >
        <div className="text-center">
          <span className="text-6xl sm:text-7xl block mb-4">{emoji}</span>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {post.eventType && (
              <Badge text={post.eventType} color="var(--gold)" bg="var(--gold-soft)" small />
            )}
            {post.price && post.price.toLowerCase() === "free" && (
              <Badge text="Free Event" color="var(--green)" bg="var(--green-soft)" small />
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-text mb-2">{post.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-sec">
            {post.dates && <span>&#128197; {post.dates}</span>}
            {post.location && <span>&#128205; {post.location}</span>}
            {post.price && <span>&#127915; {post.price}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Description */}
          {post.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Event</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {post.description}
              </p>
            </>
          )}

          {/* Highlights */}
          {post.highlights && post.highlights.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Highlights</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {post.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="rounded-xl text-[13px] font-semibold text-gold"
                    style={{
                      padding: "8px 14px",
                      background: "rgba(217,119,6,.06)",
                      border: "1.5px solid rgba(217,119,6,.1)",
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Schedule */}
          {post.schedule && post.schedule.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-3">Schedule</h3>
              <div className="flex flex-col gap-3 mb-6">
                {post.schedule.map((day, i) => (
                  <Card key={i}>
                    <div style={{ padding: 16 }}>
                      <p className="text-sm font-bold text-teal mb-2.5">{day.day}</p>
                      {day.items.map((item, j) => (
                        <div key={j} className="flex gap-2 items-center mb-1.5">
                          <span className="text-xs text-teal">&#9679;</span>
                          <span className="text-[13px] text-text-sec">{item}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Event Info Cards */}
          <div className="flex flex-col gap-3">
            {post.dates && (
              <Card>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-1">&#128197; Date & Time</p>
                  <p className="text-[13px] text-text-sec">{post.dates}</p>
                </div>
              </Card>
            )}
            {post.location && (
              <Card>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-1">&#128205; Location</p>
                  <p className="text-[13px] text-text-sec">{post.location}</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* RSVP Card */}
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              <Button
                primary
                full
                style={{
                  background: "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                RSVP{post.price ? ` — ${post.price}` : ""}
              </Button>
              <Button
                full
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                &#128278; Save Event
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">EVENT DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  {post.dates && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Dates</span>
                      <span className="text-xs font-semibold text-text">{post.dates}</span>
                    </div>
                  )}
                  {post.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text text-right max-w-[140px]">{post.location}</span>
                    </div>
                  )}
                  {post.price && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Price</span>
                      <span className="text-xs font-semibold text-green">{post.price}</span>
                    </div>
                  )}
                  {post.eventType && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Category</span>
                      <span className="text-xs font-semibold text-text">{post.eventType}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Share Card */}
          <Card>
            <div style={{ padding: 16 }}>
              <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">SHARE EVENT</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-text-sec cursor-pointer"
                >
                  &#128279; Copy Link
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";

export const metadata: Metadata = {
  title: "Indigenous Events in Canada — Pow Wows, Workshops & More | IOPPS.ca",
  description:
    "Discover Indigenous events across Canada — pow wows, career fairs, workshops, cultural gatherings, and community events. Free to post, free to browse.",
  keywords: ["Indigenous events", "pow wow", "Indigenous career fair", "First Nations events", "Aboriginal events Canada"],
};

async function getEvents() {
  if (!adminDb) return [];
  const snap = await adminDb.collection("posts")
    .where("type", "==", "event")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>;
}

export default async function IndigenousEventsPage() {
  const events = await getEvents();

  return (
    <div>
      <section className="bg-hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Indigenous Events in Canada</h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Find pow wows, career fairs, workshops, and community gatherings happening across Turtle Island.
        </p>
      </section>

      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Upcoming Events</h2>
        <p className="text-[var(--text-secondary)] mb-8">Sign up to see full details and RSVP.</p>
        <div className="space-y-4">
          {events.length === 0 && (
            <p className="text-[var(--text-muted)] text-center py-8">No upcoming events right now. Check back soon!</p>
          )}
          {events.map((e) => (
            <div key={e.id as string} className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{e.title as string}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{e.orgName as string} · {(e.location as Record<string, string>)?.province || ""}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-medium">{e.eventCategory as string || "Event"}</span>
              </div>
              <div className="mt-3 h-8 bg-gradient-to-r from-[var(--surface-raised)] to-transparent rounded blur-sm" />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
            Sign Up to See All Events
          </Link>
          <p className="text-sm text-[var(--text-muted)] mt-3">Events are always free to post and browse</p>
        </div>
      </section>
    </div>
  );
}

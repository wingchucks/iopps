import type { Metadata } from "next";
import Link from "next/link";

async function getEvent(eventId: string) {
  return {
    id: eventId,
    title: "Annual Pow Wow & Cultural Celebration",
    orgName: "Treaty 4 Gathering Committee",
    location: { city: "Regina", province: "SK" },
    eventCategory: "Cultural",
    startDate: "June 15, 2025",
    endDate: "June 17, 2025",
    venue: "Wascana Park",
    description: "Join us for three days of dancing, drumming, and cultural celebration...",
    admissionCost: "Free",
    rsvpLink: "https://example.com/rsvp",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  return {
    title: `${event.title} — Indigenous Events | IOPPS.ca`,
    description: `${event.title} in ${event.location.city}, ${event.location.province}. ${event.startDate}.`,
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  return (
    <div className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{event.title}</h1>
        <p className="text-lg text-[var(--text-secondary)]">{event.orgName}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">📍 {event.location.city}, {event.location.province}</span>
          <span className="text-sm bg-[var(--accent-light)] text-[var(--accent)] px-3 py-1 rounded-full">{event.eventCategory}</span>
          <span className="text-sm bg-[var(--surface-raised)] text-[var(--text-secondary)] px-3 py-1 rounded-full">📅 {event.startDate}</span>
        </div>
      </div>

      <div className="relative">
        <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Details</h2><p className="text-[var(--text-secondary)]">{event.description}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Venue</h2><p className="text-[var(--text-secondary)]">{event.venue}</p></div>
          <div><h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Admission</h2><p className="text-[var(--text-secondary)]">{event.admissionCost}</p></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center p-8">
            <span className="text-4xl mb-4 block">🔒</span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sign Up to See Full Details</h3>
            <p className="text-[var(--text-secondary)] mb-6">Create a free account to view full event info and RSVP.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">Sign Up Free</Link>
              <Link href="/login" className="inline-block border border-[var(--input-border)] text-[var(--text-primary)] font-semibold px-6 py-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">Log In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

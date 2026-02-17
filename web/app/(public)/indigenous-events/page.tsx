import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Indigenous Events in Canada — Pow Wows, Workshops & More | IOPPS.ca",
  description:
    "Discover Indigenous events across Canada — pow wows, career fairs, workshops, cultural gatherings, and community events. Free to post, free to browse.",
  keywords: ["Indigenous events", "pow wow", "Indigenous career fair", "First Nations events", "Aboriginal events Canada"],
};

const teaserEvents = [
  { title: "Annual Pow Wow & Cultural Celebration", org: "Treaty 4 Gathering", location: "SK", date: "Jun 2025" },
  { title: "Indigenous Career & Education Fair", org: "National Indigenous Org", location: "ON", date: "Apr 2025" },
  { title: "Land-Based Learning Workshop", org: "Métis Nation", location: "AB", date: "May 2025" },
  { title: "Indigenous Entrepreneur Networking Night", org: "Chamber of Commerce", location: "BC", date: "Mar 2025" },
];

export default function IndigenousEventsPage() {
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
          {teaserEvents.map((e, i) => (
            <div key={i} className="border border-[var(--card-border)] rounded-xl p-5 bg-[var(--card-bg)] card-interactive">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{e.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{e.org} · {e.location}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-medium">{e.date}</span>
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

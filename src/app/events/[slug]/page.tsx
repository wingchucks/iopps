"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";

const event = {
  title: "Back to Batoche Days",
  dates: "July 18 - 20, 2026",
  location: "Batoche National Historic Site, SK",
  price: "Free",
  organizer: "Metis Nation — Saskatchewan",
  category: "Cultural Celebration",
  description: `Back to Batoche Days is an annual gathering that brings together thousands of Metis and Indigenous peoples to celebrate their rich heritage, culture, and history at the Batoche National Historic Site.

Join us for three days of jigging, fiddle music, traditional games, storytelling, and community connection. This year's celebration marks a milestone with expanded programming for youth, new cultural workshops, and an evening concert series.`,
  schedule: [
    { day: "Friday, July 18", items: ["Opening Ceremony — 10:00 AM", "Elders' Circle — 11:30 AM", "Jigging Competition — 2:00 PM", "Community Feast — 5:00 PM", "Evening Concert — 7:30 PM"] },
    { day: "Saturday, July 19", items: ["Sunrise Ceremony — 6:00 AM", "Cultural Workshops — 9:00 AM", "Traditional Games — 1:00 PM", "Fiddle Championship — 3:00 PM", "Round Dance — 8:00 PM"] },
    { day: "Sunday, July 20", items: ["Morning Prayer — 8:00 AM", "Youth Program Finals — 10:00 AM", "Closing Ceremony — 2:00 PM"] },
  ],
  highlights: [
    "Traditional jigging and fiddle competitions",
    "Cultural workshops and language sessions",
    "Traditional food and craft vendors",
    "Youth programming and mentorship",
    "Historical site tours and storytelling",
    "Community feast and round dance",
  ],
};

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
          <span className="text-6xl sm:text-7xl block mb-4">&#129718;</span>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <Badge text="Pow Wow" color="var(--gold)" bg="var(--gold-soft)" small />
            <Badge text="Free Event" color="var(--green)" bg="var(--green-soft)" small />
            <Badge text="Cultural Celebration" color="var(--purple)" bg="var(--purple-soft)" small />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-text mb-2">{event.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-sec">
            <span>&#128197; {event.dates}</span>
            <span>&#128205; {event.location}</span>
            <span>&#127915; {event.price}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Description */}
          <h3 className="text-lg font-bold text-text mb-2">About This Event</h3>
          <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
            {event.description}
          </p>

          {/* Highlights */}
          <h3 className="text-lg font-bold text-text mb-2">Highlights</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {event.highlights.map((h, i) => (
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

          {/* Schedule */}
          <h3 className="text-lg font-bold text-text mb-3">Schedule</h3>
          <div className="flex flex-col gap-3 mb-6">
            {event.schedule.map((day, i) => (
              <Card key={i}>
                <div style={{ padding: 16 }}>
                  <p className="text-sm font-bold text-teal mb-2.5">{day.day}</p>
                  {day.items.map((item, j) => (
                    <div
                      key={j}
                      className="flex gap-2 items-center mb-1.5"
                    >
                      <span className="text-xs text-teal">&#9679;</span>
                      <span className="text-[13px] text-text-sec">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
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
                RSVP — Free
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
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Dates</span>
                    <span className="text-xs font-semibold text-text">{event.dates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Location</span>
                    <span className="text-xs font-semibold text-text text-right max-w-[140px]">{event.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Price</span>
                    <span className="text-xs font-semibold text-green">{event.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Category</span>
                    <span className="text-xs font-semibold text-text">{event.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Organizer</span>
                    <span className="text-xs font-semibold text-text text-right max-w-[140px]">{event.organizer}</span>
                  </div>
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
                  className="flex-1 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-text-sec cursor-pointer"
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

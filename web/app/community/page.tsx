/**
 * IOPPS Community/Events Page — Social Feed Pattern
 *
 * Pow wows, conferences, and community events through the unified feed layout.
 */

"use client";

import Link from "next/link";
import {
  FeedLayout,
  OpportunityFeed,
  SectionHeader,
  colors,
  Icon,
} from "@/components/opportunity-graph";

function EventsRightSidebar() {
  return (
    <>
      {/* Event Links */}
      <div
        style={{
          background: colors.surface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${colors.borderLt}`,
            fontSize: 14,
            fontWeight: 700,
            color: colors.text,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="calendar" size={16} color={colors.accent} />
          Events Hub
        </div>
        {[
          { label: "Pow Wows", href: "/community/powwows" },
          { label: "Conferences", href: "/conferences" },
          { label: "All Events", href: "/community" },
          { label: "Nations Map", href: "/map" },
          { label: "Host an Event", href: "/organization/events/new" },
        ].map((link, i) => (
          <Link
            key={i}
            href={link.href}
            style={{
              display: "block",
              padding: "10px 16px",
              fontSize: 13,
              color: colors.accent,
              textDecoration: "none",
              borderBottom: `1px solid ${colors.bg}`,
            }}
          >
            {link.label} →
          </Link>
        ))}
      </div>

      {/* Host Event CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.purple} 0%, ${colors.pink} 100%)`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Hosting an Event?
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
          List your pow wow, conference, or cultural gathering and reach Indigenous communities across North America.
        </p>
        <Link
          href="/organization/events/new"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#fff",
            color: colors.purple,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          List Your Event
        </Link>
      </div>
    </>
  );
}

export default function CommunityPage() {
  return (
    <FeedLayout activeNav="events" rightSidebar={<EventsRightSidebar />}>
      <SectionHeader
        title="Pow Wows & Events"
        subtitle="Celebrations, conferences, and gatherings across Turtle Island."
        icon="📅"
      />
      <OpportunityFeed
        contentTypes={["event", "conference"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No events scheduled right now. Check back soon!"
      />
    </FeedLayout>
  );
}

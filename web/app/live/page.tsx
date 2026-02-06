/**
 * IOPPS Live Page — Social Feed Pattern
 *
 * Live streams through the unified feed layout.
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

function LiveRightSidebar() {
  return (
    <>
      {/* Live Links */}
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
          <Icon name="video" size={16} color={colors.red} />
          IOPPS Live
        </div>
        {[
          { label: "Watch Live Streams", href: "/live" },
          { label: "Upcoming Events", href: "/community" },
          { label: "Conference Recordings", href: "/conferences" },
          { label: "Stream Your Event", href: "/contact" },
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

      {/* Stream CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.red} 0%, #EF4444 100%)`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Stream Your Event
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
          Reach Indigenous communities across Canada with professional livestream coverage.
        </p>
        <Link
          href="/contact"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#fff",
            color: colors.red,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Contact Us
        </Link>
      </div>
    </>
  );
}

export default function LivePage() {
  return (
    <FeedLayout activeNav="live" rightSidebar={<LiveRightSidebar />}>
      <SectionHeader
        title="IOPPS Live"
        subtitle="Watch live streams, pow wows, and events directly from the source."
        icon="🎥"
      />
      <OpportunityFeed
        contentTypes={["livestream"]}
        showTabs={false}
        showBanner={false}
        showFeatured={false}
        maxItems={30}
        emptyMessage="No live streams scheduled right now. Check back soon!"
      />
    </FeedLayout>
  );
}

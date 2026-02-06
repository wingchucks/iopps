/**
 * IOPPS Conferences Page — Social Feed Pattern
 *
 * Conferences & summits through the unified feed layout.
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

function ConferencesRightSidebar() {
  return (
    <>
      {/* Conference Links */}
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
          <Icon name="calendar" size={16} color={colors.pink} />
          Conference Hub
        </div>
        {[
          { label: "All Conferences", href: "/conferences" },
          { label: "Pow Wows & Events", href: "/community" },
          { label: "IOPPS Live", href: "/live" },
          { label: "Host a Conference", href: "/organization/conferences/new" },
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

      {/* Host CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.pink} 0%, ${colors.purple} 100%)`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Hosting a Conference?
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
          List your conference on IOPPS and reach Indigenous professionals across North America.
        </p>
        <Link
          href="/organization/conferences/new"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#fff",
            color: colors.pink,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Post a Conference
        </Link>
      </div>
    </>
  );
}

export default function ConferencesPage() {
  return (
    <FeedLayout activeNav="events" rightSidebar={<ConferencesRightSidebar />}>
      <SectionHeader
        title="Conferences & Summits"
        subtitle="Connect, learn, and celebrate Indigenous leadership at professional gatherings across Turtle Island."
        icon="🎤"
      />
      <OpportunityFeed
        contentTypes={["conference"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No conferences scheduled right now. Check back soon!"
      />
    </FeedLayout>
  );
}

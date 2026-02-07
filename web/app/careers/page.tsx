/**
 * IOPPS Careers Page — Social Feed Pattern
 *
 * Jobs + Training programs displayed through the unified feed layout.
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
import { CAREERS_SIDEBAR_LINKS } from "@/lib/constants/navigation";

function CareersRightSidebar() {
  return (
    <>
      {/* Quick Actions */}
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
          <Icon name="briefcase" size={16} color={colors.accent} />
          Career Tools
        </div>
        {CAREERS_SIDEBAR_LINKS.map((link, i) => (
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

      {/* Employer CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDk} 100%)`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Are you an employer?
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
          Post jobs and connect with Indigenous talent across Canada.
        </p>
        <Link
          href="/organization/jobs/new"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#fff",
            color: colors.accent,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Post a Job
        </Link>
      </div>
    </>
  );
}

export default function CareersPage() {
  return (
    <FeedLayout activeNav="careers" rightSidebar={<CareersRightSidebar />}>
      <SectionHeader
        title="Careers"
        subtitle="Discover jobs and training programs from employers committed to Indigenous hiring."
        icon="💼"
      />
      <OpportunityFeed
        contentTypes={["job", "program"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No career opportunities found right now. Check back soon!"
      />
    </FeedLayout>
  );
}

/**
 * IOPPS Education Page — Social Feed Pattern
 *
 * Scholarships + Training programs displayed through the unified feed layout.
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

function EducationRightSidebar() {
  return (
    <>
      {/* Education Links */}
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
          <Icon name="academic" size={16} color={colors.accent} />
          Education Hub
        </div>
        {[
          { label: "Browse Schools", href: "/education/schools" },
          { label: "Find Scholarships", href: "/education/scholarships" },
          { label: "Training Programs", href: "/careers/programs" },
          { label: "List Your School", href: "/organization/education/setup" },
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

      {/* Provider CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.purple} 100%)`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Education Provider?
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
          List your institution and connect with Indigenous students across Canada.
        </p>
        <Link
          href="/organization/education/setup"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#fff",
            color: colors.blue,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          List Your School
        </Link>
      </div>
    </>
  );
}

export default function EducationPage() {
  return (
    <FeedLayout activeNav="education" rightSidebar={<EducationRightSidebar />}>
      <SectionHeader
        title="Education"
        subtitle="Explore scholarships, training programs, and schools supporting Indigenous learners."
        icon="🎓"
      />
      <OpportunityFeed
        contentTypes={["scholarship", "program"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No education opportunities found right now. Check back soon!"
      />
    </FeedLayout>
  );
}

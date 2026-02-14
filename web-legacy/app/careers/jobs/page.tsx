"use client";

/**
 * IOPPS Jobs Listing Page — Social Feed Pattern
 *
 * Dedicated jobs view through the unified feed layout.
 */

import Link from "next/link";

import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph/dynamic";
import {
  SectionHeader,
  colors,
  Icon,
} from "@/components/opportunity-graph";

function JobsRightSidebar() {
  return (
    <>
      {/* Career Links */}
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
          Job Tools
        </div>
        {[
          { label: "All Careers", href: "/careers" },
          { label: "Training Programs", href: "/careers/programs" },
          { label: "My Applications", href: "/member/applications" },
          { label: "Saved Jobs", href: "/saved" },
          { label: "Job Alerts", href: "/member/alerts" },
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

export default function JobsPage() {
  return (
    <FeedLayout activeNav="careers" rightSidebar={<JobsRightSidebar />}>
      <SectionHeader
        title="Job Listings"
        subtitle="Browse career opportunities from employers committed to Indigenous hiring across North America."
        icon="💼"
      />
      <OpportunityFeed
        contentTypes={["job"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={50}
        emptyMessage="No job listings found right now. Check back soon!"
      />
    </FeedLayout>
  );
}

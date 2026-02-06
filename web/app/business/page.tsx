/**
 * IOPPS Business/Shop Page — Social Feed Pattern
 *
 * Indigenous-owned businesses displayed through the unified feed layout.
 */

"use client";

import Link from "next/link";
import {
  FeedLayout,
  OpportunityFeed,
  SectionHeader,
  colors,
} from "@/components/opportunity-graph";

const CATEGORIES = [
  { icon: "🎨", label: "Arts & Crafts", value: "art" },
  { icon: "💎", label: "Jewelry", value: "jewelry" },
  { icon: "👕", label: "Apparel", value: "clothing" },
  { icon: "🍞", label: "Food & Beverage", value: "food" },
  { icon: "💼", label: "Professional", value: "professional" },
  { icon: "🌿", label: "Health & Wellness", value: "health" },
  { icon: "📸", label: "Media & Creative", value: "media" },
  { icon: "🛠️", label: "Trades", value: "trades" },
];

function BusinessRightSidebar() {
  return (
    <>
      {/* Categories */}
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
          }}
        >
          Browse by Category
        </div>
        {CATEGORIES.map((cat, i) => (
          <Link
            key={cat.value}
            href={`/business/directory?category=${cat.value}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              fontSize: 13,
              color: colors.textMd,
              textDecoration: "none",
              borderBottom: i < CATEGORIES.length - 1 ? `1px solid ${colors.bg}` : "none",
            }}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Vendor CTA */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.pink} 100%)`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Own an Indigenous Business?
        </div>
        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
          List your business for FREE and connect with customers across Canada.
        </p>
        <Link
          href="/organization/shop/setup"
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: 8,
            background: "#fff",
            color: colors.orange,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          List Your Business
        </Link>
      </div>
    </>
  );
}

export default function BusinessPage() {
  return (
    <FeedLayout rightSidebar={<BusinessRightSidebar />}>
      <SectionHeader
        title="Shop Indigenous"
        subtitle="Discover authentic Indigenous-owned businesses across Turtle Island."
        icon="🛍"
      />
      <OpportunityFeed
        contentTypes={["product", "service"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No businesses listed yet. Check back soon!"
      />
    </FeedLayout>
  );
}

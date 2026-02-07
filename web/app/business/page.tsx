/**
 * IOPPS Business/Shop Page — Social Feed Pattern
 *
 * Indigenous-owned businesses displayed through the unified feed layout.
 */

"use client";

import {
  FeedLayout,
  OpportunityFeed,
  SectionHeader,
  SidebarLinkCard,
  SidebarCTACard,
  colors,
} from "@/components/opportunity-graph";

const CATEGORIES = [
  { icon: "🎨", label: "Arts & Crafts", href: "/business/directory?category=art" },
  { icon: "💎", label: "Jewelry", href: "/business/directory?category=jewelry" },
  { icon: "👕", label: "Apparel", href: "/business/directory?category=clothing" },
  { icon: "🍞", label: "Food & Beverage", href: "/business/directory?category=food" },
  { icon: "💼", label: "Professional", href: "/business/directory?category=professional" },
  { icon: "🌿", label: "Health & Wellness", href: "/business/directory?category=health" },
  { icon: "📸", label: "Media & Creative", href: "/business/directory?category=media" },
  { icon: "🛠️", label: "Trades", href: "/business/directory?category=trades" },
];

function BusinessRightSidebar() {
  return (
    <>
      <SidebarLinkCard
        title="Browse by Category"
        links={CATEGORIES}
      />
      <SidebarCTACard
        title="Own an Indigenous Business?"
        description="List your business for FREE and connect with customers across Canada."
        buttonLabel="List Your Business"
        buttonHref="/organization/shop/setup"
        gradient={`linear-gradient(135deg, ${colors.orange} 0%, ${colors.pink} 100%)`}
        buttonTextColor={colors.orange}
      />
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

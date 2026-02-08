/**
 * IOPPS Live Page — Social Feed Pattern
 *
 * Live streams through the unified feed layout.
 */

import {
  FeedLayout,
  OpportunityFeed,
  SectionHeader,
  SidebarLinkCard,
  SidebarCTACard,
  colors,
} from "@/components/opportunity-graph";

const LIVE_SIDEBAR_LINKS = [
  { label: "Watch Live Streams", href: "/live" },
  { label: "Upcoming Events", href: "/community" },
  { label: "Conference Recordings", href: "/conferences" },
  { label: "Stream Your Event", href: "/contact" },
];

function LiveRightSidebar() {
  return (
    <>
      <SidebarLinkCard
        title="IOPPS Live"
        icon="video"
        iconColor={colors.red}
        links={LIVE_SIDEBAR_LINKS}
      />
      <SidebarCTACard
        title="Stream Your Event"
        description="Reach Indigenous communities across Canada with professional livestream coverage."
        buttonLabel="Contact Us"
        buttonHref="/contact"
        gradient={`linear-gradient(135deg, ${colors.red} 0%, #EF4444 100%)`}
        buttonTextColor={colors.red}
      />
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

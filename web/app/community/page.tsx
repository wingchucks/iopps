/**
 * IOPPS Community/Events Page — Social Feed Pattern
 *
 * Pow wows, conferences, and community events through the unified feed layout.
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
import { EVENTS_SIDEBAR_LINKS } from "@/lib/constants/navigation";

function EventsRightSidebar() {
  return (
    <>
      <SidebarLinkCard
        title="Events Hub"
        icon="calendar"
        links={EVENTS_SIDEBAR_LINKS}
      />
      <SidebarCTACard
        title="Hosting an Event?"
        description="List your pow wow, conference, or cultural gathering and reach Indigenous communities across North America."
        buttonLabel="List Your Event"
        buttonHref="/organization/events/new"
        gradient={`linear-gradient(135deg, ${colors.purple} 0%, ${colors.pink} 100%)`}
        buttonTextColor={colors.purple}
      />
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

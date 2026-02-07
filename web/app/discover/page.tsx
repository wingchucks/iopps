/**
 * IOPPS Discover Page — Social Opportunity Feed
 *
 * The main "home" for the app experience. Shows the unified opportunity feed
 * using the shared FeedLayout for consistent navigation across the site.
 */

"use client";

import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph";

export default function DiscoverPage() {
  return (
    <FeedLayout activeNav="feed">
      <OpportunityFeed showTabs={true} showSearch={false} maxItems={20} />
    </FeedLayout>
  );
}

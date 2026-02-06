/**
 * IOPPS Social Opportunity Graph — Main App Feed
 *
 * The social-first experience for discovering opportunities.
 */

"use client";

import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph";

export default function AppPage() {
  return (
    <FeedLayout activeNav="feed">
      <OpportunityFeed showTabs={true} showSearch={false} maxItems={20} />
    </FeedLayout>
  );
}

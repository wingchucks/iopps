"use client";

import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph/dynamic";

export default function HubPage() {
  return (
    <FeedLayout activeNav="feed">
      <OpportunityFeed showTabs={true} showSearch={false} maxItems={20} />
    </FeedLayout>
  );
}

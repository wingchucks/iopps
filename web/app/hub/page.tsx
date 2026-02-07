"use client";

import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph";

export default function HubPage() {
  return (
    <FeedLayout activeNav="feed">
      <OpportunityFeed showTabs={true} showSearch={false} maxItems={20} />
    </FeedLayout>
  );
}

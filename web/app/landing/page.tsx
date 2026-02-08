/**
 * IOPPS Social Opportunity Feed — Discover Page
 *
 * The social-first experience for discovering opportunities.
 * Uses the shared FeedLayout for consistent navigation across the site.
 */

import { FeedLayout, OpportunityFeed } from "@/components/opportunity-graph";

export default function DiscoverPage() {
  return (
    <FeedLayout activeNav="feed">
      <OpportunityFeed showTabs={true} showSearch={false} maxItems={20} />
    </FeedLayout>
  );
}

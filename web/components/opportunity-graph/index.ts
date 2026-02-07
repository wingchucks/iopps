/**
 * IOPPS Social Opportunity Graph — Component Exports
 */

// Tokens & Types
export { colors, typeConfig } from "./tokens";
export type { ColorKey, OpportunityType } from "./tokens";

// Primitives
export { Icon } from "./Icon";
export type { IconName } from "./Icon";

export { Avatar } from "./Avatar";

export { Badge, Tag } from "./Badge";

export { Button, EngagementButton } from "./Button";

// Cards
export { OpportunityCard } from "./OpportunityCard";
export type {
  OpportunityItem,
  OpportunityAuthor,
  OpportunityMeta,
  OpportunityEngagement,
} from "./OpportunityCard";

// Adapters
export { jobToOpportunity, scholarshipToOpportunity, eventToOpportunity, postToOpportunity } from "./adapters";

// Filters
export { FilterBar, SearchInput, FilterSelect, FilterChips, SectionHeader } from "./FilterBar";

// Layout
export { FeedLayout } from "./FeedLayout";

// Feed
export { OpportunityFeed } from "./OpportunityFeed";

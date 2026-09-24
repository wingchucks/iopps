/**
 * Business profile discovery-tag suggestions, split into two labeled groups.
 *
 * Community-identity tags (nations, treaties, Indigenous identity) describe
 * WHO the business is connected to; industry tags describe WHAT the business
 * does. Keeping the two groups separate — in both the business profile editor
 * and the job wizard — stops industry suggestions from masquerading as
 * community identity (bug 9).
 */
export const COMMUNITY_IDENTITY_TAG_SUGGESTIONS = [
  "First Nations",
  "Métis",
  "Inuit",
  "Treaty 6",
  "Treaty 4",
] as const;

export const INDUSTRY_TAG_SUGGESTIONS = [
  "Hospitality",
  "Food & Beverage",
  "Human Resources",
  "Gaming Industry",
  "Recruitment",
  "Training",
  "Career Development",
] as const;

export type CommunityIdentityTagSuggestion = typeof COMMUNITY_IDENTITY_TAG_SUGGESTIONS[number];
export type IndustryTagSuggestion = typeof INDUSTRY_TAG_SUGGESTIONS[number];

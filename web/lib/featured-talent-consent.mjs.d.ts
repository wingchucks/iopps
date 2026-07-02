export type FeaturedTalentConsentChoice = 'yes' | 'no';

export function normalizeFeaturedTalentConsentChoice(choice: unknown): FeaturedTalentConsentChoice | null;

export function buildFeaturedTalentConsentUpdate(input: {
  choice: FeaturedTalentConsentChoice | string | null;
  consentedAt?: string | null;
  declinedAt?: string | null;
  scheduledFor?: string | null;
}): {
  featuredTalent: {
    status: 'consented' | 'declined';
    websiteFeatureConsent: boolean;
    socialSpotlightConsent: boolean;
    consentedAt: string | null;
    declinedAt: string | null;
    scheduledFor: string | null;
    consentVersion: string;
  };
};

export function createFeaturedTalentConsentEmail(input: {
  firstName?: string | null;
  yesUrl: string;
  noUrl: string;
  scheduledForLabel?: string | null;
}): {
  subject: string;
  text: string;
};

export const FEATURED_TALENT_CONSENT_VERSION = '2026-07-02';

const YES_CHOICES = new Set(['yes', 'y', 'feature', 'feature-me', 'featured', 'consent']);
const NO_CHOICES = new Set(['no', 'n', 'not-right-now', 'not_now', 'decline', 'declined']);

export function normalizeFeaturedTalentConsentChoice(choice) {
  if (typeof choice !== 'string') return null;
  const normalized = choice.trim().toLowerCase();
  if (YES_CHOICES.has(normalized)) return 'yes';
  if (NO_CHOICES.has(normalized)) return 'no';
  return null;
}

/**
 * @param {{ choice: string | null, consentedAt?: string | null, declinedAt?: string | null, scheduledFor?: string | null }} input
 */
export function buildFeaturedTalentConsentUpdate({ choice, consentedAt = null, declinedAt = null, scheduledFor = null }) {
  const normalized = normalizeFeaturedTalentConsentChoice(choice);

  if (normalized === 'yes') {
    return {
      featuredTalent: {
        status: 'consented',
        websiteFeatureConsent: true,
        socialSpotlightConsent: true,
        consentedAt,
        declinedAt: null,
        scheduledFor,
        consentVersion: FEATURED_TALENT_CONSENT_VERSION,
      },
    };
  }

  if (normalized === 'no') {
    return {
      featuredTalent: {
        status: 'declined',
        websiteFeatureConsent: false,
        socialSpotlightConsent: false,
        consentedAt: null,
        declinedAt,
        scheduledFor: null,
        consentVersion: FEATURED_TALENT_CONSENT_VERSION,
      },
    };
  }

  throw new Error('Invalid featured talent consent choice');
}

/**
 * @param {{ firstName?: string | null, yesUrl: string, noUrl: string, scheduledForLabel?: string | null }} input
 */
export function createFeaturedTalentConsentEmail({ firstName, yesUrl, noUrl, scheduledForLabel }) {
  const safeFirstName = firstName?.trim() || 'there';
  const featureDateLine = scheduledForLabel
    ? `\n\nThe next available Featured Talent spotlight is planned for ${scheduledForLabel}. If you say yes, we’ll confirm your exact feature date before anything goes live.`
    : '';

  return {
    subject: 'IOPPS Featured Talent invitation',
    text: `Tansi ${safeFirstName},

We’re reaching out because your IOPPS profile looks like a good fit for an upcoming Featured Talent spotlight.

Featured Talent is a free IOPPS.ca feature that highlights Indigenous job seekers and helps employers, organizations, and community partners discover people who are open to opportunities.${featureDateLine}

If you say yes, we may feature your profile on IOPPS.ca and share a short spotlight on IOPPS social media. Public contact will be email-only. We will not post your phone number.

Would you like to be featured?

Yes, feature me: ${yesUrl}
No, not right now: ${noUrl}

If you choose yes, we’ll send you the planned feature date and the profile details we’ll use before it goes live.

For your Featured Talent graphic, you can choose to use your own photo or a clean IOPPS avatar/card with your initials. If you want a photo used, reply with the image or update your IOPPS profile photo before your feature date. If we do not receive a photo before then, we may use the IOPPS avatar/card so your spotlight can still go ahead.

Thank you,
Nathan Arias
IOPPS.CA — Empowering Indigenous Success`,
  };
}

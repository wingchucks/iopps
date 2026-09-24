type Data = Record<string, unknown>;
export interface PaidPublicationInput {
  employer: Data;
  current: Data | null;
  status: 'active' | 'draft' | 'closed';
  featured: boolean;
  durationDays?: unknown;
  now: Date;
  includedFeaturedUsed: number;
  // Only a transaction-read, receipt-backed resolver may supply this value.
  paidTerm: null | { id: string; tier: 'standard' | 'premium' | 'school'; startsAt: Date; endsAt: Date };
}
export class PublicationError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; this.name = 'PublicationError'; }
}
function deny(code: string, message: string): never { throw new PublicationError(code, message); }
function record(value: unknown): Data { return value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {}; }
export function publicationDate(value: unknown): Date | null {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'string' && value.trim()) date = new Date(value);
  else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') date = value.toDate();
  else return null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}
function balance(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) deny('reconciliation_required', 'Posting credit balance requires reconciliation.');
  return value;
}
export function decidePaidPublication(input: PaidPublicationInput): {jobPatch: Data; employerPatch: Data} {
  const {current, employer, featured, now} = input;
  if (!publicationDate(now)) deny('invalid_time', 'Publication time is invalid.');
  if (input.status !== 'active') return {jobPatch: {}, employerPatch: {}};
  if (current?.deletedAt || current?.status === 'deleted') deny('deleted', 'Deleted jobs cannot be published.');
  const term = input.paidTerm && input.paidTerm.id && publicationDate(input.paidTerm.startsAt) && publicationDate(input.paidTerm.endsAt)
    && input.paidTerm.startsAt <= now && input.paidTerm.endsAt > now ? input.paidTerm : null;
  const slots = term?.tier === 'premium' ? 4 : term?.tier === 'school' ? 6 : 0;
  if (!Number.isSafeInteger(input.includedFeaturedUsed) || input.includedFeaturedUsed < 0) deny('reconciliation_required', 'Featured usage requires reconciliation.');
  const old = record(current?.publication);
  if (current && Object.hasOwn(current, 'publication')) {
    const expiresAt = publicationDate(old.expiresAt);
    const first = publicationDate(old.firstPublishedAt);
    const funding = old.funding;
    const subscriptionFunding = funding === 'standard_subscription' || funding === 'premium_subscription' || funding === 'school_subscription';
    const included = current.featuredEntitlement === 'included_slot';
    const fundedFeatured = funding === 'featured_credit' || included;
    const duration = old.durationDays;
    if (old.version !== 1 || !expiresAt || !first || first > now || expiresAt <= first
      || (!subscriptionFunding && funding !== 'standard_credit' && funding !== 'featured_credit')
      || (subscriptionFunding && (typeof old.termId !== 'string' || !old.termId))
      || (included && funding !== 'premium_subscription' && funding !== 'school_subscription')
      || (current.featuredEntitlement === 'featured_credit' && funding !== 'featured_credit')
      || (funding === 'featured_credit' && current.featuredEntitlement !== 'featured_credit')
      || (current.featuredEntitlement !== undefined && !['included_slot', 'featured_credit'].includes(String(current.featuredEntitlement)))
      || typeof duration !== 'number' || !Number.isInteger(duration) || duration < 1 || duration > (fundedFeatured ? 45 : 30)
      || (!fundedFeatured && duration !== 30) || expiresAt.getTime() > first.getTime() + duration * 86400000
    ) deny('reconciliation_required', 'Publication history requires reconciliation.');
    if (expiresAt <= now) deny('expired_publication', 'This posting has expired. Create a new paid posting.');
    const isSubscription = String(old.funding).endsWith('_subscription');
    if (isSubscription && (!term || old.termId !== term.id)) deny('expired_subscription', 'This posting is covered by an expired or changed annual term. Create a new paid posting.');
    if (featured && old.funding !== 'featured_credit' && current?.featuredEntitlement !== 'included_slot') {
      deny('new_posting_required', 'To change to featured placement, create a new featured posting.');
    }
    if (featured && current?.featuredEntitlement === 'included_slot') {
      const deadline = publicationDate(current.closingDate);
      const alreadyActive = current.status === 'active' && current.active !== false && current.featured === true && (!deadline || deadline > now);
      if (!alreadyActive && input.includedFeaturedUsed >= slots) deny('featured_capacity', 'No included featured slot is available.');
    }
    if (input.durationDays !== undefined && input.durationDays !== old.durationDays) deny('immutable_duration', 'A published listing duration cannot be changed.');
    const boundedExpiry = isSubscription && term!.endsAt < expiresAt ? term!.endsAt : expiresAt;
    return {jobPatch: {expiresAt: boundedExpiry, ...(boundedExpiry < expiresAt ? {publication: {...old, expiresAt: boundedExpiry}} : {})}, employerPatch: {}};
  }
  // Preserve live pre-policy records, including owner-seeded imports. Do not assign
  // a fresh paid lifetime to them or let their historical existence authorize reuse.
  if (current && (current.postedAt || current.status === 'active' || current.active === true || current.featuredCreditConsumed)) {
    const expiry = publicationDate(current.expiresAt);
    if (current.expiresAt !== undefined && current.expiresAt !== null && !expiry) deny('reconciliation_required', 'Existing listing expiry requires reconciliation.');
    if (current.status === 'active' && Boolean(current.featured) === featured && (!expiry || expiry > now)) {
      return {jobPatch: {}, employerPatch: {}};
    }
    deny('legacy_reconciliation', 'This existing posting requires reconciliation before republishing or changing placement.');
  }
  const duration = featured ? input.durationDays : 30;
  if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 1 || duration > (featured ? 45 : 30)
    || (!featured && input.durationDays !== undefined && input.durationDays !== 30)) {
    deny('invalid_duration', 'Choose a whole-number duration from 1 to45 days for featured jobs; standard jobs run for30 days.');
  }
  const employerPatch: Data = {};
  let funding = '';
  let featuredEntitlement: 'included_slot' | 'featured_credit' | undefined;
  if (featured) {
    if (slots > input.includedFeaturedUsed) {
      funding = term!.tier === 'school' ? 'school_subscription' : 'premium_subscription';
      featuredEntitlement = 'included_slot';
    } else if (balance(employer.featuredPostCredits) > 0) {
      funding = 'featured_credit';
      featuredEntitlement = 'featured_credit';
      employerPatch.featuredPostCredits = balance(employer.featuredPostCredits) - 1;
    }
  } else {
    if (term?.tier === 'premium' || term?.tier === 'school') funding = `${term.tier}_subscription`;
    else if (term?.tier === 'standard') {
      const usage = record(employer.jobPostingUsage);
      // Existing terms cannot be reset to zero from an incomplete live-job count.
      if (usage.termId !== term.id || typeof usage.used !== 'number' || !Number.isSafeInteger(usage.used) || usage.used < 0) {
        if (balance(employer.standardPostCredits) === 0) deny('legacy_quota_reconciliation', 'Annual posting usage requires reconciliation.');
      } else if (usage.used < 15) {
        funding = 'standard_subscription';
        employerPatch.jobPostingUsage = {termId: term.id, used: usage.used + 1};
      }
    }
    if (!funding && balance(employer.standardPostCredits) > 0) {
      funding = 'standard_credit';
      employerPatch.standardPostCredits = balance(employer.standardPostCredits) - 1;
    }
  }
  if (!funding) deny('payment_required', 'A paid posting credit or eligible annual plan is required.');
  // Application deadlines remain independent. Subscription-backed listings cannot
  // outlive paid access; purchased credits retain their own full listing lifetime.
  const nominalEnd = now.getTime() + duration * 86400000;
  const expiresAt = new Date(funding.endsWith('_subscription') ? Math.min(nominalEnd, term!.endsAt.getTime()) : nominalEnd);
  const publication: Data = {version: 1, funding, firstPublishedAt: now, expiresAt, durationDays: duration};
  if (funding.endsWith('_subscription')) publication.termId = term!.id;
  const jobPatch: Data = {expiresAt, publication, postedAt: now};
  if (featuredEntitlement) jobPatch.featuredEntitlement = featuredEntitlement;
  if (funding === 'featured_credit') Object.assign(jobPatch, {featuredCreditConsumed: true, featuredCreditConsumedAt: now});
  if (funding === 'standard_credit') Object.assign(jobPatch, {standardCreditConsumed: true, standardCreditConsumedAt: now});
  return {employerPatch, jobPatch};
}

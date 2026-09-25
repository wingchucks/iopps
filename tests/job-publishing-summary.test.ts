import test from 'node:test';
import assert from 'node:assert/strict';
import { publishingOptionsFromState } from '../src/lib/server/paid-job-publication-reader.ts';
import { describePublishing, STANDARD_ANNUAL_POSTINGS } from '../src/lib/job-publishing-summary.ts';

const now = new Date('2026-09-25T12:00:00Z');
const term = (tier: 'standard' | 'premium' | 'school') => ({ id: `term-${tier}`, tier, startsAt: new Date('2026-01-01T00:00:00Z'), endsAt: new Date('2027-01-01T00:00:00Z') });
const options = (employer: Record<string, unknown>, paidTerm: ReturnType<typeof term> | null = null, includedFeaturedUsed = 0) =>
  JSON.parse(JSON.stringify(publishingOptionsFromState({ employer, paidTerm, includedFeaturedUsed }, now)));

test('publishing options come from the enforcing decision for each account state', () => {
  const unpaid = { covered: false, funding: null, remainingAfter: null, reason: 'payment_required' };
  assert.deepEqual(options({}), { plan: 'free', standard: unpaid, featured: unpaid });
  assert.deepEqual(options({ standardPostCredits: 2 }).standard, { covered: true, funding: 'standard_credit', remainingAfter: 1, reason: null });
  assert.deepEqual(options({ featuredPostCredits: 1 }).featured, { covered: true, funding: 'featured_credit', remainingAfter: 0, reason: null });
  const premium = options({}, term('premium'), 1);
  assert.deepEqual(premium.standard, { covered: true, funding: 'premium_subscription', remainingAfter: null, reason: null });
  assert.deepEqual(premium.featured, { covered: true, funding: 'included_slot', remainingAfter: 2, reason: null });
  const standardTerm = term('standard');
  assert.deepEqual(options({ jobPostingUsage: { termId: standardTerm.id, used: STANDARD_ANNUAL_POSTINGS - 1 } }, standardTerm).standard,
    { covered: true, funding: 'standard_subscription', remainingAfter: 0, reason: null });
  assert.deepEqual(options({ jobPostingUsage: { termId: standardTerm.id, used: STANDARD_ANNUAL_POSTINGS } }, standardTerm).standard, unpaid,
    'the client allowance constant matches the enforced annual limit');
  assert.equal(options({ jobPostingUsage: { termId: standardTerm.id, used: STANDARD_ANNUAL_POSTINGS }, standardPostCredits: 1 }, standardTerm).standard.funding, 'standard_credit');
  assert.equal(options({ standardPostCredits: -1 }).standard.reason, 'reconciliation_required');
});

test('publishing messages state the price in CAD + GST and the next step', () => {
  assert.equal(describePublishing(null, false), null);
  const unpaid = options({});
  const standard = describePublishing(unpaid, false)!;
  assert.equal(standard.covered, false);
  assert.equal(standard.headline, 'Publishing needs a Standard Job Post ($125 CAD + GST)');
  assert.equal(standard.purchasePlan, 'standard-post');
  assert.match(standard.detail, /saved as a draft first/);
  const featured = describePublishing(unpaid, true)!;
  assert.equal(featured.headline, 'Publishing needs a Featured Job Post ($200 CAD + GST)');
  assert.equal(featured.purchasePlan, 'featured-post');
  assert.equal(describePublishing(options({ standardPostCredits: 1 }), false)!.detail, 'Publishes a standard listing for 30 days. You\'ll have 0 standard credits left.');
  assert.equal(describePublishing(options({}, term('premium')), true)!.headline, 'Uses 1 featured slot from your plan');
  const review = describePublishing(options({ standardPostCredits: -1 }), false)!;
  assert.equal(review.purchasePlan, null, 'an account needing reconciliation is not sent to buy more');
  assert.equal(review.headline, 'Publishing needs an account check');
});

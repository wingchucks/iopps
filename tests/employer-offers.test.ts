import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPLOYER_OFFERS, employerOffer, employerOfferSignupHref } from '../src/lib/employer-offers.ts';
import { ONE_TIME_PLANS, PRICE_TAX_NOTE } from '../src/lib/pricing.ts';
import { authIntentHref, postSignupDestination } from '../src/lib/auth-redirect.ts';

test('the four purchasable offers come from the plan definitions', () => {
  assert.deepEqual(EMPLOYER_OFFERS.map(o => [o.id, o.kind, o.priceLabel, o.periodText]), [
    ['standard-post', 'post', '$125', 'per post'],
    ['featured-post', 'post', '$200', 'per post'],
    ['tier1', 'annual', '$1,250', 'per year'],
    ['tier2', 'annual', '$2,500', 'per year'],
  ]);
  assert.equal(PRICE_TAX_NOTE, 'CAD + GST');
  for (const hidden of ['tier3', 'program-post', 'free', '', null]) assert.equal(employerOffer(hidden), null, String(hidden));
  assert.equal(ONE_TIME_PLANS['featured-post'].badge, undefined, 'the $200 post is not labelled Best Value');
});

test('each offer carries its own plan from the landing page through signup, verification and checkout', () => {
  const hrefs = EMPLOYER_OFFERS.map(o => employerOfferSignupHref(o.id));
  assert.equal(new Set(hrefs).size, 4, 'every button opens a different, offer-specific signup');
  for (const offer of EMPLOYER_OFFERS) {
    const landing = new URL(employerOfferSignupHref(offer.id), 'https://www.iopps.ca');
    assert.equal(landing.pathname, '/org/signup');
    // /org/signup forwards signed-out visitors to the employer signup with the same intent.
    const signup = new URL(authIntentHref('/signup?type=employer', landing.searchParams), 'https://www.iopps.ca');
    assert.equal(signup.searchParams.get('plan'), offer.id);
    assert.equal(signup.searchParams.get('intent'), 'hiring');
    // After signup and email verification the visitor lands on checkout for that offer.
    const checkout = postSignupDestination(signup.searchParams, '/org/dashboard');
    assert.equal(checkout, `/org/checkout?plan=${offer.id}`);
  }
});

test('the landing page and pricing page render offers from the shared source', () => {
  const landing = readFileSync('src/app/for-employers/page.tsx', 'utf8');
  assert.match(landing, /<EmployerOfferGrid \/>/);
  assert.doesNotMatch(landing, /\$1,250|\$2,500|\$125|\$200/, 'no hard-coded prices on the landing page');
  assert.match(readFileSync('src/components/PricingTabs.tsx', 'utf8'), /PRICE_TAX_NOTE/);
});

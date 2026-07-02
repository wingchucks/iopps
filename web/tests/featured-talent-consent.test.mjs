import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildFeaturedTalentConsentUpdate,
  createFeaturedTalentConsentEmail,
  normalizeFeaturedTalentConsentChoice,
} from '../lib/featured-talent-consent.mjs';

test('normalizes yes and no consent choices', () => {
  assert.equal(normalizeFeaturedTalentConsentChoice('yes'), 'yes');
  assert.equal(normalizeFeaturedTalentConsentChoice('YES'), 'yes');
  assert.equal(normalizeFeaturedTalentConsentChoice('feature'), 'yes');
  assert.equal(normalizeFeaturedTalentConsentChoice('no'), 'no');
  assert.equal(normalizeFeaturedTalentConsentChoice('not-right-now'), 'no');
  assert.equal(normalizeFeaturedTalentConsentChoice('maybe'), null);
});

test('builds consent update for yes without publishing before approval', () => {
  const update = buildFeaturedTalentConsentUpdate({
    choice: 'yes',
    consentedAt: '2026-07-02T20:00:00.000Z',
    scheduledFor: '2026-07-05',
  });

  assert.deepEqual(update.featuredTalent, {
    status: 'consented',
    websiteFeatureConsent: true,
    socialSpotlightConsent: true,
    consentedAt: '2026-07-02T20:00:00.000Z',
    declinedAt: null,
    scheduledFor: '2026-07-05',
    consentVersion: '2026-07-02',
  });
});

test('builds decline update that blocks public featuring', () => {
  const update = buildFeaturedTalentConsentUpdate({
    choice: 'no',
    declinedAt: '2026-07-02T20:00:00.000Z',
  });

  assert.deepEqual(update.featuredTalent, {
    status: 'declined',
    websiteFeatureConsent: false,
    socialSpotlightConsent: false,
    consentedAt: null,
    declinedAt: '2026-07-02T20:00:00.000Z',
    scheduledFor: null,
    consentVersion: '2026-07-02',
  });
});

test('route keeps GET read-only and records consent only from POST', () => {
  const route = readFileSync(new URL('../app/api/featured-talent/consent/route.ts', import.meta.url), 'utf8');
  const getBody = route.match(/export async function GET[\s\S]*?\n}\n\nexport async function POST/)?.[0] || '';

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(getBody, /buildFeaturedTalentConsentUpdate/);
  assert.doesNotMatch(getBody, /batch\.commit|runTransaction/);
  assert.match(route, /runTransaction/);
});

test('email includes yes/no links, Sunday date, and email-only privacy language', () => {
  const email = createFeaturedTalentConsentEmail({
    firstName: 'Lauren',
    yesUrl: 'https://www.iopps.ca/api/featured-talent/consent?token=abc&choice=yes',
    noUrl: 'https://www.iopps.ca/api/featured-talent/consent?token=abc&choice=no',
    scheduledForLabel: 'Sunday, July 5, 2026',
  });

  assert.equal(email.subject, 'IOPPS Featured Talent invitation');
  assert.match(email.text, /Tansi Lauren/);
  assert.match(email.text, /Sunday, July 5, 2026/);
  assert.match(email.text, /email-only/i);
  assert.match(email.text, /own photo/i);
  assert.match(email.text, /IOPPS avatar\/card/i);
  assert.match(email.text, /profile photo before your feature date/i);
  assert.doesNotMatch(email.text, /phone number\s*:/i);
  assert.match(email.text, /Yes, feature me: https:\/\/www\.iopps\.ca\/api\/featured-talent\/consent\?token=abc&choice=yes/);
  assert.match(email.text, /No, not right now: https:\/\/www\.iopps\.ca\/api\/featured-talent\/consent\?token=abc&choice=no/);
});

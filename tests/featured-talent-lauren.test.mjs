import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const featuredData = readFileSync('src/lib/featured-talent.ts', 'utf8');
const homePage = readFileSync('src/app/page.tsx', 'utf8');
const listingPage = readFileSync('src/app/featured-talent/page.tsx', 'utf8');
const detailPage = readFileSync('src/app/featured-talent/[slug]/page.tsx', 'utf8');

test('Lauren Moosuk is the primary Featured Talent profile', () => {
  const laurenIndex = featuredData.indexOf('slug: "lauren-moosuk"');
  const audreyIndex = featuredData.indexOf('slug: "audrey-fiddler"');

  assert.ok(laurenIndex > -1, 'Lauren profile should exist');
  assert.ok(audreyIndex > -1, 'Audrey profile can remain as an older profile');
  assert.ok(laurenIndex < audreyIndex, 'Lauren must be first so homepage and listing spotlight use her');
  assert.match(featuredData, /name: "Lauren Moosuk"/);
  assert.match(featuredData, /publicEmail: "laurenmoosuk70@gmail\.com"/);
});

test('public Featured Talent pages use dynamic profile labels rather than Audrey-only labels', () => {
  assert.doesNotMatch(homePage, /Meet Audrey Fiddler/);
  assert.doesNotMatch(homePage, /View Audrey&apos;s Profile/);
  assert.doesNotMatch(listingPage, /View Audrey&apos;s Profile|Email Audrey/);
  assert.doesNotMatch(detailPage, /Email Audrey/);
  assert.match(homePage, /Meet \{featuredTalent\.name\}/);
  assert.match(listingPage, /Email \{firstName\}/);
  assert.match(detailPage, /Email \{firstName\}/);
});

test('Featured Talent public copy does not expose phone or tel links', () => {
  const combined = [featuredData, homePage, listingPage, detailPage].join('\n');
  assert.doesNotMatch(combined, /tel:/i);
  assert.doesNotMatch(combined, /phone/i);
});

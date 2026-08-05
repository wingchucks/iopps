import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const featuredData = readFileSync('src/lib/featured-talent.ts', 'utf8');
const homePage = readFileSync('src/app/page.tsx', 'utf8');
const businessSpotlight = readFileSync('src/app/indigenous-business-spotlight/page.tsx', 'utf8');
const oldLanding = readFileSync('src/app/featured-talent/page.tsx', 'utf8');

test('the former current person no longer appears in public spotlight sources', () => {
  const combined = [featuredData, homePage, businessSpotlight].join('\n');

  assert.doesNotMatch(combined, /Lauren Moosuk|lauren-moosuk|laurenmoosuk70@gmail\.com/);
});

test('the replacement section is fully focused on Indigenous entrepreneurs', () => {
  assert.match(homePage, /Indigenous Business Spotlight/);
  assert.match(homePage, /Built by Indigenous entrepreneurs\. Supported by community/);
  assert.match(homePage, /Free Indigenous business profiles/);
  assert.match(businessSpotlight, /Indigenous businesses deserve to be easier to find/);
  assert.match(businessSpotlight, /Consideration for a free Indigenous Business Spotlight/);
});

test('the public copy makes basic listing and spotlight consideration free without discussing proof', () => {
  const combined = [homePage, businessSpotlight].join('\n');

  assert.match(combined, /Add Your Business Free/);
  assert.match(combined, /no charge to create the profile, appear in the directory, or be considered for this spotlight/);
  assert.doesNotMatch(combined, /proof|documentation|verify ownership|verification requirement/i);
});

test('the previous landing URL leads people to the new section', () => {
  assert.match(oldLanding, /redirect\("\/indigenous-business-spotlight"\)/);
});

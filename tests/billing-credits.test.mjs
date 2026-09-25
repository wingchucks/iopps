import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('billing shows paid job post credits separately from featured credits', () => {
  const page = readFileSync('src/app/org/dashboard/billing/page.tsx', 'utf8');
  assert.match(page, /label: "Job Post Credits", value: `\$\{Number\.isSafeInteger\(employer\.standardPostCredits\)/);
  assert.match(page, /label: "Featured Credits", value: `\$\{employer\.featuredSummary\.featuredPostCredits\}`/);
  assert.doesNotMatch(page, /label: "Credits"/);
});

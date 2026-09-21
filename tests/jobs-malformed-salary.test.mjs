import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { renderListing } from './jobs-employment-facets.test.mjs';

const imported = {
  id: 'malformed-pay', title: 'Malformed pay role', source: 'feed',
  description: 'Original employer description.',
  externalUrl: 'https://employer.example/jobs/original',
  sourceMetadata: { salary: 'available', closingDate: 'not-imported', employmentType: 'not-imported' },
};
const valid = { ...imported, id: 'valid-pay', title: 'Valid pay role', salary: '$25–$30 / hour' };
const filters = { employer: '', area: '', added: '', closing: '', disclosed: '', training: '', salaryPeriod: 'hour', salaryMin: '', salaryMax: '' };

test('discovery treats malformed canonical pay as unavailable without excluding unfiltered jobs', () => {
  const { salaryInfo, matchesDiscoveryFilters } = sourceModule('src/lib/job-discovery.ts');
  for (const salary of [25, { min: 25, max: 30 }, { display: 25 }, [], true, null, undefined]) {
    const record = { ...imported, salary };
    assert.equal(salaryInfo(record), null, JSON.stringify(salary));
    assert.equal(matchesDiscoveryFilters(record, filters), true);
    assert.equal(matchesDiscoveryFilters(record, { ...filters, disclosed: '1' }), false);
    assert.equal(matchesDiscoveryFilters(record, { ...filters, salaryMin: '20' }), false);
    assert.match(renderListing([{ ...record, source: 'manual' }], 'All'), /Pay not listed/);
  }
});

test('valid string pay and explicit structured ranges retain discovery filter semantics', () => {
  const { salaryInfo, matchesDiscoveryFilters } = sourceModule('src/lib/job-discovery.ts');
  assert.equal(salaryInfo(valid).display, valid.salary);
  assert.equal(salaryInfo(valid).period, 'hour');
  assert.equal(matchesDiscoveryFilters(valid, { ...filters, disclosed: '1', salaryMin: '28' }), true);
  assert.equal(matchesDiscoveryFilters(valid, { ...filters, salaryMin: '31' }), false);
  assert.equal(matchesDiscoveryFilters(valid, { ...filters, salaryMin: '20', salaryPeriod: 'year' }), false);
  const structured = { ...imported, salary: 25, salaryRange: { min: 25, max: 30, currency: 'USD', period: 'hour' } };
  assert.equal(salaryInfo(structured).display, 'USD $25–$30 / hour');
  assert.equal(matchesDiscoveryFilters(structured, { ...filters, disclosed: '1' }), true);
  assert.equal(salaryInfo({ ...structured, salaryRange: { ...structured.salaryRange, disclosed: false } }), null);
});

test('actual /jobs discovery keeps malformed canonical salary records and neighboring valid jobs visible', () => {
  const { publicContentRecord } = sourceModule('src/lib/server/public-content-record.ts');
  for (const salary of [25, { min: 25, max: 30 }, { display: 25 }, { compensation: { min: 25 } }]) {
    for (const project of [record => record, publicContentRecord]) {
      const records = [project({ ...imported, salary }), project(valid)];
      const before = structuredClone(records);
      const html = renderListing(records, 'All');
      // Suspense SSR can swallow the thrown matchAll error and render empty HTML:
      // assert actual cards/count, not merely that rendering did not throw.
      assert.match(html, /2 jobs found/, JSON.stringify(salary));
      assert.match(html, /Malformed pay role/);
      assert.match(html, /Valid pay role/);
      assert.match(html, /Pay not imported/);
      assert.match(html, /Check original posting/);
      assert.ok(html.includes('$25–$30 / hour'));
      assert.doesNotMatch(html, /CAD|USD|\[object Object\]|NaN/);
      assert.deepEqual(structuredClone(records), before);
    }
  }
});

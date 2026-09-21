import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';
import { readFileSync } from 'node:fs';

const oracle = JSON.parse(readFileSync(new URL('./fixtures/jobs-audit-oracle-source.json', import.meta.url), 'utf8'));
test('JOB-03 captured upstream replacement character remains verbatim and flagged for approved editorial review', () => {
  const quality = sourceModule('src/lib/server/import-content-quality.ts');
  for (const format of [undefined, 'plain-text', 'decoded-text']) {
    const patch = quality.prepareImportedDescription(oracle.rawDescription, format);
    assert.equal(patch.description, oracle.rawDescription);
    assert.equal(patch.importContentQuality.rawDescription, oracle.rawDescription);
    assert.equal(patch.importContentQuality.needsReview, true);
    assert.ok(patch.importContentQuality.issues.includes('replacement-character'));
    const publicRecord = project({ source: 'feed', ...patch, sourceMetadata: { rawDescription: 'private', salary: 'invented' } });
    assert.equal(publicRecord.description, oracle.rawDescription);
    assert.equal(publicRecord.importContentQuality, undefined);
    assert.equal(publicRecord.sourceMetadata.rawDescription, undefined);
    assert.equal(publicRecord.sourceMetadata.salary, 'not-imported');
  }
  assert.equal(oracle.sourceLabels['Pay Range'], '$65,100 - $84,600');
  assert.equal(oracle.sourceLabels['Apply Before'], '10/03/2026, 12:00 AM');
});

test('JOB-03 existing editorial authorization fails closed on the newly captured source wording', async () => {
  const { REPAIR, createEditorialRepair } = sourceModule('src/lib/server/hermes-editorial-repair.ts');
  // Existing authorization is for U+FFFD + "ds"; this capture is U+FFFD + "s".
  assert.notEqual(REPAIR.original, oracle.rawDescription);
  assert.ok(REPAIR.original.includes('SIGA \ufffdds employees'));
  assert.ok(oracle.rawDescription.includes('SIGA \ufffds employees'));
  const record = { title: REPAIR.title, slug: REPAIR.slug, employerName: REPAIR.employer, externalUrl: REPAIR.urls[0], description: oracle.rawDescription };
  const repair = createEditorialRepair({
    getDocument: async collection => collection === 'jobs' ? { id: REPAIR.jobId, version: 'fixture-v1', data: record } : null,
    runTransaction: async () => { assert.fail('Review must not write'); },
  }, { secret: 'fixture-review-secret-never-used-in-production' });
  await assert.rejects(repair.review({ repairId: REPAIR.id }, 'fixture-key'), /target\/source drifted/);
});

test('JOB-05 actual detail route returns missing-import provenance without hydration writes or inferred source values', async () => {
  const record = { source: 'feed', title: 'Fixture payroll', active: true, description: oracle.rawDescription, descriptionFormat: 'plain-text', closingDate: null };
  const net = offlineNetwork();
  let writes = 0;
  const doc = { id: 'fixture', exists: true, data: () => record, ref: { set: () => { writes++; }, update: () => { writes++; } } };
  const db = { collection: () => ({ doc: () => ({ get: async () => doc }) }) };
  const route = sourceModule('src/app/api/jobs/[id]/route.ts', { ...net, mocks: { ...net.mocks,
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/server/public-job-routing': { findPublicJobDocument: async () => ({ id: 'fixture', source: 'jobs', routeSlug: 'fixture' }) },
    'next/server': { NextResponse: { json: Response.json } },
  } });
  const response = await route.GET(new Request('https://fixture.test/api/jobs/fixture'), { params: Promise.resolve({ id: 'fixture' }) });
  assert.equal(response.status, 200);
  const { job } = await response.json();
  assert.equal(job.sourceMetadata.salary, 'not-imported');
  assert.equal(job.sourceMetadata.closingDate, 'not-imported');
  assert.equal(job.description, oracle.rawDescription);
  assert.equal(job.salary, undefined);
  assert.equal(job.closingDate, null);
  assert.equal(net.connections.length, 0);
  assert.equal(writes, 0);
});

const project = row => sourceModule('src/lib/server/public-content-record.ts').publicContentRecord(row);

test('JOB-05 available fields stay available without inventing currency, pay period or deadline timezone', () => {
  const record = { source: 'feed', salary: '$65,100 - $84,600', closingDate: '2099-10-03', jobType: 'Full time' };
  const projected = project(record);
  assert.equal(projected.sourceMetadata.salary, 'available');
  assert.equal(projected.sourceMetadata.closingDate, 'available');
  assert.equal(projected.sourceMetadata.employmentType, 'available');
  assert.equal(projected.salary, record.salary);
  assert.equal(projected.closingDate, record.closingDate);
  assert.equal(projected.jobType, record.jobType);
  assert.equal(projected.salaryRange, undefined);
  for (const extra of [{ salaryRange: { min: 25, max: 30 } }, { salary: { display: '$25 hourly' } }]) {
    assert.equal(project({ source: 'feed', ...extra }).sourceMetadata.salary, 'available');
  }
  assert.equal(project({ source: 'feed', deadline: '2099-10-03', employmentType: 'Full-time' }).sourceMetadata.closingDate, 'available');
  for (const salary of ['', '  ', {}, { min: 'unknown' }, null, false]) {
    assert.equal(project({ source: 'feed', salary }).sourceMetadata.salary, 'not-imported');
  }
  assert.equal(project({ source: 'feed', salaryRange: { disclosed: false } }).sourceMetadata.salary, 'not-imported');
  assert.equal(project({ source: 'feed', salaryRange: { min: -5 } }).sourceMetadata.salary, 'not-imported');
});

test('JOB-05 public imported records honestly distinguish missing import metadata from employer omissions', () => {
  const record = { source: 'feed', title: 'Fixture payroll role', description: 'Source summary.', closingDate: null };
  const projected = project(record);
  assert.ok(projected.sourceMetadata, 'imported records need honest metadata provenance');
  assert.deepEqual(JSON.parse(JSON.stringify(projected.sourceMetadata)), {
    salary: 'not-imported', closingDate: 'not-imported', employmentType: 'not-imported',
  });
  assert.equal(projected.salary, undefined);
  assert.equal(projected.closingDate, null);
  assert.equal(projected.employmentType, undefined);
  assert.equal(project({ source: 'manual', title: 'Direct posting' }).sourceMetadata, undefined);
  assert.equal(project({ _source: 'jobs', title: 'Unknown origin' }).sourceMetadata, undefined);
});

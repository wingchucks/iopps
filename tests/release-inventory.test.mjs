import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_FIELDS, scanCollection, summarizeCollections } from '../src/lib/server/release-inventory.mjs';

function emptyScans() {
  return Object.fromEntries(Object.keys(AUDIT_FIELDS).map(name => [name, { rows: new Map(), complete: true }]));
}

test('release inventory identifies legacy application ownership without returning identities', () => {
  const scans = emptyScans();
  scans.applications.rows.set('private-id', { memberId: 'private-owner', jobId: 'old-job', status: 'hired' });
  const report = summarizeCollections(scans);
  assert.equal(report.applications.legacyOwnerOnly, 1);
  assert.equal(report.applications.missingCurrentJobLink, 1);
  assert.equal(report.applications.missingAppliedAt, 1);
  assert.equal(report.applications.unknownStatus, 1);
  assert.doesNotMatch(JSON.stringify(report), /private-id|private-owner|old-job/);
  scans.jobs.complete = false;
  assert.equal(summarizeCollections(scans).applications.jobTargetScanComplete, false);
});

test('release inventory flags conflicting organization links and hidden canonical mirrors', () => {
  const scans = emptyScans();
  scans.users.rows.set('u', { orgId: 'one', role: 'employer' });
  scans.members.rows.set('u', { orgId: 'two' });
  scans.events.rows.set('event1', { slug: 'event-one', status: 'draft', active: false });
  scans.posts.rows.set('event-event1', { type: 'event', active: true });
  const report = summarizeCollections(scans);
  assert.equal(report.users.conflictingUserAndMemberOrgLinks, 1);
  assert.equal(report.opportunities.events.legacyAliasMatchesHiddenCanonical, 1);
});

test('scanner applies field projections and stops at its cap without a probe beyond it', async () => {
  let reads = 0;
  const query = {
    select(...fields) { assert.deepEqual(fields, AUDIT_FIELDS.applications); return this; },
    orderBy(field) { assert.equal(field, '__name__'); return this; },
    limit(n) { assert.equal(n, 2); return this; },
    async get() { reads++; return { size: 2, docs: ['a', 'b'].map(id => ({ id, data: () => ({ status: 'submitted' }) })) }; },
  };
  const scan = await scanCollection({ collection: name => { assert.equal(name, 'applications'); return query; } }, { documentId: () => '__name__' }, 'applications', 2);
  assert.equal(reads, 1);
  assert.equal(scan.rows.size, 2);
  assert.equal(scan.complete, false);
  assert.ok(!AUDIT_FIELDS.applications.some(field => /email|resume|coverLetter|profileSnapshot|name/i.test(field)));
});

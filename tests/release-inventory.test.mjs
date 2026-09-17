import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_FIELDS, scanCollection, summarizeCollections, buildReviewReferences } from '../src/lib/server/release-inventory.mjs';

function emptyScans() {
  return Object.fromEntries(Object.keys(AUDIT_FIELDS).map(name => [name, { rows: new Map(), complete: true }]));
}

test('review references never treat a current employer as proven historical ownership', () => {
  const scans = emptyScans();
  scans.applications.rows.set('application', { userId: 'private-user', postId: 'job', email: 'private@example.test', resumeUrl: 'private-resume' });
  scans.jobs.rows.set('job', { orgId: 'organization', title: 'Fictional job' });
  scans.organizations.rows.set('organization', { name: 'Fictional organization' });
  const review = buildReviewReferences(scans);
  assert.equal(review.applications[0].candidateOrgId, 'organization');
  assert.equal(review.applications[0].reviewRequired, true);
  assert.equal(review.automaticRepairsAllowed, false);
  assert.doesNotMatch(JSON.stringify(review), /private-user|private@example|private-resume/);
  scans.jobs.rows.clear();
  assert.equal(buildReviewReferences(scans).applications[0].candidateOrgId, null);
});

test('release inventory identifies legacy application ownership without returning identities', () => {
  const scans = emptyScans();
  scans.applications.rows.set('private-id', { memberId: 'private-owner', jobId: 'old-job', status: 'hired' });
  const report = summarizeCollections(scans);
  assert.equal(report.applications.legacyOwnerOnly, 1);
  assert.equal(report.applications.missingCurrentJobLink, 1);
  assert.equal(report.applications.missingAppliedAt, 1);
  assert.equal(report.applications.unknownStatus, 1);
  assert.equal(report.applications.missingOrgWithoutCanonicalJobOwner, 1);
  scans.jobs.rows.set('old-job', { employerId: 'organization' });
  assert.equal(summarizeCollections(scans).applications.missingOrgWithCanonicalJobOwner, 1);
  assert.doesNotMatch(JSON.stringify(report), /private-id|private-owner|old-job/);
  scans.jobs.complete = false;
  assert.equal(summarizeCollections(scans).applications.jobTargetScanComplete, false);
});

test('active-access findings distinguish self-owned legacy accounts from blocked accounts', () => {
  const scans = emptyScans();
  scans.users.rows.set('owner', { role: 'employer' });
  scans.organizations.rows.set('owner', { status: 'active' });
  scans.users.rows.set('blocked', { role: 'employer', orgId: 'different', status: 'suspended' });
  scans.users.rows.set('team', { role: 'employer', orgId: 'different', orgRole: 'admin' });
  const report = summarizeCollections(scans);
  assert.equal(report.activeOrganizationAccess.checked, 2);
  assert.equal(report.activeOrganizationAccess.ownerWithoutMemberLink, 1);
  assert.equal(report.activeOrganizationAccess.missingMemberLinkForDifferentOrganization, 1);
  assert.equal(report.activeOrganizationAccess.targetAbsent, 1);
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

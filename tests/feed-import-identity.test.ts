import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('existing importer match cannot erase source namespaces or requisition evidence', async () => {
  const { sameImportedIntake } = await import('../src/lib/server/feed-import-identity.ts');
  const current={feedId:'one',externalId:'ABC',location:'Winnipeg',publishedAt:'2026-09-08'};
  assert.equal(sameImportedIntake(current,{...current,feedId:'two'}),false);
  assert.equal(sameImportedIntake(current,{...current,externalId:'abc'}),false);
  assert.equal(sameImportedIntake(current,{...current,publishedAt:'2026-04-15'}),false);
  assert.equal(sameImportedIntake(current,{...current}),true);
});

test('transactional import identity is source-namespaced and retains location, case-sensitive IDs, repost dates', async () => {
  assert.ok(existsSync('src/lib/server/feed-import-identity.ts'), 'Missing transactional feed reservation');
  const { feedImportIdentity } = await import('../src/lib/server/feed-import-identity.ts');
  const job = { title: 'Branch Manager', employerId: 'employer', location: 'Winnipeg, MB', feedId: 'feed-a', externalId: 'CaseSensitive', publishedAt: '2026-09-08' };
  assert.equal(feedImportIdentity(job), feedImportIdentity({ ...job, title: ' Branch   Manager ' }));
  for (const patch of [{location:'Delta, BC'}, {feedId:'feed-b'}, {externalId:'casesensitive'}, {publishedAt:'2026-04-15'}, {requisitionId:'new-requisition'}]) assert.notEqual(feedImportIdentity(job), feedImportIdentity({...job,...patch}));
  assert.throws(() => feedImportIdentity({...job, externalId:'', externalUrl:''}));
});

test('cross-source fingerprint is case/whitespace/punctuation-insensitive across title, employer, location', async () => {
  const { jobFingerprint } = await import('../src/lib/server/feed-import-identity.ts');
  const base = { title: 'Director, National Personal Lines - Digital Sales', employerName: 'Example Insurance', location: 'Saskatoon, SK' };
  assert.equal(jobFingerprint(base), jobFingerprint({
    title: '  director national personal lines DIGITAL sales ',
    employerName: 'EXAMPLE insurance',
    location: 'saskatoon SK',
  }));
  // Employer falls back through company/organization/employerId.
  assert.equal(jobFingerprint(base), jobFingerprint({ title: base.title, company: 'Example Insurance', location: base.location }));
  assert.equal(jobFingerprint(base), jobFingerprint({ title: base.title, organization: 'Example Insurance', location: base.location }));
  for (const patch of [
    { title: 'Director, National Personal Lines' },
    { employerName: 'Other Insurance' },
    { location: 'Regina, SK' },
  ]) assert.notEqual(jobFingerprint(base), jobFingerprint({ ...base, ...patch }));
});

test('fingerprint refuses unknown employers so unrelated postings cannot collapse', async () => {
  const { jobFingerprint } = await import('../src/lib/server/feed-import-identity.ts');
  const base = { title: 'Cook', location: 'Winnipeg, MB' };
  assert.equal(jobFingerprint({ ...base, employerId: 'Unknown' }), null);
  assert.equal(jobFingerprint({ ...base, company: 'Unknown' }), null);
  assert.equal(jobFingerprint({ ...base }), null);
  assert.equal(jobFingerprint({ ...base, title: '' }), null);
});

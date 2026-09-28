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

test('a feed re-import that only reorders a multi-location list is the same intake and identity', async () => {
  const { feedImportIdentity, sameImportedIntake } = await import('../src/lib/server/feed-import-identity.ts');
  const { createHash } = await import('node:crypto');
  const job = { title: 'Director, National Personal Lines - Digital Sales', employerId: 'westland', feedId: 'dayforce', externalUrl: 'https://jobs.dayforcehcm.com/en-US/westlandcorp/CANDIDATEPORTAL/jobs/35569', publishedAt: '2026-07-08T07:00:00.000Z',
    location: 'Toronto, ON, CA; Surrey, BC, CA; Calgary, AB, CA; AB, CA; ON, CA' };
  const reordered = { ...job, location: 'Calgary, AB, CA; Surrey, BC, CA; Toronto, ON, CA; AB, CA; ON, CA' };
  assert.equal(sameImportedIntake(job, reordered), true);
  assert.equal(feedImportIdentity(job), feedImportIdentity(reordered));
  // Genuinely different vacancies stay separate: another location set or another posting date.
  assert.equal(sameImportedIntake(job, { ...job, location: 'Toronto, ON, CA; Surrey, BC, CA' }), false);
  assert.equal(sameImportedIntake(job, { ...job, publishedAt: '2026-09-01T07:00:00.000Z' }), false);
  // Single-location identities are unchanged, so existing reservations still match.
  const single = { ...job, location: ' Regina,  SK ' };
  const legacy = createHash('sha256').update(JSON.stringify(['dayforce', 'westland', job.title, 'Regina, SK', job.externalUrl, '', job.publishedAt])).digest('hex');
  assert.equal(feedImportIdentity(single), legacy);
});

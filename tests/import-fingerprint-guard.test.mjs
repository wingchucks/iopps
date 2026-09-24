import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

// In-memory Firestore double: supports the exact surface createImportedJobOnce uses
// (doc/get/create inside a transaction plus a where/limit/get defensive query).
function fakeDb() {
  const stored = new Map();
  let serial = 0;
  const snapshot = ref => ({ id: ref.id, exists: stored.has(ref.path), data: () => stored.get(ref.path) });
  const db = {
    stored,
    collection: name => ({
      doc: (id = `auto-${++serial}`) => ({ id, path: `${name}/${id}` }),
      where: (field, _op, value) => {
        let limitN = 5;
        return {
          limit(n) { limitN = n; return this; },
          async get() {
            const docs = [...stored.entries()]
              .filter(([path, data]) => path.startsWith(`${name}/`) && data && data[field] === value)
              .slice(0, limitN)
              .map(([path, data]) => ({ id: path.slice(name.length + 1), path, data: () => data }));
            return { empty: docs.length === 0, docs };
          },
        };
      },
    }),
    runTransaction: async callback => callback({
      get: async ref => snapshot(ref),
      create: (ref, data) => {
        assert.equal(stored.has(ref.path), false, `double create of ${ref.path}`);
        stored.set(ref.path, data);
      },
    }),
  };
  return db;
}

function loadGuard() {
  const net = offlineNetwork();
  return sourceModule('src/lib/server/feed-import-identity.ts', net);
}

const baseJob = {
  title: 'Associate Business Advisor',
  employerName: 'Fictional Employer',
  employerId: 'fictional-employer',
  location: 'Saskatoon, SK',
  feedId: 'feed-a',
  externalId: 'REQ-1',
  externalUrl: 'https://example.invalid/jobs/REQ-1',
  publishedAt: '2026-09-01',
};

test('cross-source duplicate is blocked while the same feed keeps its own identity rules', async () => {
  const { createImportedJobOnce, jobFingerprint } = loadGuard();
  const db = fakeDb();
  assert.equal(await createImportedJobOnce(db, baseJob), true);

  const fingerprint = jobFingerprint(baseJob);
  assert.ok(fingerprint, 'expected a fingerprint');
  const jobDocs = [...db.stored.entries()].filter(([path]) => path.startsWith('jobs/'));
  assert.equal(jobDocs.length, 1);
  assert.equal(jobDocs[0][1].importFingerprint, fingerprint);
  assert.equal([...db.stored.keys()].filter(key => key.startsWith('feedImportFingerprints/')).length, 1);

  // Exact re-import: blocked by the identity reservation.
  assert.equal(await createImportedJobOnce(db, baseJob), false);

  // Same role from a DIFFERENT source namespace: blocked by the fingerprint guard,
  // even though the external ID and URL differ (the "appears twice" duplicate class).
  assert.equal(await createImportedJobOnce(db, {
    ...baseJob, feedId: 'feed-b', externalId: 'REQ-2', externalUrl: 'https://example.invalid/other/REQ-2',
  }), false);

  // Same role from the SAME feed with a different source ID: allowed — that feed's
  // own identity rules (case-sensitive external IDs, requisition IDs, dates) decide.
  assert.equal(await createImportedJobOnce(db, {
    ...baseJob, externalId: 'REQ-3', externalUrl: 'https://example.invalid/jobs/REQ-3',
  }), true);

  // A genuinely different role from the second feed still imports.
  assert.equal(await createImportedJobOnce(db, {
    ...baseJob, feedId: 'feed-b', title: 'Senior Business Advisor', externalId: 'REQ-9',
    externalUrl: 'https://example.invalid/other/REQ-9',
  }), true);
  assert.equal([...db.stored.entries()].filter(([path]) => path.startsWith('jobs/')).length, 3);
});

test('legacy record with a backfilled fingerprint blocks a cross-source re-import', async () => {
  const { createImportedJobOnce, jobFingerprint } = loadGuard();
  const db = fakeDb();
  // Legacy direct-write record: no reservations, but a backfilled importFingerprint.
  const legacy = {
    ...baseJob, feedId: 'feed-a', id: 'legacy-direct-write',
    importFingerprint: jobFingerprint(baseJob),
  };
  db.stored.set('jobs/legacy-direct-write', legacy);

  assert.equal(await createImportedJobOnce(db, {
    ...baseJob, feedId: 'feed-b', externalId: 'REQ-2', externalUrl: 'https://example.invalid/other/REQ-2',
  }), false);
  assert.equal([...db.stored.entries()].filter(([path]) => path.startsWith('jobs/')).length, 1);
});

test('unknown employer disables the guard so unrelated postings cannot collapse', async () => {
  const { createImportedJobOnce, jobFingerprint } = loadGuard();
  const db = fakeDb();
  const unknown = { ...baseJob, employerName: undefined, company: undefined, organization: undefined, employerId: 'Unknown' };
  assert.equal(jobFingerprint(unknown), null);
  assert.equal(await createImportedJobOnce(db, unknown), true);
  assert.equal(await createImportedJobOnce(db, {
    ...unknown, feedId: 'feed-b', externalId: 'REQ-2', externalUrl: 'https://example.invalid/other/REQ-2',
  }), true);
  assert.equal([...db.stored.keys()].filter(key => key.startsWith('feedImportFingerprints/')).length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { memoryFirestore } from './helpers/memory-firestore.mjs';

// Real routes and the real refresh helpers (employer-job-cache, public-partner-cache);
// only Next's cache API, auth and the database are doubles. Routes with their own
// harnesses (feed sync, expiry and subscription crons, admin jobs, Stripe, profile edits,
// job detail hydration) assert their refreshes there.
const JOBS = 'public-jobs {"expire":0}';
const PARTNERS = 'public-partners {"expire":0}';

function load(file, mocks, { failRefresh = false } = {}) {
  const tags = [], warnings = [];
  const route = sourceModule(file, {
    mocks: {
      'next/server': { NextResponse: { json: Response.json } },
      'next/cache': { revalidateTag: (tag, profile) => { if (failRefresh) throw new Error('Fictional cache outage'); tags.push(`${tag} ${JSON.stringify(profile)}`); } },
      '@/lib/api-auth': {
        verifyAdminToken: async () => ({ success: true, isSuperAdmin: true, decodedToken: { uid: 'fixture-admin' } }),
        verifySuperAdminToken: async () => ({ success: true, decodedToken: { uid: 'fixture-admin' } }),
      },
      ...mocks,
    },
    globals: { Error, console: { log() {}, error() {}, warn: (...args) => warnings.push(args) } },
  });
  return { route, tags, warnings };
}
const post = (body, method = 'POST') => new Request('https://example.test/api/fixture', { method, body: JSON.stringify(body) });

const hermesBase = {
  'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-time' } },
  '@/lib/firebase-admin': { getAdminDb: () => ({}), getAdminAuth: () => ({}) },
  '@/lib/server/hermes-admin-public-key': { IOPPS_HERMES_ADMIN_PUBLIC_KEYS: [] },
  '@/lib/server/hermes-admin-request': { deriveHermesAdminReviewSecret: () => 'fixture-secret' },
  '@/lib/server/hermes-firestore-adapter': { createFirebaseHermesFirestorePort: () => ({}), createHermesFirestoreAdapter: () => ({ consumeNonce() {}, getIdempotentApply() {}, createEmployerServiceDeps() {} }) },
  '@/lib/server/hermes-job-approval-firestore': { createHermesJobApprovalFirestoreAdapter: () => ({ getIdempotentApply() {}, createServiceDeps() {} }) },
  '@/lib/server/hermes-editorial-repair': { createEditorialRepair: () => ({}) },
  '@/lib/server/imported-job-descriptions': { normalizeImportedDescription: text => text },
  '@/lib/server/hermes-account-conversion-auth': { cleanupHermesAccountConversionAuthClaims() {} },
  '@/lib/server/hermes-account-conversion-firestore': { createHermesAccountConversionFirestoreAdapter: () => ({ getIdempotentApply() {}, createServiceDeps() {} }) },
};

test('Hermes applies refresh what they change only after a successful apply and return the handler response as is', async () => {
  for (const [file, handlerModule, handler, tag] of [
    ['src/app/api/hermes/v1/jobs/approve/apply/route.ts', '@/lib/server/hermes-admin-api', 'handleHermesJobApprovalApplyRequest', JOBS],
    ['src/app/api/hermes/v1/jobs/editorial/apply/route.ts', '@/lib/server/hermes-editorial-api', 'handleEditorialRequest', JOBS],
    ['src/app/api/hermes/v1/jobs/cleanup/apply/route.ts', '@/lib/server/hermes-job-cleanup-route', 'jobCleanupRoute', JOBS],
    ['src/app/api/hermes/v1/jobs/cleanup/rollback/route.ts', '@/lib/server/hermes-job-cleanup-route', 'jobCleanupRoute', JOBS],
    ['src/app/api/hermes/v1/employers/apply/route.ts', '@/lib/server/hermes-admin-api', 'handleHermesEmployerApplyRequest', PARTNERS],
    ['src/app/api/hermes/v1/users/convert-to-individual/apply/route.ts', '@/lib/server/hermes-admin-api', 'handleHermesAccountConversionApplyRequest', PARTNERS],
  ]) {
    for (const status of [200, 400, 409, 500]) {
      const response = Response.json({ fixture: status }, { status });
      const h = load(file, { ...hermesBase, [handlerModule]: { [handler]: async () => response, hermesAdminInternalErrorResponse: () => Response.json({ error: 'internal' }, { status: 500 }) } });
      assert.equal(await h.route.POST(post({})), response, `${file} returns the handler response`);
      assert.deepEqual(h.tags, status === 200 ? [tag] : [], `${file} ${status}`);
    }
  }
});

function pinnedDb() {
  const updates = [];
  const adminDb = { collection: name => ({
    doc: id => ({ update: async patch => { updates.push([`${name}/${id}`, patch]); } }),
    where: () => ({ count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }) }),
  }) };
  return { updates, adminDb };
}

test('admin pin and feature actions refresh public jobs for jobs only', async () => {
  for (const [collection, action, status, tags] of [
    ['jobs', 'feature', 200, [JOBS]], ['jobs', 'unfeature', 200, [JOBS]], ['jobs', 'pin', 200, [JOBS]], ['jobs', 'unpin', 200, [JOBS]],
    ['conferences', 'feature', 200, []], ['jobs', 'unknown', 400, []],
  ]) {
    const db = pinnedDb();
    const h = load('src/app/api/admin/pinned/route.ts', { '@/lib/firebase-admin': { adminDb: db.adminDb } });
    assert.equal((await h.route.POST(post({ itemId: 'fixture', collection, action }))).status, status);
    assert.deepEqual(h.tags, tags, `${collection} ${action}`);
  }
});

test('a cache refresh failure is logged as a warning and never changes the saved change or its response', async () => {
  const db = pinnedDb();
  const h = load('src/app/api/admin/pinned/route.ts', { '@/lib/firebase-admin': { adminDb: db.adminDb } }, { failRefresh: true });
  const response = await h.route.POST(post({ itemId: 'fixture', collection: 'jobs', action: 'feature' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(db.updates.length, 1);
  assert.equal(h.warnings.length, 1);
  assert.match(String(h.warnings[0][0]), /public-jobs cache/);
});

function postsDb(rows) {
  const writes = [];
  const doc = path => ({
    get: async () => ({ exists: Boolean(rows[path]), data: () => rows[path] }),
    set: async () => { writes.push(['set', path]); },
    update: async () => { writes.push(['update', path]); },
    delete: async () => { writes.push(['delete', path]); },
  });
  return { writes, adminDb: { collection: name => ({ doc: id => doc(`${name}/${id}`) }) } };
}

test('admin archive, restore and feature of a job refresh public jobs; other content and refusals do not', async () => {
  const rows = { 'jobs/fixture': { title: 'Fictional job' }, 'conferences/fixture': { title: 'Fictional conference' }, 'archivedContent/fixture': { originalCollection: 'jobs' } };
  for (const [body, activation, status, tags] of [
    [{ action: 'archive', collection: 'jobs' }, null, 200, [JOBS]],
    [{ action: 'archive', collection: 'conferences' }, null, 200, []],
    [{ action: 'restore', collection: 'jobs' }, null, 200, [JOBS]],
    [{ action: 'restore', collection: 'jobs' }, 'Job archive identity requires review', 409, []],
    [{ action: 'feature', collection: 'jobs' }, null, 200, [JOBS]],
    [{ action: 'feature', collection: 'jobs' }, 'A paid posting credit or eligible annual plan is required.', 409, []],
    [{ action: 'feature', collection: 'conferences' }, null, 200, []],
  ]) {
    const db = postsDb(rows);
    const h = load('src/app/api/admin/posts/route.ts', {
      '@/lib/firebase-admin': { adminDb: db.adminDb },
      '@/lib/server/admin-job-lifecycle': { activateAdminJob: async () => activation },
    });
    assert.equal((await h.route.POST(post({ ...body, postId: 'fixture' }))).status, status, JSON.stringify(body));
    assert.deepEqual(h.tags, tags, `${JSON.stringify(body)} ${activation}`);
  }
});

function cleanupDb({ failOnCommit = 0 } = {}) {
  let commits = 0;
  const adminDb = {
    collection: () => ({ doc: id => ({ id }), get: async () => ({ docs: [] }) }),
    batch: () => ({ update() {}, delete() {}, commit: async () => { commits++; if (commits === failOnCommit) throw new Error('Fictional commit failure'); } }),
  };
  return { adminDb, get commits() { return commits; } };
}

test('admin stale-job cleanup refreshes public jobs after any committed batch, even when a later one fails', async () => {
  const mocks = db => ({ '@/lib/firebase-admin': { adminDb: db.adminDb }, 'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-time' } } });
  const ids = count => Array.from({ length: count }, (_, index) => `job-${index}`);
  let db = cleanupDb();
  let h = load('src/app/api/admin/jobs/cleanup/route.ts', mocks(db));
  assert.equal((await h.route.POST(post({ employerName: 'Fictional', action: 'deactivate', jobIds: ids(2) }))).status, 200);
  assert.deepEqual(h.tags, [JOBS]);
  db = cleanupDb();
  h = load('src/app/api/admin/jobs/cleanup/route.ts', mocks(db));
  assert.equal((await (await h.route.POST(post({ employerName: 'Fictional', action: 'delete' }))).json()).affected, 0);
  assert.deepEqual(h.tags, [], 'nothing matched, nothing written');
  db = cleanupDb({ failOnCommit: 2 });
  h = load('src/app/api/admin/jobs/cleanup/route.ts', mocks(db));
  assert.equal((await h.route.POST(post({ employerName: 'Fictional', action: 'deactivate', jobIds: ids(501) }))).status, 500);
  assert.deepEqual(h.tags, [JOBS], 'the first 500 were closed');
  db = cleanupDb({ failOnCommit: 1 });
  h = load('src/app/api/admin/jobs/cleanup/route.ts', mocks(db));
  assert.equal((await h.route.POST(post({ employerName: 'Fictional', action: 'deactivate', jobIds: ids(2) }))).status, 500);
  assert.deepEqual(h.tags, [], 'no batch committed');
});

test('admin approval or rejection of an organization refreshes the partner cards', async () => {
  for (const [action, seed, status, tags] of [
    ['approve', { 'employers/org-1': { name: 'Fictional' } }, 200, [PARTNERS]],
    ['reject', { 'employers/org-1': { name: 'Fictional' } }, 200, [PARTNERS]],
    ['approve', {}, 404, []],
  ]) {
    const { db } = memoryFirestore(seed);
    const h = load('src/app/api/admin/employers/route.ts', { '@/lib/firebase-admin': { adminDb: db }, '@/lib/admin/employers': {} });
    assert.equal((await h.route.POST(post({ employerId: 'org-1', action }))).status, status, action);
    assert.deepEqual(h.tags, tags, `${action} ${status}`);
  }
});

// Enough of the Admin SDK for the organization admin route: refs know their parent,
// documents have no subcollections, and batches apply in order.
function organizationDb(seed) {
  const rows = new Map(Object.entries(seed));
  const ref = path => ({
    path, id: path.split('/').at(-1), parent: { id: path.split('/').at(-2) },
    get: async () => ({ exists: rows.has(path), data: () => rows.get(path) }),
    set: async data => { rows.set(path, { ...(rows.get(path) || {}), ...data }); },
    update: async data => { rows.set(path, { ...rows.get(path), ...data }); },
    delete: async () => { rows.delete(path); },
    listCollections: async () => [],
    collection: () => ({ add: async () => ({}) }),
  });
  const adminDb = {
    collection: name => ({
      doc: id => ref(`${name}/${id}`),
      where: (field, _operator, value) => ({ get: async () => {
        const docs = [...rows].filter(([path, row]) => path.split('/').length === 2 && path.startsWith(`${name}/`) && row[field] === value)
          .map(([path, row]) => ({ id: path.split('/')[1], ref: ref(path), data: () => row }));
        return { docs, size: docs.length, empty: docs.length === 0 };
      } }),
    }),
    batch: () => { const writes = []; return { set: (target, data) => { writes.push(() => target.set(data)); }, commit: async () => { for (const write of writes) await write(); } }; },
  };
  return { rows, adminDb };
}

test('admin organization changes refresh the partner cards, and removing its jobs refreshes public jobs too', async () => {
  const seed = () => ({
    'employers/org-1': { name: 'Fictional org' }, 'organizations/org-1': { name: 'Fictional org' },
    'jobs/job-1': { orgId: 'org-1', active: true, status: 'active' }, 'events/event-1': { orgId: 'org-1' },
  });
  const mocks = db => ({
    '@/lib/firebase-admin': { adminDb: db.adminDb, getAdminAuth: () => ({}) },
    'firebase-admin/firestore': { FieldValue: { delete: () => 'delete-field', serverTimestamp: () => 'server-time' } },
    '@/lib/admin/employers': {},
    '@/lib/server/super-admin': { isSuperAdminAccount: async () => false },
  });
  const run = async (method, body, seedRows = seed()) => {
    const db = organizationDb(seedRows);
    const h = load('src/app/api/admin/employers/[orgId]/route.ts', mocks(db));
    const response = await h.route[method](post(body, method), { params: Promise.resolve({ orgId: 'org-1' }) });
    return { status: response.status, tags: h.tags, rows: db.rows };
  };
  assert.deepEqual((await run('PATCH', { disabled: true })).tags, [PARTNERS], 'disabling');
  const softDeleted = await run('PATCH', { action: 'softDelete', confirmOrgId: 'org-1', linkedUserPolicy: 'unlink' });
  assert.equal(softDeleted.status, 200);
  assert.equal(softDeleted.rows.get('jobs/job-1').status, 'deleted');
  assert.deepEqual(softDeleted.tags, [JOBS, PARTNERS]);
  const withoutJobs = seed();
  delete withoutJobs['jobs/job-1'];
  assert.deepEqual((await run('PATCH', { action: 'softDelete', confirmOrgId: 'org-1', linkedUserPolicy: 'unlink' }, withoutJobs)).tags, [PARTNERS], 'no public jobs to refresh');
  assert.deepEqual((await run('PATCH', { action: 'softDelete', confirmOrgId: 'other', linkedUserPolicy: 'unlink' })).tags, [], 'refused before any write');
  const purged = await run('DELETE', { confirmOrgId: 'org-1', force: true });
  assert.equal(purged.status, 200);
  assert.equal(purged.rows.has('jobs/job-1'), false);
  assert.deepEqual(purged.tags, [JOBS, PARTNERS]);
  const refused = await run('DELETE', { confirmOrgId: 'org-1' });
  assert.equal(refused.status, 409, 'linked content needs force');
  assert.deepEqual(refused.tags, []);
});

class FixtureEmployerApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const reviewMocks = {
  'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-time' }, FieldPath: { documentId: () => '__name__' } },
  '@/lib/server/employer-auth': { EmployerApiError: FixtureEmployerApiError },
  '@/lib/server/business-listing-review': {
    listingReviewPayload: orgId => ({ orgId }),
    recordReviewChange: (tx, orgId, _employerId, review) => { tx.set({ kind: 'doc', path: `organizations/${orgId}` }, { directoryReview: review }, { merge: true }); },
    reviewError: error => Response.json({ error: error.message }, { status: error.status || 500 }),
  },
};
// Paid partners carry a partner plan; the cached partner cards never show anyone else.
const partner = { name: 'Fictional partner', plan: 'premium', subscriptionTier: 'premium', subscriptionStatus: 'active', subscriptionEnd: '2099-01-01T00:00:00.000Z' };

test('an administrator listing review decision refreshes the partner cards', async () => {
  const pending = { status: 'pending', revision: 2, submittedRevision: 2, approvedRevision: 0 };
  for (const [revision, status, tags] of [[2, 200, [PARTNERS]], [1, 409, []]]) {
    const { db } = memoryFirestore({ 'organizations/org-1': { ...partner, directoryReview: pending } });
    const h = load('src/app/api/admin/business-reviews/route.ts', {
      ...reviewMocks,
      '@/lib/firebase-admin': { getAdminDb: () => db },
      '@/lib/business-listing-review': { getBusinessListingReview: data => data.directoryReview ?? null, businessListingIssues: () => [], businessLocationIssue: () => null, EXISTING_LISTING_REVIEW: {}, LISTING_REVIEW_STATUSES: ['pending'] },
    });
    const response = await h.route.POST(post({ orgId: 'org-1', revision, status: 'pending', action: 'changes_requested', feedback: 'Please add a fictional address.' }));
    assert.equal(response.status, status, await response.clone().text());
    assert.deepEqual(h.tags, tags, `revision ${revision}`);
  }
});

test('a partner submitting its listing for review refreshes the partner cards; other organizations and repeat submissions do not', async () => {
  for (const [stored, tags] of [
    [{ ...partner }, [PARTNERS]],
    [{ name: 'Fictional free org' }, []],
    [{ ...partner, directoryReview: { status: 'pending', revision: 1 } }, []],
  ]) {
    const { db } = memoryFirestore({ 'organizations/org-1': stored });
    const h = load('src/app/api/employer/business-review/route.ts', {
      ...reviewMocks,
      '@/lib/firebase-admin': { getAdminDb: () => db },
      '@/lib/server/employer-auth': { EmployerApiError: FixtureEmployerApiError, requireEmployerContext: async () => ({ orgId: 'org-1', employerId: 'org-1', uid: 'owner', orgRole: 'owner', emailVerified: true, organizationData: stored }) },
      '@/lib/business-listing-review': { getBusinessListingReview: data => data.directoryReview ?? null, businessListingIssues: () => [], newBusinessListingReview: () => ({ status: 'draft', revision: 1, submittedRevision: 0, approvedRevision: 0 }) },
    });
    const response = await h.route.POST(post({ revision: 1 }));
    assert.equal(response.status, 200, await response.clone().text());
    assert.deepEqual(h.tags, tags, JSON.stringify(stored));
  }
});

test('finishing organization setup refreshes the partner cards only for a partner', async () => {
  for (const [organizationData, tags] of [[{ ...partner }, [PARTNERS]], [{ name: 'Fictional free org' }, []]]) {
    const { db } = memoryFirestore({ 'organizations/org-1': { ...organizationData }, 'employers/org-1': { name: organizationData.name } });
    const h = load('src/app/api/employer/onboarding/complete/route.ts', {
      'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-time' } },
      '@/lib/firebase-admin': { getAdminDb: () => db },
      '@/lib/server/employer-auth': { EmployerApiError: FixtureEmployerApiError, requireEmployerContext: async () => ({ orgId: 'org-1', employerId: 'org-1', uid: 'owner', orgRole: 'owner', emailVerified: true, organizationData }) },
      '@/lib/organization-profile': { normalizeOrganizationRecord: record => record, getBusinessProfileReadiness: () => ({ isReady: true, missingFields: [] }) },
    });
    const response = await h.route.POST(post({}));
    assert.equal(response.status, 200, await response.clone().text());
    assert.deepEqual(h.tags, tags, organizationData.name);
  }
});

process.env.TZ = 'UTC';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Loads the real employer job routes against in-memory doubles. Payment
// decisions are stubbed and counted so a test can prove they never ran.
// Every module shares the host Error so cross-module errors keep their messages, as in one realm.
const realAuth = sourceModule('src/lib/server/employer-auth.ts', { mocks: { '@/lib/firebase-admin': {} }, globals: { Error } });
const owner = (overrides = {}) => ({
  uid: 'owner', employerId: 'owner', orgId: 'owner', orgRole: 'owner', emailVerified: true,
  userData: { displayName: 'Fictional owner', email: 'owner@example.invalid' }, memberData: {},
  employerData: { status: 'approved' }, organizationData: { name: 'Fictional org', type: 'employer', status: 'approved' },
  ...overrides,
});

export function jobRoutes({ context = owner(), jobs = {}, now = '2026-10-02T18:00:00.000Z', paid } = {}) {
  const calls = { prepared: 0, writes: [], emails: [], revalidated: [], logs: { error: [], warn: [] } };
  const store = { jobs: structuredClone(jobs), posts: {}, employers: { owner: {} } };
  const ref = (collection, id) => ({ collection, id, path: `${collection}/${id}` });
  const db = {
    collection: collection => ({ doc: id => ref(collection, id) }),
    runTransaction: async action => action({
      get: async target => ({ exists: Boolean(store[target.collection]?.[target.id]), data: () => store[target.collection]?.[target.id] }),
      set: (target, data) => { calls.writes.push({ op: 'set', path: target.path, data }); },
      create: (target, data) => { calls.writes.push({ op: 'create', path: target.path, data }); },
      update: (target, data) => { calls.writes.push({ op: 'update', path: target.path, data }); },
    }),
  };
  const fixed = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } };
  const mocks = {
    'next/server': { NextResponse: { json: Response.json } },
    'next/cache': { revalidateTag: (tag, profile) => { calls.revalidated.push({ tag, profile: { ...profile } }); } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'server-timestamp' } },
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/server/employer-auth': { ...realAuth, requireEmployerContext: async () => context, requireEmployerPublishingContext: async () => context },
    '@/lib/server/employer-job-list': { loadEmployerJobRows: async () => [] },
    '@/lib/server/paid-job-publication-firestore': { firestorePublicationReader: () => ({}) },
    '@/lib/server/paid-job-publication-reader': {
      readPaidFeaturedSummary: async () => null,
      preparePaidPublication: async () => {
        calls.prepared++;
        if (paid) return paid();
        return { employerPatch: {}, jobPatch: {}, paidTerm: null, includedFeaturedUsed: 0, employer: {} };
      },
    },
    '@/lib/email': { sendAdminContentPosted: async options => { calls.emails.push(options); } },
  };
  const globals = { Error, Date: fixed, console: { log() {}, error: (...args) => calls.logs.error.push(args), warn: (...args) => calls.logs.warn.push(args), info() {} } };
  const create = sourceModule('src/app/api/employer/jobs/route.ts', { mocks, globals });
  const edit = sourceModule('src/app/api/employer/jobs/[id]/route.ts', { mocks, globals });
  const request = (method, body) => new Request('https://example.test/api/employer/jobs', { method, headers: { 'content-type': 'application/json', authorization: 'Bearer fixture' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const params = id => ({ params: Promise.resolve({ id }) });
  return {
    calls,
    list: () => create.GET(request('GET')),
    post: body => create.POST(request('POST', body)),
    get: id => edit.GET(request('GET'), params(id)),
    put: (id, body) => edit.PUT(request('PUT', body), params(id)),
    remove: id => edit.DELETE(request('DELETE'), params(id)),
  };
}

const rejected = owner({ organizationData: { name: 'Fictional org', type: 'employer', status: 'rejected' }, employerData: { status: 'rejected' } });

test('a rejected organization cannot publish a new job, and no payment logic runs', async () => {
  const h = jobRoutes({ context: rejected });
  const response = await h.post({ title: 'Fictional coordinator', slug: 'fictional-coordinator', status: 'active' });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /hasn't approved this organization/);
  assert.equal(h.calls.prepared, 0);
  assert.deepEqual(h.calls.writes, []);
});

test('a rejected organization can still save drafts so it can fix and resubmit', async () => {
  const h = jobRoutes({ context: rejected });
  assert.equal((await h.post({ title: 'Fictional coordinator', slug: 'fictional-coordinator', status: 'draft' })).status, 200);
  assert.equal(h.calls.writes.find(write => write.path === 'jobs/fictional-coordinator')?.data.status, 'draft');
});

test('a rejected organization cannot publish or keep editing a live job, but can close it', async () => {
  for (const [current, body, expected] of [
    [{ status: 'draft', active: false }, { status: 'active' }, 403],
    [{ status: 'active', active: true }, { title: 'Still live' }, 403],
    [{ status: 'active', active: true }, { status: 'closed' }, 200],
    [{ status: 'draft', active: false }, { title: 'Draft edit', status: 'draft' }, 200],
  ]) {
    const context = owner({ employerData: { status: 'rejected' } });
    const h = jobRoutes({ context, jobs: { job: { title: 'Fictional job', employerId: 'owner', orgId: 'owner', managedBy: 'employer', ...current } } });
    const response = await h.put('job', body);
    assert.equal(response.status, expected, JSON.stringify(body));
    if (expected === 403) {
      assert.equal(h.calls.prepared, 0);
      assert.deepEqual(h.calls.writes, []);
    }
  }
});

test('an approved organization still publishes normally', async () => {
  const h = jobRoutes();
  assert.equal((await h.post({ title: 'Fictional coordinator', slug: 'fictional-coordinator', status: 'active' })).status, 200);
  assert.equal(h.calls.prepared, 1);
});

function opportunityRoute(kind, organizationStatus) {
  const saved = [];
  const docs = {
    users: { owner: { role: 'employer', orgId: 'owner', orgRole: 'owner' } },
    members: { owner: { orgId: 'owner', orgRole: 'owner' } },
    organizations: { owner: { name: 'Fictional org', type: 'employer', status: organizationStatus } },
    employers: {},
  };
  const db = { collection: name => ({ doc: id => ({ get: async () => ({ exists: Boolean(docs[name]?.[id]), data: () => docs[name]?.[id] }) }) }) };
  const auth = { verifyIdToken: async token => { if (token !== 'fixture') throw Object.assign(new Error('bad'), { code: 'auth/argument-error' }); return { uid: 'owner', email: 'owner@example.invalid', email_verified: true }; }, getUser: async uid => ({ uid, disabled: false }) };
  const route = sourceModule(`src/app/api/employer/${kind}/route.ts`, { mocks: {
    '@/lib/firebase-admin': { getAdminAuth: () => auth, getAdminDb: () => db },
    '@/lib/server/organization-opportunities': {
      listOrganizationOpportunities: async () => Response.json({}),
      deleteOrganizationOpportunity: async () => Response.json({}),
      saveOrganizationOpportunity: async (req, savedKind, editing = false) => { saved.push({ kind: savedKind, editing, body: await req.json() }); return Response.json({ saved: true }, { status: editing ? 200 : 201 }); },
    },
  } });
  const send = (method, body, token = 'fixture') => route[method](new Request(`https://example.test/api/employer/${kind}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
  return { send, saved };
}

for (const kind of ['events', 'scholarships']) {
  test(`${kind}: a rejected organization cannot publish but can save drafts`, async () => {
    const h = opportunityRoute(kind, 'rejected');
    for (const method of ['POST', 'PATCH']) {
      const denied = await h.send(method, { title: 'Fictional listing', status: 'active' });
      assert.equal(denied.status, 403, method);
      assert.equal((await denied.json()).code, 'organization_not_approved');
    }
    assert.equal(h.saved.length, 0, 'the save handler never ran');
    assert.equal((await h.send('POST', { title: 'Fictional listing', status: 'draft' })).status, 201);
    assert.deepEqual(h.saved.map(entry => [entry.kind, entry.body.status]), [[kind, 'draft']], 'the request body still reaches the handler');
  });

  test(`${kind}: approved organizations and authentication failures are left to the save handler`, async () => {
    const approved = opportunityRoute(kind, 'approved');
    assert.equal((await approved.send('POST', { title: 'Fictional listing', status: 'active' })).status, 201);
    assert.equal((await approved.send('PATCH', { title: 'Fictional listing', status: 'active' }, 'expired')).status, 200);
    assert.equal(approved.saved.length, 2);
  });
}

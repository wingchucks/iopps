process.env.TZ = 'UTC';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Loads the real employer job routes against in-memory doubles. Payment
// decisions are stubbed and counted so a test can prove they never ran.
// Every module shares the host Error so cross-module errors keep their messages, as in one realm.
const realAuth = sourceModule('src/lib/server/employer-auth.ts', { mocks: { '@/lib/firebase-admin': {} }, globals: { Error } });
const paidPublication = sourceModule('src/lib/server/paid-job-publication.ts', { globals: { Error } });
const owner = (overrides = {}) => ({
  uid: 'owner', employerId: 'owner', orgId: 'owner', orgRole: 'owner', emailVerified: true,
  userData: { displayName: 'Fictional owner', email: 'owner@example.invalid' }, memberData: {},
  employerData: { status: 'approved' }, organizationData: { name: 'Fictional org', type: 'employer', status: 'approved' },
  ...overrides,
});

// 2026-10-02 12:00 in Saskatchewan unless a test says otherwise.
export function jobRoutes({ context = owner(), jobs = {}, now = '2026-10-02T18:00:00.000Z', paid, rows = [] } = {}) {
  const calls = { prepared: 0, writes: [], emails: [], revalidated: [], logs: { error: [], warn: [] } };
  const store = { jobs: structuredClone(jobs), posts: {}, employers: { owner: {} } };
  const snapshot = target => ({ ref: target, exists: Boolean(store[target.collection]?.[target.id]), data: () => store[target.collection]?.[target.id] });
  const ref = (collection, id) => { const target = { collection, id, path: `${collection}/${id}` }; target.get = async () => snapshot(target); return target; };
  const db = {
    collection: collection => ({ doc: id => ref(collection, id) }),
    runTransaction: async action => action({
      get: async target => snapshot(target),
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
    '@/lib/server/employer-job-list': { loadEmployerJobRows: async () => rows },
    '@/lib/server/paid-job-publication': paidPublication,
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
  const body = await response.json();
  assert.equal(body.code, 'organization_not_approved');
  assert.match(body.error, /hasn't approved this organization/);
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

const draftJob = (extra = {}) => ({ title: 'Fictional job', employerId: 'owner', orgId: 'owner', managedBy: 'employer', status: 'draft', active: false, ...extra });

test('publishing a new job with a closing date before today (Saskatchewan) is refused before payment', async () => {
  const h = jobRoutes();
  const response = await h.post({ title: 'Fictional coordinator', slug: 'past', status: 'active', closingDate: '2026-10-01' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "This job's closing date has passed. Choose today or a later closing date, or clear it, before publishing.", code: 'closing_date_passed', field: 'closingDate' });
  assert.equal(h.calls.prepared, 0);
  assert.deepEqual(h.calls.writes, []);
  assert.equal((await h.post({ title: 'Fictional coordinator', slug: 'today', status: 'active', closingDate: '2026-10-02' })).status, 200, 'today is still open');
  assert.equal((await h.post({ title: 'Fictional coordinator', slug: 'draft', status: 'draft', closingDate: '2026-10-01' })).status, 200, 'drafts may keep any date');
});

test('closing dates use the Saskatchewan day, not the UTC day, in the evening', async () => {
  // 21:00 on 2026-10-02 in Regina is already 2026-10-03 in UTC.
  const h = jobRoutes({ now: '2026-10-03T03:00:00.000Z' });
  assert.equal((await h.post({ title: 'Fictional coordinator', slug: 'evening', status: 'active', closingDate: '2026-10-02' })).status, 200);
  const next = jobRoutes({ now: '2026-10-03T06:00:00.000Z' });
  assert.equal((await next.post({ title: 'Fictional coordinator', slug: 'midnight', status: 'active', closingDate: '2026-10-02' })).status, 400);
});

test('activating or reopening a job keeps its stored closing date unless a new one is sent', async () => {
  for (const [body, expected, prepared] of [
    [{ status: 'active' }, 400, 0],
    [{ status: 'active', closingDate: '2026-09-30' }, 400, 0],
    [{ status: 'active', closingDate: '2026-10-15' }, 200, 1],
    [{ status: 'active', closingDate: '' }, 200, 1],
    [{ status: 'closed' }, 200, 1],
  ]) {
    const h = jobRoutes({ jobs: { job: draftJob({ status: 'closed', closingDate: '2026-09-30' }) } });
    const response = await h.put('job', body);
    assert.equal(response.status, expected, JSON.stringify(body));
    if (expected === 400) {
      assert.equal((await response.json()).code, 'closing_date_passed');
      assert.deepEqual(h.calls.writes, []);
    }
    assert.equal(h.calls.prepared, prepared, JSON.stringify(body));
  }
});

test('the admin draft notification links to the admin jobs page, not the employer editor', async () => {
  const h = jobRoutes();
  await h.post({ title: 'Fictional coordinator', slug: 'draft-notice', status: 'draft' });
  await h.post({ title: 'Fictional coordinator', slug: 'live-notice', status: 'active' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls.emails.map(email => email.urlPath), ['/admin/jobs?startAt=draft-notice&search=Fictional+coordinator', '/jobs/live-notice']);
});

test('public job caches are refreshed after publish, live edits, close and delete only', async () => {
  const refreshed = [{ tag: 'public-jobs', profile: { expire: 0 } }];
  let h = jobRoutes();
  await h.post({ title: 'Fictional coordinator', slug: 'draft-only', status: 'draft' });
  assert.deepEqual(h.calls.revalidated, [], 'a new draft is not public');
  await h.post({ title: 'Fictional coordinator', slug: 'published', status: 'active' });
  assert.deepEqual(h.calls.revalidated, refreshed);
  for (const [current, body, count] of [
    [{ status: 'active', active: true }, { title: 'Edited while live' }, 1],
    [{ status: 'active', active: true }, { status: 'closed' }, 1],
    [{ status: 'active', active: true }, { status: 'draft' }, 1],
    [{ status: 'draft', active: false }, { title: 'Draft edit' }, 0],
  ]) {
    h = jobRoutes({ jobs: { job: draftJob(current) } });
    assert.equal((await h.put('job', body)).status, 200);
    assert.equal(h.calls.revalidated.length, count, JSON.stringify(body));
  }
  h = jobRoutes({ jobs: { job: draftJob({ status: 'active', active: true }) } });
  assert.equal((await h.remove('job')).status, 200);
  assert.deepEqual(h.calls.revalidated, refreshed);
  h = jobRoutes({ jobs: { job: draftJob() }, paid: () => { throw new paidPublication.PublicationError('payment_required', 'A paid posting credit or eligible annual plan is required.'); } });
  assert.equal((await h.put('job', { status: 'active' })).status, 402);
  assert.deepEqual(h.calls.revalidated, [], 'nothing changed, nothing to refresh');
});

test('expected payment and placement denials are JSON with a code and logged as warnings, not errors', async () => {
  for (const [code, status] of [['payment_required', 402], ['invalid_duration', 409]]) {
    const h = jobRoutes({ jobs: { job: draftJob({ featured: true }) }, paid: () => { throw new paidPublication.PublicationError(code, 'Denied for the fixture.'); } });
    const response = await h.put('job', { status: 'active' });
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: 'Denied for the fixture.', code });
    assert.equal(h.calls.logs.error.length, 0);
    assert.equal(h.calls.logs.warn.length, 1);
  }
  const broken = jobRoutes({ jobs: { job: draftJob() }, paid: () => { throw new Error('Fixture datastore failure'); } });
  assert.equal((await broken.put('job', { status: 'active' })).status, 500);
  assert.equal(broken.calls.logs.error.length, 1, 'unexpected failures still reach error monitoring');
});

test('a cache refresh outside a Next.js request never fails the saved job change', () => {
  const warnings = [];
  const cache = sourceModule('src/lib/employer-job-cache.ts', { globals: { console: { warn: (...args) => warnings.push(args) } } });
  assert.doesNotThrow(() => cache.refreshPublicJobs());
  assert.equal(warnings.length, 1);
  assert.match(readFileSync('src/lib/server/public-page-cache.ts', 'utf8'), new RegExp(`tags: \\["${cache.PUBLIC_JOBS_CACHE_TAG}"\\]`), 'the tag the public job caches use');
});

test('job detail tells the editor whether this account can buy credits (owner only, as checkout requires)', async () => {
  const job = { job: draftJob() };
  assert.equal((await (await jobRoutes({ jobs: job }).get('job')).json()).canPurchase, true);
  const admin = owner({ uid: 'teammate', orgRole: 'admin' });
  assert.equal((await (await jobRoutes({ context: admin, jobs: job }).get('job')).json()).canPurchase, false);
});

test('the jobs list says which featured drafts still need a duration', async () => {
  const rows = [
    { id: 'needs-duration', data: { title: 'Featured draft', status: 'draft', featured: true } },
    { id: 'published-before', data: { title: 'Featured', status: 'draft', featured: true, publication: { durationDays: 17, funding: 'featured_credit' } } },
  ];
  const body = await (await jobRoutes({ rows }).list()).json();
  assert.deepEqual(body.jobs.map(job => [job.id, job.publication]), [['needs-duration', null], ['published-before', { durationDays: 17 }]]);
});

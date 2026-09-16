import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { startIsolatedQaServer } from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
Object.assign(process.env, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' });
const app = initializeApp({ projectId: 'demo-iopps-preview' }, 'opportunity-qa');
const db = getFirestore(app), auth = getAuth(app), prefix = 'qa-opportunity-' + crypto.randomUUID();
let server; const documents = new Set(), uids = [], passes = [];
const pass = value => { passes.push(value); console.log('PASS ' + value); };
async function identity(suffix, verified = true, role = 'owner') {
  const uid = prefix + suffix; uids.push(uid);
  await auth.createUser({ uid, email: uid + '@example.invalid', emailVerified: verified });
  for (const collection of ['users', 'members', 'organizations', 'employers']) {
    const path = `${collection}/${uid}`; documents.add(path);
    await db.doc(path).set({ orgId: uid, employerId: uid, role: 'employer', orgRole: role, name: 'Fictional community organization', onboardingComplete: true, status: 'active' });
  }
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: await auth.createCustomToken(uid), returnSecureToken: true }) });
  assert.equal(response.status, 200); return { uid, token: (await response.json()).idToken };
}
try {
  server = await startIsolatedQaServer();
  async function request(method, path, token, body) {
    const response = await fetch(server.base + path, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json(), cache: response.headers.get('cache-control') };
  }
  const owner = await identity('-owner'), other = await identity('-other'), unverified = await identity('-unverified', false), recruiter = await identity('-recruiter', true, 'recruiter');
  for (const kind of ['events', 'scholarships']) {
    const endpoint = '/api/employer/' + kind, requestId = crypto.randomUUID(), title = 'Fictional ' + kind + ' ' + prefix;
    const full = kind === 'events' ? { title, description: 'A fictional community event.', eventType: 'Conference', startDate: '2027-06-12', endDate: '2027-06-13', city: 'Winnipeg', province: 'MB', rsvpLink: 'https://example.invalid/register', contactEmail: 'public@example.invalid' } : { title, description: 'A fictional learning bursary.', category: 'Bursary', amount: '$2,000', deadline: '2027-05-31', deadlineType: 'date', eligibility: 'Example learners only', applicationUrl: 'https://example.invalid/apply', applicationInstructions: 'Upload your statement.', contactEmail: 'public@example.invalid', fieldOfStudy: ['Design'] };
    assert.equal((await request('POST', endpoint, null, { title, requestId })).status, 401);
    assert.equal((await request('POST', endpoint, recruiter.token, { title, requestId })).status, 403);
    assert.equal((await request('POST', endpoint, owner.token, { ...full, requestId: crypto.randomUUID(), status: 'active', applicationUrl: 'javascript:alert(1)' })).status, 422);
    const draft = await request('POST', endpoint, owner.token, { title, requestId, status: 'draft', orgId: other.uid, featured: true });
    assert.equal(draft.status, 201, JSON.stringify(draft)); const id = draft.data.id;
    const privatePath = `organizationOpportunityDrafts/${kind}-${id}`, publicPath = `${kind}/${id}`;
    documents.add(privatePath); documents.add(publicPath);
    assert.equal(draft.data.status, 'draft'); assert.equal(draft.data.orgId, owner.uid); assert.notEqual(draft.data.featured, true);
    assert.equal((await db.doc(publicPath).get()).data().title, undefined);
    assert.equal((await db.doc(privatePath).get()).data().title, title);
    assert.equal((await request('GET', `/api/${kind}/${draft.data.slug}`)).status, 404);
    assert.equal((await request('GET', `/api/${kind}`)).data[kind].some(item => item.id === id), false);
    assert.equal((await request('GET', endpoint, owner.token)).data[kind].find(item => item.id === id).title, title);
    assert.equal((await request('GET', endpoint, other.token)).data[kind].some(item => item.id === id), false);
    assert.equal((await request('POST', endpoint, owner.token, { title: 'Retry must not duplicate', requestId })).data.id, id);
    assert.equal((await request('PATCH', endpoint, other.token, { id, revision: 1, status: 'active', ...full })).status, 404);
    assert.equal((await request('PATCH', endpoint, owner.token, { id, revision: 1, status: 'active' })).status, 422);
    pass(kind + ': incomplete drafts stay private, retries do not duplicate, and ownership is enforced');
    const active = await request('PATCH', endpoint, owner.token, { ...full, id, revision: 1, status: 'active', privateNotes: 'PRIVATE_CANARY', featured: true });
    assert.equal(active.status, 200, JSON.stringify(active)); assert.equal(active.data.revision, 2);
    assert.equal((await db.doc(privatePath).get()).exists, false);
    const detail = await request('GET', `/api/${kind}/${active.data.slug}`); const record = detail.data[kind === 'events' ? 'event' : 'scholarship'];
    assert.equal(detail.status, 200, JSON.stringify(detail)); assert.equal(detail.cache, 'no-store');
    assert.equal(record.title, title); assert.equal(record.contactEmail, full.contactEmail); assert.ok(!JSON.stringify(record).includes('PRIVATE_CANARY'));
    assert.equal(record[kind === 'events' ? 'rsvpLink' : 'applicationUrl'], full[kind === 'events' ? 'rsvpLink' : 'applicationUrl']);
    if (kind === 'scholarships') { assert.equal(record.applicationInstructions, full.applicationInstructions); assert.deepEqual(record.fieldOfStudy, ['Design']); }
    assert.equal((await request('GET', `/api/${kind}`)).data[kind].some(item => item.id === id), true);
    const duplicateTitle = await request('POST', endpoint, owner.token, { ...full, requestId: crypto.randomUUID(), status: 'draft' });
    assert.equal(duplicateTitle.status, 201); assert.notEqual(duplicateTitle.data.id, id); assert.notEqual(duplicateTitle.data.slug, active.data.slug);
    documents.add(`${kind}/${duplicateTitle.data.id}`); documents.add(`organizationOpportunityDrafts/${kind}-${duplicateTitle.data.id}`);
    assert.equal((await request('PATCH', endpoint, owner.token, { id, revision: 1, status: 'closed' })).status, 409);
    pass(kind + ': publishing retains contact and application details; unique URLs and revision checks protect edits');
    const mirrorPath = `posts/${kind === 'events' ? 'event' : 'scholarship'}-${active.data.slug}`; documents.add(mirrorPath);
    await db.doc(mirrorPath).set({ ...full, type: kind === 'events' ? 'event' : 'scholarship', slug: active.data.slug, status: 'active' });
    const closed = await request('PATCH', endpoint, owner.token, { id, revision: 2, status: 'closed' });
    assert.equal(closed.status, 200); assert.equal(closed.data.status, 'closed');
    assert.equal((await request('GET', `/api/${kind}/${active.data.slug}`)).status, 404);
    assert.equal((await request('GET', `/api/${kind}`)).data[kind].some(item => item.slug === active.data.slug), false);
    assert.equal((await db.doc(publicPath).get()).data().title, undefined);
    assert.equal((await db.doc(privatePath).get()).data().title, title);
    const html = await fetch(server.base + `/${kind}/${active.data.slug}`).then(response => response.text());
    assert.ok(!html.includes(title), 'Closed content must not leak into metadata');
    const reopened = await request('PATCH', endpoint, owner.token, { id, revision: 3, status: 'active' });
    assert.equal(reopened.status, 200, JSON.stringify(reopened)); assert.equal(reopened.data.title, title);
    const unpublished = await request('PATCH', endpoint, owner.token, { id, revision: 4, status: 'draft' });
    assert.equal(unpublished.status, 200); assert.equal((await request('GET', `/api/${kind}/${id}`)).status, 404);
    pass(kind + ': closing, reopening and unpublishing work; old feed copies and metadata cannot revive a hidden listing');
    const unverifiedDraft = await request('POST', endpoint, unverified.token, { title, requestId: crypto.randomUUID() });
    assert.equal(unverifiedDraft.status, 201); documents.add(`${kind}/${unverifiedDraft.data.id}`); documents.add(`organizationOpportunityDrafts/${kind}-${unverifiedDraft.data.id}`);
    assert.equal((await request('PATCH', endpoint, unverified.token, { ...full, id: unverifiedDraft.data.id, revision: 1, status: 'active' })).status, 403);
    pass(kind + ': email verification is required for publishing while drafts remain available');
  }
  assert.equal((await request('PATCH', '/api/scholarships', 'undefined', { status: 'active', fromStatus: 'draft' })).status, 401);
  pass('Missing cron secrets cannot authorize mass scholarship changes');
  console.log(`PASS ${passes.length} opportunity journey groups`);
} finally {
  if (server) await server.stop();
  await Promise.all([...documents].map(path => db.doc(path).delete()));
  await Promise.all(uids.map(uid => auth.deleteUser(uid)));
  await db.terminate(); await deleteApp(app);
}

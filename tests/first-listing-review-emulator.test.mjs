import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';

// Product rule: an organization's first free event or scholarship waits for an IOPPS review;
// after one approval its later free listings publish immediately. Real auth, routes and rules data.
test('first free listing is held for review, then later listings publish immediately', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
  const { getAdminAuth, getAdminDb } = await import('../src/lib/firebase-admin.ts');
  const { NextRequest } = await import('next/server.js');
  const events = await import('../src/app/api/employer/events/route.ts');
  const scholarships = await import('../src/app/api/employer/scholarships/route.ts');
  const reviews = await import('../src/app/api/admin/opportunity-reviews/route.ts');
  const db = getAdminDb(), auth = getAdminAuth();
  const prefix = 'qa-first-review-' + crypto.randomUUID(), paths = new Set(), users = [], clients = [];
  const seed = async (path, data) => { paths.add(path); await db.doc(path).set(data); };
  async function identity(suffix, { admin = false, organization = {} } = {}) {
    const uid = prefix + suffix; users.push(uid);
    await auth.createUser({ uid, email: uid + '@example.invalid', emailVerified: true });
    if (admin) await auth.setCustomUserClaims(uid, { admin: true, role: 'admin' });
    await seed(`users/${uid}`, admin ? { role: 'admin', status: 'active' } : { role: 'employer', status: 'active', orgId: uid, orgRole: 'owner', adminSignupNotifiedAt: 'fixture' });
    if (!admin) {
      await seed(`members/${uid}`, { displayName: 'Fictional QA profile', orgId: uid, orgRole: 'owner', role: 'employer' });
      await seed(`organizations/${uid}`, { name: 'Fictional first-listing org ' + suffix, status: 'approved', onboardingComplete: true, ...organization });
    }
    const app = initializeApp({ projectId: 'demo-iopps-preview', apiKey: 'fictional-emulator-key' }, uid); clients.push(app);
    const clientAuth = getAuth(app); connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    await signInWithCustomToken(clientAuth, await auth.createCustomToken(uid));
    return { uid, token: await clientAuth.currentUser.getIdToken() };
  }
  const request = (path, actor, method = 'GET', body) => new NextRequest('http://127.0.0.1' + path, { method, headers: { ...(actor ? { authorization: `Bearer ${actor.token}` } : {}), 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const full = kind => kind === 'events'
    ? { title: 'Fictional first gathering ' + prefix, description: 'A fictional community event.', eventType: 'Conference', startDate: '2027-06-12', endDate: '2027-06-13', city: 'Winnipeg', province: 'MB', rsvpLink: 'https://example.invalid/register', contactEmail: 'public@example.invalid' }
    : { title: 'Fictional first bursary ' + prefix, description: 'A fictional learning bursary.', category: 'Bursary', amount: '$2,000', deadline: '2027-05-31', deadlineType: 'date', eligibility: 'Example learners only', applicationUrl: 'https://example.invalid/apply', applicationInstructions: 'Upload your statement.', contactEmail: 'public@example.invalid' };
  const route = kind => kind === 'events' ? events : scholarships;
  const publish = async (kind, actor, extra = {}) => {
    const response = await route(kind).POST(request('/api/employer/' + kind, actor, 'POST', { ...full(kind), requestId: crypto.randomUUID(), status: 'active', ...extra }));
    const body = await response.json();
    paths.add(`${kind}/${body.id}`); paths.add(`organizationOpportunityDrafts/${kind}-${body.id}`);
    return { status: response.status, body };
  };
  const list = async (kind, actor) => (await route(kind).GET(request('/api/employer/' + kind, actor))).json();
  const notifications = async orgId => (await db.collection('adminNotifications').where('orgId', '==', orgId).get()).docs.map(doc => { paths.add(doc.ref.path); return doc.data(); });
  const decide = (actor, body) => reviews.POST(request('/api/admin/opportunity-reviews', actor, 'POST', body));
  try {
    const admin = await identity('-admin', { admin: true });
    const owner = await identity('-owner');

    await t.test('an unknown organization submits its first free listing for review, privately', async () => {
      assert.equal((await list('events', owner)).reviewFirst, true);
      const first = await publish('events', owner);
      assert.equal(first.status, 201, JSON.stringify(first.body));
      assert.equal(first.body.status, 'pending'); assert.equal(first.body.active, false); assert.equal(first.body.firstPublishedAt, null);
      assert.equal((await db.doc(`events/${first.body.id}`).get()).exists, false, 'nothing reaches the public collection');
      assert.equal((await db.doc(`organizationOpportunityDrafts/events-${first.body.id}`).get()).data().status, 'pending');
      const edited = await route('events').PATCH(request('/api/employer/events', owner, 'PATCH', { ...full('events'), id: first.body.id, revision: 1, status: 'active', description: 'Updated while in review.' }));
      assert.equal(edited.status, 200); assert.equal((await edited.json()).status, 'pending');
      const notes = await notifications(owner.uid);
      assert.equal(notes.length, 1, 'one notice per submission, not per edit'); assert.equal(notes[0].link, '/admin/opportunity-reviews');
      t.firstId = first.body.id;
    });

    await t.test('only admins see the queue; changes requested return it to the organization', async () => {
      assert.equal((await reviews.GET(request('/api/admin/opportunity-reviews', owner))).status, 403);
      const queue = await (await reviews.GET(request('/api/admin/opportunity-reviews', admin))).json();
      const entry = queue.listings.find(item => item.id === t.firstId);
      assert.equal(entry?.revision, 2); assert.equal(entry.description, 'Updated while in review.');
      assert.equal((await decide(admin, { kind: 'events', id: t.firstId, revision: 2, action: 'changes_requested', feedback: 'short' })).status, 400);
      assert.equal((await decide(owner, { kind: 'events', id: t.firstId, revision: 2, action: 'approve' })).status, 403);
      assert.equal((await decide(admin, { kind: 'events', id: t.firstId, revision: 2, action: 'changes_requested', feedback: 'Please add the venue address.' })).status, 200);
      const mine = (await list('events', owner)).events.find(item => item.id === t.firstId);
      assert.equal(mine.status, 'changes_requested'); assert.equal(mine.reviewFeedback, 'Please add the venue address.');
      const resubmitted = await route('events').PATCH(request('/api/employer/events', owner, 'PATCH', { ...full('events'), id: t.firstId, revision: 3, status: 'active' }));
      assert.equal((await resubmitted.json()).status, 'pending');
      assert.equal((await notifications(owner.uid)).length, 2, 'a resubmission notifies again');
    });

    await t.test('approval publishes the listing and trusts the organization for later free listings', async () => {
      assert.equal((await decide(admin, { kind: 'events', id: t.firstId, revision: 3, action: 'approve' })).status, 409, 'a stale decision is refused');
      const approved = await decide(admin, { kind: 'events', id: t.firstId, revision: 4, action: 'approve' });
      assert.equal(approved.status, 200, await approved.clone().text());
      const live = (await db.doc(`events/${t.firstId}`).get()).data();
      assert.equal(live.status, 'active'); assert.equal(live.active, true); assert.ok(live.firstPublishedAt);
      assert.equal((await db.doc(`organizationOpportunityDrafts/events-${t.firstId}`).get()).exists, false);
      assert.ok((await db.doc(`organizations/${owner.uid}`).get()).data().freeListingApprovedAt);
      assert.equal((await list('scholarships', owner)).reviewFirst, false);
      const next = await publish('scholarships', owner);
      assert.equal(next.body.status, 'active', 'later listings publish immediately, of either kind');
      assert.equal((await db.doc(`scholarships/${next.body.id}`).get()).data().status, 'active');
    });

    await t.test('organizations IOPPS already knows are not held', async () => {
      const verified = await identity('-verified', { organization: { verified: true } });
      assert.equal((await publish('events', verified)).body.status, 'active');
      const existing = await identity('-existing');
      await seed(`events/${prefix}-legacy`, { id: `${prefix}-legacy`, orgId: existing.uid, title: 'Fictional earlier event', status: 'closed', active: false });
      assert.equal((await publish('scholarships', existing)).body.status, 'active', 'an organization that published before is not held');
    });

    await t.test('a rejected first listing stays private and cannot be edited back into review', async () => {
      const newcomer = await identity('-newcomer');
      const submitted = await publish('scholarships', newcomer);
      assert.equal(submitted.body.status, 'pending');
      assert.equal((await decide(admin, { kind: 'scholarships', id: submitted.body.id, revision: 1, action: 'reject', feedback: 'We could not confirm this bursary.' })).status, 200);
      assert.equal((await db.doc(`scholarships/${submitted.body.id}`).get()).exists, false);
      const retry = await route('scholarships').PATCH(request('/api/employer/scholarships', newcomer, 'PATCH', { ...full('scholarships'), id: submitted.body.id, revision: 2, status: 'active' }));
      assert.equal(retry.status, 403);
      assert.equal((await db.doc(`organizations/${newcomer.uid}`).get()).data().freeListingApprovedAt, undefined);
    });
  } finally {
    for (const uid of users) for (const sub of ['activity']) for (const doc of (await db.collection(`organizations/${uid}/${sub}`).get()).docs) await doc.ref.delete();
    for (const path of paths) await db.doc(path).delete();
    for (const uid of users) await auth.deleteUser(uid).catch(e => { if (e.code !== 'auth/user-not-found') throw e; });
    for (const app of clients) await deleteApp(app);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, updateDoc, setDoc, getDoc, terminate } from 'firebase/firestore';

test('remediation: real authentication, salary rules, opportunity deletion and upload retention', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) assert.match(process.env[key], /^127\.0\.0\.1:\d+$/);
  const { getAdminApp, getAdminAuth, getAdminDb } = await import('../src/lib/firebase-admin.ts');
  const { NextRequest } = await import('next/server.js');
  const db = getAdminDb(), auth = getAdminAuth(), bucket = getStorage(getAdminApp()).bucket('demo-iopps-preview.appspot.com');
  const prefix = 'qa-remediation-' + crypto.randomUUID(), paths = new Set(), files = new Set(), users = [], clients = [];
  const seed = async (path, data) => { paths.add(path); await db.doc(path).set(data); };
  async function identity(suffix, role = 'community', orgRole = 'owner') {
    const uid = prefix + suffix; users.push(uid);
    await auth.createUser({ uid, email: uid + '@example.invalid', emailVerified: true });
    await seed(`users/${uid}`, { role, status: 'active', adminSignupNotifiedAt: 'fixture', ...(role === 'employer' ? { orgId: uid, orgRole } : {}) });
    await seed(`members/${uid}`, { displayName: 'Fictional QA profile', ...(role === 'employer' ? { orgId: uid, orgRole, role } : {}) });
    if (role === 'employer') await seed(`organizations/${uid}`, { name: 'Fictional QA organization', status: 'approved', onboardingComplete: true });
    const app = initializeApp({ projectId: 'demo-iopps-preview', apiKey: 'fictional-emulator-key' }, uid); clients.push(app);
    const clientAuth = getAuth(app); connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    await signInWithCustomToken(clientAuth, await auth.createCustomToken(uid));
    const store = getFirestore(app); connectFirestoreEmulator(store, '127.0.0.1', 8080);
    return { uid, token: await clientAuth.currentUser.getIdToken(), store };
  }
  const request = (path, actor, method = 'GET', body) => new NextRequest('http://127.0.0.1' + path, { method, headers: { ...(actor ? { authorization: `Bearer ${actor.token}` } : {}), 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    const member = await identity('-member'), owner = await identity('-owner', 'employer'), other = await identity('-other', 'employer'), recruiter = await identity('-recruiter', 'employer', 'recruiter');
    await t.test('closure preserves legacy linked owners and allows unrelated organization members to leave', async () => {
      const actor = await identity('-legacy-owner');
      const orgId = prefix + '-linked-organization';
      const closure = await import('../src/app/api/account/route.ts');
      for (const [userLink, memberLink, organizationOwner, employerOwner] of [
        [{ employerId: orgId, orgRole: 'owner' }, {}, {}, {}],
        [{ orgId, orgRole: 'owner' }, {}, {}, {}],
        [{}, { employerId: orgId, orgRole: 'owner' }, {}, {}],
        [{}, { orgId, orgRole: 'owner' }, {}, {}],
        [{ employerId: orgId }, { orgRole: 'owner' }, {}, {}],
        [{ employerId: orgId }, {}, { ownerId: actor.uid }, {}],
        [{ employerId: orgId }, {}, {}, { uid: actor.uid }],
      ]) {
        await seed(`users/${actor.uid}`, { role: 'employer', status: 'active', ...userLink });
        await seed(`members/${actor.uid}`, { displayName: 'Fictional linked owner', ...memberLink });
        await seed(`organizations/${orgId}`, { status: 'approved', ...organizationOwner });
        await seed(`employers/${orgId}`, { status: 'approved', ...employerOwner });
        assert.equal((await closure.DELETE(request('/api/account', actor, 'DELETE', { confirmDelete: true }))).status, 409);
        assert.equal((await auth.getUser(actor.uid)).uid, actor.uid);
        assert.equal((await db.doc(`users/${actor.uid}`).get()).data().status, 'active');
        assert.equal((await db.doc(`account_cleanup/${actor.uid}`).get()).exists, false);
      }
      await seed(`users/${actor.uid}`, { role: 'employer', status: 'active', employerId: orgId, orgRole: 'member' });
      await seed(`members/${actor.uid}`, { displayName: 'Fictional non-owner' });
      await seed(`employers/${orgId}`, { status: 'approved', uid: other.uid });
      paths.add(`account_cleanup/${actor.uid}`);
      assert.equal((await closure.DELETE(request('/api/account', actor, 'DELETE', { confirmDelete: true }))).status, 200);
      assert.equal((await db.doc(`organizations/${orgId}`).get()).exists, true);
      assert.equal((await db.doc(`employers/${orgId}`).get()).data().uid, other.uid);
    });
    await t.test('signup retries repair either missing mirror without resetting stored entitlements or membership', async () => {
      const signup = await import('../src/app/api/employer/signup/route.ts');
      for (const sourceCollection of ['employers', 'organizations']) {
        const actor = await identity('-partial-' + sourceCollection);
        const counterpart = sourceCollection === 'employers' ? 'organizations' : 'employers';
        const sourcePath = `${sourceCollection}/${actor.uid}`, targetPath = `${counterpart}/${actor.uid}`;
        const data = { name: 'Fictional existing organization', slug: 'fictional-paid-profile', plan: 'tier2', jobCredits: 7, featuredCredits: 3, status: 'disabled', publicVisibility: 'hidden', directoryReview: { status: 'pending' }, createdAt: 'original', updatedAt: 'original' };
        await seed(sourcePath, data); paths.add(targetPath);
        const userBefore = (await db.doc(`users/${actor.uid}`).get()).data();
        const claimsBefore = (await auth.getUser(actor.uid)).customClaims;
        const call = () => signup.POST(request('/api/employer/signup', actor, 'POST', { name: 'Do not overwrite', plan: 'free' }));
        for (const response of await Promise.all([call(), call()])) {
          assert.equal(response.status, 200, await response.clone().text());
          assert.equal((await response.json()).alreadyExists, true);
        }
        assert.deepEqual((await db.doc(sourcePath).get()).data(), data);
        const repaired = (await db.doc(targetPath).get()).data();
        for (const key of Object.keys(data).filter(key => key !== 'updatedAt')) assert.deepEqual(repaired[key], data[key]);
        assert.ok(repaired.updatedAt.toMillis() > 0);
        assert.deepEqual((await db.doc(`users/${actor.uid}`).get()).data(), userBefore);
        assert.deepEqual((await auth.getUser(actor.uid)).customClaims, claimsBefore);
        assert.equal((await call()).status, 200);
        assert.deepEqual((await db.doc(targetPath).get()).data(), repaired, 'completed retries do not rewrite either mirror');
      }
    });
    await t.test('legacy employer mirror repair translates stored name aliases and rejects a nameless source', async () => {
      const signup = await import('../src/app/api/employer/signup/route.ts');
      for (const field of ['organizationName', 'companyName', 'missing']) {
        const actor = await identity('-legacy-name-' + field);
        const sourcePath = `employers/${actor.uid}`, targetPath = `organizations/${actor.uid}`;
        const data = { name: ' ', ...(field === 'missing' ? {} : { [field]: '  Fictional Legacy Organization  ' }), slug: 'fictional-legacy-' + field,
          plan: 'tier2', jobCredits: 9, status: 'disabled', publicVisibility: 'hidden', directoryReview: { status: 'pending' }, createdAt: 'original' };
        await seed(sourcePath, data); paths.add(targetPath);
        const userBefore = (await db.doc(`users/${actor.uid}`).get()).data();
        const claimsBefore = (await auth.getUser(actor.uid)).customClaims;
        const call = () => signup.POST(request('/api/employer/signup', actor, 'POST', { name: 'Do not replace the stored name', plan: 'free' }));
        for (const response of await Promise.all([call(), call()])) {
          assert.equal(response.status, field === 'missing' ? 409 : 200, await response.clone().text());
          const result = await response.json();
          if (field !== 'missing') {
            assert.equal(result.alreadyExists, true);
            assert.equal(result.slug, data.slug);
            assert.equal(result.confirmationEmailSent, false);
          }
        }
        assert.deepEqual((await db.doc(sourcePath).get()).data(), data);
        assert.deepEqual((await db.doc(`users/${actor.uid}`).get()).data(), userBefore);
        assert.deepEqual((await auth.getUser(actor.uid)).customClaims, claimsBefore);
        const repaired = await db.doc(targetPath).get();
        if (field === 'missing') assert.equal(repaired.exists, false, 'Do not create a blank canonical profile');
        else {
          assert.equal(repaired.data().name, 'Fictional Legacy Organization');
          for (const key of Object.keys(data).filter(key => key !== 'name')) assert.deepEqual(repaired.data()[key], data[key]);
          assert.equal((await call()).status, 200);
          assert.deepEqual((await db.doc(targetPath).get()).data(), repaired.data(), 'Completed retries are read-only');
        }
      }
    });
    await t.test('distinct legacy employer and canonical organization IDs retain opportunity list, close and delete access', async () => {
      const actor = await identity('-split-owner'), orgId = prefix + '-canonical-org', employerId = prefix + '-legacy-employer';
      await seed(`users/${actor.uid}`, { status: 'active', role: 'employer', orgRole: 'owner', orgId, employerId });
      await seed(`members/${actor.uid}`, { role: 'employer', orgRole: 'owner', orgId });
      await seed(`organizations/${orgId}`, { status: 'approved', name: 'Fictional canonical org', onboardingComplete: true });
      await seed(`employers/${employerId}`, { status: 'approved', name: 'Fictional legacy employer' });
      for (const kind of ['events', 'scholarships']) {
        const route = kind === 'events' ? await import('../src/app/api/employer/events/route.ts') : await import('../src/app/api/employer/scholarships/route.ts');
        const endpoint = '/api/employer/' + kind;
        const publicId = prefix + '-legacy-' + kind, privateId = prefix + '-legacy-private-' + kind, foreignId = prefix + '-foreign-' + kind;
        await seed(`${kind}/${publicId}`, { id: publicId, employerId, title: 'Fictional legacy listing', status: 'active', active: true, revision: 4 });
        await seed(`organizationOpportunityDrafts/${kind}-${privateId}`, { id: privateId, kind, employerId, title: 'Fictional private listing', status: 'draft', revision: 2 });
        await seed(`${kind}/${foreignId}`, { id: foreignId, orgId: other.uid, employerId, title: 'Fictional foreign listing with a stale legacy link', status: 'closed', revision: 1 });
        const movedId = prefix + '-moved-' + kind;
        await seed(`${kind}/${movedId}`, { id: movedId, orgId: other.uid, employerId: other.uid, title: 'Fictional moved listing', status: 'closed', revision: 4 });
        await seed(`organizationOpportunityDrafts/${kind}-${movedId}`, { id: movedId, kind, orgId, employerId, title: 'Fictional stale private copy', status: 'draft', revision: 2 });
        paths.add(`organizationOpportunityDrafts/${kind}-${publicId}`);
        const listed = await (await route.GET(request(endpoint, actor))).json();
        assert.deepEqual(listed[kind].map(row => row.id).sort(), [publicId, privateId].sort());
        assert.equal((await route.PATCH(request(endpoint, actor, 'PATCH', { id: foreignId, status: 'closed', revision: 1 }))).status, 404);
        assert.equal((await route.DELETE(request(endpoint, actor, 'DELETE', { id: foreignId, confirmDelete: true, revision: 1 }))).status, 404);
        assert.equal((await route.PATCH(request(endpoint, actor, 'PATCH', { id: movedId, status: 'closed', revision: 2 }))).status, 404);
        assert.equal((await route.DELETE(request(endpoint, actor, 'DELETE', { id: movedId, confirmDelete: true, revision: 2 }))).status, 404);
        assert.equal((await route.PATCH(request(endpoint, actor, 'PATCH', { id: publicId, status: 'closed', revision: 4 }))).status, 200);
        const closed = (await db.doc(`${kind}/${publicId}`).get()).data();
        assert.equal(closed.orgId, orgId); assert.equal(closed.employerId, employerId); assert.equal(closed.title, undefined);
        assert.equal((await route.DELETE(request(endpoint, actor, 'DELETE', { id: publicId, confirmDelete: true, revision: 5 }))).status, 200);
        assert.equal((await route.DELETE(request(endpoint, actor, 'DELETE', { id: privateId, confirmDelete: true, revision: 2 }))).status, 200);
        assert.deepEqual((await (await route.GET(request(endpoint, actor))).json())[kind], []);
      }
    });
    await t.test('salary range is enforced by profile API and direct Firestore rules, preserving unrelated legacy edits', async () => {
      const profile = await import('../src/app/api/profile/route.ts');
      const ref = doc(member.store, 'members', member.uid);
      for (const salaryRange of [{ min: 90000, max: 50000 }, { min: -1, max: 10 }, { min: '1', max: 10 }, { min: 1, max: 1e12 }]) {
        await assert.rejects(updateDoc(ref, { salaryRange }), e => e.code === 'permission-denied');
        assert.equal((await profile.PATCH(request('/api/profile', member, 'PATCH', { salaryRange }))).status, 400);
      }
      await updateDoc(ref, { salaryRange: { min: 40000, max: 60000 } });
      assert.equal((await getDoc(ref)).data().salaryRange.min, 40000);
      await db.doc(`members/${member.uid}`).update({ salaryRange: { min: 90000, max: 50000 } });
      await updateDoc(ref, { headline: 'Safe unrelated legacy edit' });
      await updateDoc(ref, { salaryRange: null });
      for (const collection of ['account_cleanup', 'password_reset_limits']) await assert.rejects(setDoc(doc(member.store, collection, member.uid), { notBefore: 'now' }), e => e.code === 'permission-denied');
    });
    await t.test('only an owner can delete a draft or closed listing; revisions, history and tombstones are preserved', async () => {
      for (const kind of ['events', 'scholarships']) {
        const route = kind === 'events' ? await import('../src/app/api/employer/events/route.ts') : await import('../src/app/api/employer/scholarships/route.ts');
        const endpoint = '/api/employer/' + kind;
        const created = await route.POST(request(endpoint, owner, 'POST', { title: 'Fictional abandoned draft', requestId: crypto.randomUUID() }));
        assert.equal(created.status, 201); const listing = await created.json(), id = listing.id;
        paths.add(`${kind}/${id}`); paths.add(`organizationOpportunityDrafts/${kind}-${id}`);
        const body = { id, revision: listing.revision, confirmDelete: true };
        assert.equal((await route.DELETE(request(endpoint, null, 'DELETE', body))).status, 401);
        assert.equal((await route.DELETE(request(endpoint, other, 'DELETE', body))).status, 404);
        assert.equal((await route.DELETE(request(endpoint, recruiter, 'DELETE', body))).status, 403);
        assert.equal((await route.DELETE(request(endpoint, owner, 'DELETE', { ...body, confirmDelete: false }))).status, 400);
        assert.equal((await route.DELETE(request(endpoint, owner, 'DELETE', { ...body, revision: 0 }))).status, 409);
        const historyPath = `${kind}/${id}/history/preserved`;
        await seed(historyPath, { note: 'History must remain' });
        assert.equal((await route.DELETE(request(endpoint, owner, 'DELETE', body))).status, 200);
        assert.equal((await db.doc(historyPath).get()).exists, true);
        assert.equal((await db.doc(`organizationOpportunityDrafts/${kind}-${id}`).get()).data().title, undefined);
        assert.equal((await route.GET(request(endpoint, owner))).status, 200);
        assert.equal((await (await route.GET(request(endpoint, owner))).json())[kind].some(item => item.id === id), false);
        assert.equal((await route.PATCH(request(endpoint, owner, 'PATCH', { id, revision: 2, title: 'Resurrection', status: 'draft' }))).status, 403);
        const activeId = prefix + '-' + kind;
        await seed(`${kind}/${activeId}`, { id: activeId, orgId: owner.uid, status: 'active', active: true, revision: 1, slug: activeId, title: 'Fictional active listing' });
        assert.equal((await route.DELETE(request(endpoint, owner, 'DELETE', { id: activeId, revision: 1, confirmDelete: true }))).status, 409);
      }
    });
    await t.test('self-service account closure deletes unshared uploads and queues a later sweep; submitted archives remain', async () => {
      const uid = member.uid, privateAvatar = `avatars/${uid}.png`, privateResume = `resumes/${uid}/private.pdf`, sharedResume = `resumes/${uid}/shared.pdf`, archive = `application-documents/${uid}/archive.pdf`, foreign = `avatars/${other.uid}.png`;
      for (const path of [privateAvatar, privateResume, sharedResume, archive, foreign]) { files.add(path); await bucket.file(path).save('Fictional QA bytes'); }
      const appId = prefix + '-application';
      await seed(`applications/${appId}`, { userId: uid, employerId: owner.uid, resumeUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(sharedResume)}?token=fictional`, profileSnapshot: { resumeUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(archive)}?token=fictional` } });
      const closure = await import('../src/app/api/account/route.ts');
      assert.equal((await closure.DELETE(request('/api/account', owner, 'DELETE', { confirmDelete: true }))).status, 409);
      paths.add(`account_cleanup/${uid}`);
      const response = await closure.DELETE(request('/api/account', member, 'DELETE', { confirmDelete: true, uid: other.uid }));
      assert.equal(response.status, 200, await response.text());
      assert.equal((await bucket.file(privateAvatar).exists())[0], false); assert.equal((await bucket.file(privateResume).exists())[0], false);
      for (const path of [sharedResume, archive, foreign]) assert.equal((await bucket.file(path).exists())[0], true);
      assert.equal((await db.doc(`applications/${appId}`).get()).exists, true);
      assert.equal((await db.doc(`users/${uid}`).get()).data().status, 'deleted');
      assert.ok(Date.parse((await db.doc(`account_cleanup/${uid}`).get()).data().notBefore) > Date.now() + 60 * 60000);
      await assert.rejects(auth.getUser(uid), e => e.code === 'auth/user-not-found');
      assert.equal((await auth.getUser(other.uid)).uid, other.uid);
    });
  } finally {
    for (const path of paths) await db.doc(path).delete();
    for (const path of files) await bucket.file(path).delete({ ignoreNotFound: true });
    for (const uid of users) await auth.deleteUser(uid).catch(e => { if (e.code !== 'auth/user-not-found') throw e; });
    for (const app of clients) { await terminate(getFirestore(app)); await deleteApp(app); }
    await db.terminate();
  }
});

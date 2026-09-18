import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';

test('retirement preserves authenticated applicant fallback, private peer identity and server-only email', { skip: process.env.IOPPS_TEST_MEMBER_RETIREMENT !== 'true' }, async t => {
  const projectId = 'demo-iopps-preview';
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) assert.match(process.env[key] || '', /^127\.0\.0\.1:\d+$/);
  const prefix = 'retirement-workflows-' + crypto.randomUUID();
  const admin = initializeAdmin({ projectId }, prefix), db = adminFirestore(admin), auth = adminAuth(admin);
  const apps = [], identities = [], paths = new Set();
  async function seed(c, id, data) { paths.add(`${c}/${id}`); await db.doc(`${c}/${id}`).set(data); }
  async function actor(suffix, role = 'community') {
    const uid = prefix + suffix;
    await auth.createUser({ uid, email: uid + '@example.invalid', emailVerified: true }); identities.push(uid);
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, uid); apps.push(app);
    const client = getAuth(app); connectAuthEmulator(client, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    await signInWithCustomToken(client, await auth.createCustomToken(uid));
    await seed('users', uid, { role, status: 'active' });
    await seed('members', uid, { displayName: suffix, email: 'PROFILE_EMAIL_NOT_AUTH@example.invalid', resumeUrl: 'PRIVATE_RESUME', salaryRange: 'PRIVATE_SALARY', bio: 'Legacy bio', photoURL: '/avatar.png' });
    return { uid, token: await client.currentUser.getIdToken() };
  }
  try {
    const employer = await actor('-employer', 'employer'), applicant = await actor('-applicant'), outsider = await actor('-outsider');
    await seed('organizations', employer.uid, { name: 'Fictional employer', status: 'approved' });
    const { NextRequest } = await import('next/server.js');
    const request = (path, actor, body) => new NextRequest('http://127.0.0.1' + path, { method: body ? 'POST' : 'GET', headers: actor ? { authorization: `Bearer ${actor.token}`, 'content-type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
    const applications = await import('../src/app/api/employer/applications/route.ts');
    const peer = await import('../src/app/api/messages/peer/route.ts');
    const notify = await import('../src/app/api/messages/notify/route.ts');
    const snapshot = { displayName: 'Captured applicant', bio: 'Captured bio', capturedAt: '2020-01-01T00:00:00.000Z' };
    const legacy = { userId: applicant.uid, employerId: employer.uid, status: 'submitted', coverLetter: 'Historical letter' };
    await seed('applications', prefix + '-legacy', legacy);
    await seed('applications', prefix + '-snapshot', { ...legacy, profileSnapshot: snapshot });
    await seed('applications', prefix + '-foreign', { userId: outsider.uid, employerId: 'other-org', status: 'submitted' });
    await t.test('verified hiring owner receives snapshots and allowlisted fallback without foreign records or rewriting history', async () => {
      const response = await applications.GET(request('/api/employer/applications', employer));
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.deepEqual(data.applications.map(a => a.id).sort(), [prefix + '-legacy', prefix + '-snapshot'].sort());
      assert.deepEqual(data.applications.find(a => a.id.endsWith('-snapshot')).profileSnapshot, snapshot);
      assert.equal(data.profiles[applicant.uid].bio, 'Legacy bio');
      for (const field of ['resumeUrl', 'salaryRange', 'orgId', 'role']) assert.equal(data.profiles[applicant.uid][field], undefined);
      assert.equal(data.profiles[outsider.uid], undefined);
      assert.equal((await applications.GET(request('/api/employer/applications', outsider))).status, 403);
      assert.equal((await applications.GET(request('/api/employer/applications'))).status, 401);
      assert.deepEqual((await db.doc(`applications/${prefix}-legacy`).get()).data(), legacy);
    });
    await seed('conversations', prefix, { participants: [employer.uid, applicant.uid], unreadBy: applicant.uid });
    await seed('messages', prefix, { conversationId: prefix, senderId: employer.uid, text: 'Private message fixture' });
    await t.test('actual ID tokens scope the minimal peer projection to existing participants', async () => {
      const response = await peer.GET(request(`/api/messages/peer?conversationId=${prefix}&uid=${outsider.uid}`, employer));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { peer: { uid: applicant.uid, displayName: '-applicant', photoURL: '/avatar.png' } });
      assert.equal((await peer.GET(request(`/api/messages/peer?conversationId=${prefix}`, outsider))).status, 404);
      assert.equal((await peer.GET(request(`/api/messages/peer?conversationId=${prefix}`))).status, 401);
    });
    await t.test('notification recipient comes from conversation plus Auth, with one emulator-only mail receipt on retries', async () => {
      paths.add(`mail/message-${prefix}`);
      assert.equal((await notify.POST(request('/api/messages/notify', outsider, { messageId: prefix }))).status, 404);
      for (let i = 0; i < 2; i++) assert.equal((await notify.POST(request('/api/messages/notify', employer, { messageId: prefix, recipientId: outsider.uid, email: 'forged@example.invalid' }))).status, 200);
      const receipt = (await db.doc(`mail/message-${prefix}`).get()).data();
      assert.equal(receipt.to, applicant.uid + '@example.invalid');
      assert.equal(receipt.status, 'pending');
      assert.equal((await db.collection('mail').where('to', '==', receipt.to).get()).size, 1);
    });
  } finally {
    for (const path of paths) await db.doc(path).delete();
    for (const app of apps) await deleteApp(app);
    for (const uid of identities) await auth.deleteUser(uid);
    await db.terminate(); await deleteAdmin(admin);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { startIsolatedQaServer } from '../scripts/local-qa-server.mjs';

test('applicant history authenticates, isolates ownership, and serializes timestamps', {
  skip: process.env.IOPPS_TEST_EMULATORS !== 'true',
}, async t => {
  const server = await startIsolatedQaServer();
  t.after(() => server.stop());
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
  const app = initializeApp({ projectId: 'demo-iopps-preview' }, 'applicant-history-test');
  const auth = getAuth(app);
  const db = getFirestore(app);
  const uid = `history-api-${crypto.randomUUID()}`;
  const email = `${uid}@example.test`;
  const origin = server.base;
  assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname), 'Emulator QA must never target production');
  const base = origin + '/api/applications';
  try {
    await auth.createUser({ uid, email, password: 'LocalPreview123!', emailVerified: true });
    await db.doc(`applications/${uid}`).set({ userId: uid, postId: 'test', postTitle: 'Test role',
      status: 'submitted', appliedAt: Timestamp.fromMillis(100000),
      statusHistory: [{ status: 'submitted', timestamp: Timestamp.fromMillis(100000) }],
      profileSnapshot: { privateField: 'not needed for history' } });
    await db.doc(`applications/${uid}-other`).set({ userId: 'another-user', appliedAt: Timestamp.now() });
    const signIn = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'LocalPreview123!', returnSecureToken: true }),
    }).then(r => r.json());
    assert.ok(signIn.idToken);
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
    const response = await fetch(base + '?userId=another-user', { headers: { Authorization: `Bearer ${signIn.idToken}` } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const { applications } = await response.json();
    assert.equal(applications.length, 1);
    assert.equal(applications[0].userId, uid);
    assert.equal(applications[0].appliedAt.seconds, 100);
    assert.equal(applications[0].statusHistory[0].timestamp.seconds, 100);
    assert.equal(applications[0].profileSnapshot, undefined);
  } finally {
    await Promise.all([db.doc(`applications/${uid}`).delete(), db.doc(`applications/${uid}-other`).delete()]);
    await auth.deleteUser(uid).catch(() => {});
    await db.terminate();
    await deleteApp(app);
  }
});

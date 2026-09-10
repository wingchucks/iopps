// Local-only real HTTP publishing QA. No live credentials, accounts or emails.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { startIsolatedQaServer } from './local-qa-server.mjs';
const server = await startIsolatedQaServer();
const { base } = server;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const projectId = 'demo-iopps-preview';
const app = initializeApp({ projectId }, 'publishing-http');
const auth = getAuth(app); const db = getFirestore(app);
const uid = `qa-publisher-${crypto.randomUUID()}`; const jobId = `${uid}-job`;
const checks = [];
try {
  await auth.createUser({ uid, email: `${uid}@example.invalid`, emailVerified: true });
  const tokenResponse = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key', {
    method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: await auth.createCustomToken(uid), returnSecureToken: true }),
  });
  const tokenData = await tokenResponse.json(); assert.equal(tokenResponse.status, 200); assert.ok(tokenData.idToken);
  await db.doc(`users/${uid}`).set({ role: 'employer', orgId: uid, employerId: uid, onboardingComplete: true });
  await db.doc(`members/${uid}`).set({ role: 'employer', orgId: uid, orgRole: 'owner', onboardingComplete: true });
  await db.doc(`employers/${uid}`).set({ name: 'Fictional QA', status: 'approved', onboardingComplete: true, plan: 'free', featuredPostCredits: 0 });
  await db.doc(`organizations/${uid}`).set({ name: 'Fictional QA', status: 'approved', onboardingComplete: true });
  async function request(method, path, body, authorized = true) {
    const response = await fetch(base + path, { method, redirect: 'error', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${tokenData.idToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json() };
  }
  const createBody = { title: 'Fictional QA draft', slug: jobId, status: 'draft', featured: true };
  assert.equal((await request('POST', '/api/employer/jobs', createBody, false)).status, 401); checks.push('real HTTP unauthenticated create denied');
  const created = await request('POST', '/api/employer/jobs', createBody); assert.equal(created.status, 200, JSON.stringify(created)); checks.push('verified employer draft creation');
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, { title: 'Edited draft' })).status, 200); checks.push('draft edit preserved');
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, { status: 'active', featured: true, featuredCreditConsumed: true })).status, 400); checks.push('unpaid featured activation and forged proof rejected');
  await db.doc(`employers/${uid}`).update({ featuredPostCredits: 1 });
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, { status: 'active', featured: true })).status, 200);
  assert.equal((await db.doc(`employers/${uid}`).get()).data().featuredPostCredits, 0); checks.push('server-issued credit consumed on activation');
  const readback = await request('GET', `/api/employer/jobs/${jobId}`); assert.equal(readback.status, 200); assert.equal(readback.data.job.title, 'Edited draft'); assert.equal(readback.data.job.featured, true); checks.push('authenticated published job readback');
  assert.equal((await request('POST', '/api/employer/jobs', createBody)).status, 409);
  assert.equal((await db.doc(`jobs/${jobId}`).get()).data().status, 'active'); checks.push('duplicate create cannot overwrite published job');
  await db.doc(`posts/${jobId}`).set({ type: 'job', employerId: uid, status: 'active', active: true });
  assert.equal((await request('DELETE', `/api/employer/jobs/${jobId}`)).status, 200);
  assert.equal((await db.doc(`jobs/${jobId}`).get()).data().status, 'deleted');
  assert.equal((await db.doc(`posts/${jobId}`).get()).data().active, false);
  assert.equal((await request('GET', `/api/employer/jobs/${jobId}`)).status, 404);
  const listed = await request('GET', '/api/employer/jobs');
  assert.equal(listed.status, 200);
  assert.equal(listed.data.jobs.some(job => job.id === jobId), false);
  checks.push('deleted canonical and legacy job stay closed and disappear from employer list');
  const result = { base, projectId, checks, count: checks.length };
  await fs.writeFile(process.env.QA_OUTPUT || 'test-results/publishing-http.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} finally {
  for (const path of [`posts/${jobId}`, `jobs/${jobId}`, `users/${uid}`, `members/${uid}`, `employers/${uid}`, `organizations/${uid}`]) await db.doc(path).delete();
  await auth.deleteUser(uid).catch(() => {}); await db.terminate(); await deleteApp(app); await server.stop();
}

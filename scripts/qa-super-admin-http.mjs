// Real API boundaries, with disposable data in a guarded local demo project only.
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { startIsolatedQaServer } from './local-qa-server.mjs';

assert.equal(process.env.IOPPS_TEST_EMULATORS, 'true');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
Object.assign(process.env, {
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
});
const app = initializeApp({ projectId: 'demo-iopps-preview' }, 'super-admin-qa');
const auth = getAuth(app), db = getFirestore(app);
const prefix = 'qa-super-admin-' + crypto.randomUUID();
const ownerEmail = 'nathan.arias@iopps.ca';
const documents = new Set(), uids = [];
let server;

async function save(path, data) {
  documents.add(path);
  await db.doc(path).set(data);
}
async function signIn(uid) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await auth.createCustomToken(uid), returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).idToken;
}
async function identity(suffix, email, claims, profileEmail = email) {
  const uid = prefix + suffix;
  await auth.createUser({ uid, email, emailVerified: true });
  uids.push(uid);
  await auth.setCustomUserClaims(uid, claims);
  await save('users/' + uid, { email: profileEmail, role: claims.role || 'community', status: 'active' });
  return { uid, token: await signIn(uid) };
}
async function request(method, path, token, body, headers = {}) {
  const response = await fetch(server.base + path, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
async function expectStatus(status, ...args) {
  const result = await request(...args);
  assert.equal(result.status, status, `${args[0]} ${args[1]}: ${JSON.stringify(result)}`);
  return result.data;
}

try {
  server = await startIsolatedQaServer();
  const owner = await identity('-owner', ownerEmail, { admin: true, role: 'admin' }, 'changed-profile@example.invalid');
  const staff = await identity('-staff', prefix + '-staff@example.invalid', { admin: true, role: 'admin' }, ownerEmail);
  const member = await identity('-member', prefix + '-member@example.invalid', {});
  const orgId = prefix + '-org';
  const orgPath = '/api/admin/employers/' + orgId;
  const ownerPath = '/api/admin/users/' + owner.uid;
  const memberPath = '/api/admin/users/' + member.uid;
  await save('employers/' + orgId, { name: 'Fictional owner-protection fixture', ownerId: owner.uid, status: 'active' });
  await save('organizations/' + orgId, { name: 'Fictional owner-protection fixture', ownerId: owner.uid, status: 'active' });
  await db.doc('users/' + owner.uid).update({ orgId, employerId: orgId });
  await save('members/' + owner.uid, { role: 'admin', orgId, orgRole: 'owner', email: 'changed-profile@example.invalid' });

  for (const [actor, expected] of [[owner, true], [staff, false]]) {
    const userView = await expectStatus(200, 'GET', memberPath, actor.token);
    assert.equal(userView.capabilities.canDelete, expected);
    const orgView = await expectStatus(200, 'GET', orgPath, actor.token);
    assert.equal(orgView.capabilities.canAssignSubscription, expected);
    assert.equal(orgView.capabilities.canDelete, expected);
  }
  assert.equal((await expectStatus(200, 'GET', ownerPath, staff.token)).isSuperAdmin, true);
  assert.equal((await expectStatus(200, 'GET', '/api/admin/users/' + staff.uid, owner.token)).isSuperAdmin, false);
  console.log('PASS dashboard capabilities follow verified Auth identity, not editable profile email');

  const privileged = [
    ['DELETE', memberPath],
    ['DELETE', orgPath, { confirmOrgId: orgId }],
    ['PATCH', orgPath, { action: 'softdelete', confirmOrgId: orgId, linkedUserPolicy: 'delete' }],
    ['POST', orgPath + '/subscription', {}],
    ['POST', '/api/admin/fix-user', { uid: member.uid }],
  ];
  for (const [method, path, body] of privileged) {
    await expectStatus(401, method, path, undefined, body);
    await expectStatus(403, method, path, staff.token, body);
    await expectStatus(403, method, path, member.token, body);
  }
  await expectStatus(401, 'POST', '/api/admin/fix-user', undefined, { uid: member.uid }, { 'x-cron-secret': 'fictional-old-secret' });
  assert.equal((await auth.getUser(member.uid)).customClaims.admin, undefined);
  assert.equal((await db.doc('employers/' + orgId).get()).data().status, 'active');
  console.log('PASS all privileged API entry points reject non-owner and maintenance-secret access without writes');

  for (const token of [owner.token, staff.token]) {
    await expectStatus(403, 'POST', '/api/admin/users', token, { userId: owner.uid, role: 'employer' });
    await expectStatus(403, 'PATCH', ownerPath, token, { action: 'suspend', role: 'member' });
  }
  await expectStatus(403, 'DELETE', ownerPath, owner.token);
  await expectStatus(403, 'POST', '/api/admin/fix-user', owner.token, { uid: owner.uid });
  await expectStatus(400, 'PATCH', memberPath, owner.token, { role: 'super_admin' });
  await expectStatus(400, 'POST', '/api/admin/users', owner.token, { userId: member.uid, role: 'super_admin' });
  await expectStatus(200, 'PATCH', memberPath, staff.token, { role: 'moderator' });
  assert.equal((await db.doc('users/' + owner.uid).get()).data().role, 'admin');
  console.log('PASS owner account resists role changes, suspension, deletion and password repair; ordinary moderation still works');

  await auth.updateUser(owner.uid, { emailVerified: false });
  await expectStatus(403, 'DELETE', memberPath, owner.token);
  const unverifiedToken = await signIn(owner.uid);
  assert.equal((await expectStatus(200, 'GET', orgPath, unverifiedToken)).capabilities.canDelete, false);
  await auth.updateUser(owner.uid, { emailVerified: true });
  await expectStatus(403, 'DELETE', memberPath, unverifiedToken);
  await auth.setCustomUserClaims(owner.uid, {});
  await expectStatus(403, 'DELETE', memberPath, owner.token);
  await auth.setCustomUserClaims(owner.uid, { admin: true, role: 'admin' });
  await auth.updateUser(owner.uid, { email: prefix + '-changed@example.invalid' });
  // Firebase can revoke the token during an email change before the owner
  // identity check runs. Either authorization denial must leave data untouched.
  const changedEmail = await request('DELETE', memberPath, owner.token);
  assert.ok([401, 403].includes(changedEmail.status), JSON.stringify(changedEmail));
  assert.equal((await db.doc('users/' + member.uid).get()).data().status, 'active');
  await auth.updateUser(owner.uid, { email: ownerEmail, emailVerified: true });
  owner.token = await signIn(owner.uid);
  console.log('PASS current verification, changed emails and removed claims override stale signed-in sessions');

  await expectStatus(404, 'POST', '/api/admin/employers/' + prefix + '-missing/subscription', owner.token, {});
  await expectStatus(200, 'POST', '/api/admin/fix-user', owner.token, { uid: member.uid, role: 'admin' });
  const repairedToken = await signIn(member.uid);
  await expectStatus(403, 'DELETE', ownerPath, repairedToken);
  await expectStatus(200, 'PATCH', orgPath, owner.token, { action: 'softdelete', confirmOrgId: orgId, linkedUserPolicy: 'delete' });
  assert.equal((await auth.getUser(owner.uid)).disabled, false);
  assert.equal((await db.doc('users/' + owner.uid).get()).data().status, 'active');
  assert.equal((await db.doc('members/' + owner.uid).get()).data().role, 'admin');
  const deleted = await expectStatus(200, 'DELETE', orgPath, owner.token, { confirmOrgId: orgId, deleteAuthUser: true, force: true });
  assert.deepEqual(deleted.deletedAuthUsers, []);
  assert.equal((await auth.getUser(owner.uid)).email, ownerEmail);
  assert.equal((await db.doc('users/' + owner.uid).get()).data().role, 'admin');
  console.log('PASS owner can perform privileged work; linked organization deletion preserves the owner Auth account');
} finally {
  if (server) await server.stop();
  for (const path of documents) await db.recursiveDelete(db.doc(path));
  for (const uid of uids) await auth.deleteUser(uid).catch(error => { if (error.code !== 'auth/user-not-found') throw error; });
  await db.terminate();
  await deleteApp(app);
}

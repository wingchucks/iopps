import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Fictional accounts only; Firestore and Auth are in-memory stand-ins.
const DELETE = Symbol('delete');
const plain = value => JSON.parse(JSON.stringify(value)); // claims are built inside the route's realm
class EmployerApiError extends Error { constructor(status, message) { super(message); this.status = status; } }

function harness(target) {
  const docs = new Map([
    ['users/owner', { role: 'employer', orgId: 'org', employerId: 'org', orgRole: 'owner', status: 'active' }],
    ['members/owner', { role: 'employer', orgId: 'org', orgRole: 'owner' }],
    [`users/${target.uid}`, { status: 'active', ...target.user }],
    [`members/${target.uid}`, target.member],
  ]);
  const claims = new Map([[target.uid, { ...target.claims }]]);
  const revoked = [];
  const snapshot = path => ({ exists: docs.has(path), data: () => docs.get(path) });
  const db = {
    doc: path => ({ path }),
    collection: name => ({ doc: id => ({ get: async () => snapshot(`${name}/${id}`) }) }),
    runTransaction: async fn => {
      const writes = [];
      await fn({
        getAll: async (...refs) => refs.map(ref => snapshot(ref.path)),
        update: (ref, data) => writes.push([ref.path, data]),
      });
      for (const [path, data] of writes) {
        const next = { ...docs.get(path) };
        for (const [key, value] of Object.entries(data)) {
          if (value === DELETE) delete next[key];
          else next[key] = value;
        }
        docs.set(path, next);
      }
    },
  };
  const auth = {
    getUser: async uid => ({ uid, email: `${uid}@example.invalid`, emailVerified: true, disabled: false, customClaims: claims.get(uid) }),
    setCustomUserClaims: async (uid, value) => { claims.set(uid, plain(value)); },
    revokeRefreshTokens: async uid => { revoked.push(uid); },
  };
  const route = sourceModule('src/app/api/employer/team/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    'firebase-admin/firestore': { FieldValue: { delete: () => DELETE } },
    '@/lib/firebase-admin': { getAdminAuth: () => auth, getAdminDb: () => db },
    '@/lib/server/employer-auth': { EmployerApiError, requireEmployerContext: async () => ({ uid: 'owner', orgId: 'org', employerId: 'org', orgRole: 'owner' }) },
  } });
  const patch = body => route.PATCH(new Request('https://www.iopps.ca/api/employer/team', { method: 'PATCH', body: JSON.stringify(body) }));
  return { docs, claims, revoked, auth, db, patch };
}

async function adminAccess(h, uid) {
  const api = sourceModule('src/lib/api-auth.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': { adminAuth: null, getAdminAuth: () => h.auth, getAdminDb: () => h.db },
  } });
  const claims = h.claims.get(uid);
  const request = new Request('https://www.iopps.ca/api/admin/users', { headers: { authorization: 'Bearer fictional' } });
  return api.verifyAdminToken(request, {
    adminAuth: { verifyIdToken: async () => ({ uid, email: `${uid}@example.invalid`, email_verified: true, auth_time: 2_000_000_000, ...claims }) },
    accessDeps: { auth: h.auth, db: h.db },
  });
}

test('removing a staff administrator from an organization keeps their platform admin access', async () => {
  const h = harness({
    uid: 'staff-admin',
    user: { role: 'admin', orgId: 'org', employerId: 'org', orgRole: 'admin', orgName: 'Fictional Org', claimsValidAfter: 1_000_000_000 },
    member: { role: 'admin', orgId: 'org', orgRole: 'admin' },
    claims: { admin: true, role: 'admin', orgId: 'org', employerId: 'org' },
  });
  assert.equal((await h.patch({ uid: 'staff-admin', role: 'remove' })).status, 200);
  assert.deepEqual(h.docs.get('users/staff-admin'), { status: 'active', role: 'admin', claimsValidAfter: 1_000_000_000 });
  assert.deepEqual(h.docs.get('members/staff-admin'), { role: 'admin' });
  assert.deepEqual(h.claims.get('staff-admin'), { admin: true, role: 'admin' });
  assert.deepEqual(h.revoked, ['staff-admin'], 'organization access ends with the old session');
  assert.equal((await adminAccess(h, 'staff-admin')).success, true, 'verifyAdminToken still admits the next sign-in');
});

test('removing a moderator keeps the moderator role', async () => {
  const h = harness({ uid: 'staff-moderator', user: { role: 'moderator', orgId: 'org', employerId: 'org', orgRole: 'member' }, member: { orgId: 'org', orgRole: 'member', role: 'moderator' }, claims: { role: 'moderator', orgId: 'org' } });
  assert.equal((await h.patch({ uid: 'staff-moderator', role: 'remove' })).status, 200);
  assert.equal(h.docs.get('users/staff-moderator').role, 'moderator');
  assert.equal(h.docs.get('members/staff-moderator').role, 'moderator');
  assert.deepEqual(h.claims.get('staff-moderator'), { role: 'moderator' });
});

test('removal resets only organization roles and leaves personal roles untouched', async () => {
  const employer = harness({ uid: 'teammate', user: { role: 'employer', orgId: 'org', employerId: 'org', orgRole: 'member' }, member: { role: 'employer', orgId: 'org', orgRole: 'member', displayName: 'Fictional teammate' }, claims: { role: 'employer', employerId: 'org', orgId: 'org' } });
  assert.equal((await employer.patch({ uid: 'teammate', role: 'remove' })).status, 200);
  assert.deepEqual(employer.docs.get('users/teammate'), { status: 'active', role: 'community' });
  assert.deepEqual(employer.docs.get('members/teammate'), { role: 'community', displayName: 'Fictional teammate' });
  assert.deepEqual(employer.claims.get('teammate'), {});
  assert.equal((await adminAccess(employer, 'teammate')).success, false);

  const invited = harness({ uid: 'invited', user: { role: 'community', orgId: 'org', employerId: 'org', orgRole: 'admin' }, member: { orgId: 'org', orgRole: 'admin' }, claims: {} });
  assert.equal((await invited.patch({ uid: 'invited', role: 'remove' })).status, 200);
  assert.deepEqual(invited.docs.get('users/invited'), { status: 'active', role: 'community' });
  assert.deepEqual(invited.docs.get('members/invited'), {}, 'no role is invented for a member profile without one');
});

test('changing an organization role never touches the platform role', async () => {
  const h = harness({ uid: 'staff-admin', user: { role: 'admin', orgId: 'org', employerId: 'org', orgRole: 'member' }, member: { role: 'admin', orgId: 'org', orgRole: 'member' }, claims: { admin: true, role: 'admin' } });
  assert.equal((await h.patch({ uid: 'staff-admin', role: 'admin' })).status, 200);
  assert.equal(h.docs.get('users/staff-admin').role, 'admin');
  assert.equal(h.docs.get('users/staff-admin').orgRole, 'admin');
  assert.deepEqual(h.claims.get('staff-admin'), { admin: true, role: 'admin' });
  assert.deepEqual(h.revoked, []);
});

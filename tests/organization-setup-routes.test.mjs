import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Real signup/upgrade routes, account checks, claims helpers and resolver against
// in-memory Firestore/Auth stand-ins. Every identity and organization is fictional.
const SERVER_TIME = 'server-time';
const DELETE = Symbol('delete');
const OWNER_EMAIL = 'nathan.arias@iopps.ca'; // the super-admin policy address
const plain = value => JSON.parse(JSON.stringify(value));

function memoryFirestore(seed = {}) {
  const docs = new Map(Object.entries(seed));
  let autoId = 0;
  const ref = (collection, id = `auto-${++autoId}`) => ({ id, path: `${collection}/${id}`, get: async () => snapshot(`${collection}/${id}`) });
  const snapshot = path => ({ id: path.split('/')[1], exists: docs.has(path), data: () => docs.get(path) });
  const query = (collection, filters = [], max = Infinity) => ({
    where: (field, operator, value) => { assert.equal(operator, '=='); return query(collection, [...filters, [field, value]], max); },
    limit: count => query(collection, filters, count),
    get: async () => {
      // Firestore orders equality matches by document ID.
      const matches = [...docs.keys()].filter(path => path.startsWith(collection + '/') && filters.every(([field, value]) => docs.get(path)[field] === value)).sort().slice(0, max).map(snapshot);
      return { empty: matches.length === 0, size: matches.length, docs: matches };
    },
  });
  const apply = (path, data, merge) => {
    const next = merge ? { ...docs.get(path) } : {};
    for (const [key, value] of Object.entries(data)) {
      if (value === DELETE) delete next[key];
      else next[key] = value;
    }
    docs.set(path, next);
  };
  return {
    docs,
    collection: name => ({ doc: id => ref(name, id), where: (...args) => query(name).where(...args), add: async data => { const created = ref(name); apply(created.path, data, false); return created; } }),
    getAll: async (...refs) => refs.map(target => snapshot(target.path)),
    runTransaction: async callback => {
      const writes = [];
      const result = await callback({
        get: async target => target.path ? snapshot(target.path) : target.get(),
        getAll: async (...refs) => refs.map(target => snapshot(target.path)),
        create: (target, data) => writes.push({ path: target.path, data, create: true }),
        set: (target, data, options) => writes.push({ path: target.path, data, merge: options?.merge === true }),
        update: (target, data) => writes.push({ path: target.path, data, merge: true }),
      });
      if (writes.some(write => write.create && docs.has(write.path))) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
      for (const write of writes) apply(write.path, write.data, write.merge);
      return result;
    },
  };
}

function memoryAuth(accounts) {
  const calls = { revocationChecks: [], claimWrites: [] };
  const account = uid => Object.values(accounts).find(entry => entry.uid === uid);
  return {
    accounts, calls,
    async verifyIdToken(token, checkRevoked) {
      calls.revocationChecks.push(checkRevoked === true);
      const entry = accounts[token];
      if (!entry) throw Object.assign(new Error('invalid'), { code: 'auth/argument-error' });
      if (checkRevoked && entry.revoked) throw Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' });
      return { uid: entry.uid, email: entry.email, email_verified: true, auth_time: 2_000_000_000, ...entry.claims };
    },
    async getUser(uid) {
      const entry = account(uid);
      if (!entry) throw Object.assign(new Error('missing'), { code: 'auth/user-not-found' });
      return { uid, email: entry.email, emailVerified: true, disabled: entry.disabled === true, customClaims: entry.claims };
    },
    async setCustomUserClaims(uid, claims) { calls.claimWrites.push(uid); account(uid).claims = plain(claims); },
    async generateEmailVerificationLink() { return 'https://example.invalid/verify'; },
  };
}

function load(db, auth) {
  const mocks = {
    'next/server': { NextResponse: { json: Response.json } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => SERVER_TIME, delete: () => DELETE } },
    '@/lib/firebase-admin': { adminAuth: auth, adminDb: db, getAdminAuth: () => auth, getAdminDb: () => db },
    '@/lib/email': { sendEmployerWelcome: async () => ({ success: true }), sendAdminNewSignup: async () => ({ success: true }) },
    '@/lib/server/app-check': { verifyAppCheckFromRequest: async () => true },
  };
  return {
    signup: sourceModule('src/app/api/employer/signup/route.ts', { mocks }),
    upgrade: sourceModule('src/app/api/employer/upgrade/route.ts', { mocks }),
    api: sourceModule('src/lib/api-auth.ts', { mocks }),
    employer: sourceModule('src/lib/server/employer-auth.ts', { mocks }),
  };
}

const identity = (uid, claims = {}, extra = {}) => ({ uid, email: uid === 'owner' ? OWNER_EMAIL : `${uid}@example.invalid`, claims, ...extra });
const authorized = (uid, path = '/api/admin/users') => new Request('https://www.iopps.ca' + path, { headers: { authorization: `Bearer ${uid}` } });
const body = (kind, uid, name) => kind === 'signup'
  ? { name, type: 'employer', contactName: 'Fictional Contact', contactEmail: `${uid}@example.invalid`, formStartedAt: Date.now() - 10000 }
  : { name, type: 'employer', formStartedAt: Date.now() - 10000 };
async function create(routes, kind, uid, name) {
  return routes[kind].POST(new Request(`https://www.iopps.ca/api/employer/${kind}`, {
    method: 'POST', headers: { authorization: `Bearer ${uid}`, 'content-type': 'application/json' }, body: JSON.stringify(body(kind, uid, name)),
  }));
}

for (const kind of ['upgrade', 'signup']) {
  test(`organization ${kind} keeps the owner's super-admin and admin access`, async () => {
    const db = memoryFirestore({
      'users/owner': { role: 'admin', status: 'active', claimsValidAfter: 1_000_000_000, displayName: 'Fictional Owner' },
      'members/owner': { role: 'admin', displayName: 'Fictional Owner' },
    });
    const auth = memoryAuth({ owner: identity('owner', { admin: true, role: 'admin' }) });
    const routes = load(db, auth);
    const response = await create(routes, kind, 'owner', 'Fictional Owner Workspace');
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(db.docs.get('users/owner').role, 'admin');
    assert.equal(db.docs.get('members/owner').role, 'admin');
    assert.equal(db.docs.get('users/owner').orgId, 'owner');
    assert.equal(db.docs.get('members/owner').orgRole, 'owner');
    assert.deepEqual(auth.accounts.owner.claims, { admin: true, role: 'admin', employerId: 'owner' });
    const owner = await routes.api.verifySuperAdminToken(authorized('owner'));
    assert.equal(owner.success, true, 'admin APIs still accept the owner');
    assert.equal(owner.isSuperAdmin, true);
    const workspace = await routes.employer.requireEmployerContext(authorized('owner', '/api/employer/check'));
    assert.deepEqual([workspace.orgId, workspace.orgRole], ['owner', 'owner'], 'and the organization workspace works');
  });
}

test('organization signup never replaces a moderator role or claim', async () => {
  const db = memoryFirestore({ 'users/moderator': { role: 'moderator', status: 'active' }, 'members/moderator': { role: 'moderator', displayName: 'Fictional Moderator' } });
  const auth = memoryAuth({ moderator: identity('moderator', { role: 'moderator' }) });
  const response = await create(load(db, auth), 'signup', 'moderator', 'Fictional Moderated Workspace');
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(db.docs.get('users/moderator').role, 'moderator');
  assert.equal(db.docs.get('members/moderator').role, 'moderator');
  assert.deepEqual(auth.accounts.moderator.claims, { role: 'moderator', employerId: 'moderator' });
});

test('members become employers while unrelated claims survive and stale organization claims are replaced', async () => {
  for (const kind of ['upgrade', 'signup']) {
    const db = memoryFirestore({ 'users/member': { role: 'community', status: 'active' }, 'members/member': { displayName: 'Fictional Member' } });
    const auth = memoryAuth({ member: identity('member', { role: 'community', fictionalPreview: true, orgId: 'stale-org', orgRole: 'member' }) });
    const response = await create(load(db, auth), kind, 'member', 'Fictional Member Workspace');
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(db.docs.get('users/member').role, 'employer');
    assert.deepEqual(auth.accounts.member.claims, { role: 'employer', fictionalPreview: true, employerId: 'member' });
  }
});

test('suspended, admin-disabled, closed and revoked accounts cannot create or repair an organization', async () => {
  const cases = [
    ['suspended', { status: 'suspended' }, {}, 403],
    ['closed', { status: 'deleted', deletedAt: 'fixture' }, {}, 403],
    ['admin-disabled', { status: 'active' }, { disabled: true }, 403],
    ['revoked session', { status: 'active' }, { revoked: true }, 401],
  ];
  for (const [label, profile, account, status] of cases) {
    for (const kind of ['signup', 'upgrade']) {
      // A closed account's partial legacy mirror must not be repaired or recreated either.
      const db = memoryFirestore({ 'users/member': { role: 'community', ...profile }, 'employers/member': { name: 'Fictional Legacy Org', slug: 'fictional-legacy-org' } });
      const auth = memoryAuth({ member: identity('member', {}, account) });
      const before = JSON.stringify([...db.docs]);
      const response = await create(load(db, auth), kind, 'member', 'Fictional Blocked Workspace');
      assert.equal(response.status, status, `${kind}: ${label}`);
      assert.equal(JSON.stringify([...db.docs]), before, `${kind}: ${label} wrote nothing`);
      assert.deepEqual(auth.calls.claimWrites, []);
      assert.ok(auth.calls.revocationChecks.length > 0 && auth.calls.revocationChecks.every(Boolean), 'sessions are checked for revocation');
    }
  }
});

test('organizations with the same name get distinct slugs that never collide with legacy records or redirects', async () => {
  const uids = ['first', 'second', 'third', 'fourth', 'fifth'];
  const db = memoryFirestore({
    ...Object.fromEntries(uids.map(uid => [`users/${uid}`, { status: 'active' }])),
    'employers/legacy-aurora': { name: 'Aurora', slug: 'aurora' },
    'org-slug-redirects/merged-name': { to: 'fictional-target' },
  });
  const routes = load(db, memoryAuth(Object.fromEntries(uids.map(uid => [uid, identity(uid)]))));
  const slugs = [];
  for (const [kind, uid, name] of [['signup', 'first', 'Northern Lights'], ['signup', 'second', 'Northern Lights'], ['upgrade', 'third', 'Northern  Lights!'], ['upgrade', 'fourth', 'Aurora'], ['signup', 'fifth', 'Merged Name']]) {
    const response = await create(routes, kind, uid, name);
    assert.equal(response.status, 200, await response.clone().text());
    slugs.push((await response.json()).slug);
  }
  assert.deepEqual(slugs, ['northern-lights', 'northern-lights-2', 'northern-lights-3', 'aurora-2', 'merged-name-2']);
  for (const [uid, slug] of [['second', 'northern-lights-2'], ['third', 'northern-lights-3']]) {
    assert.equal(db.docs.get(`organizations/${uid}`).slug, slug);
    assert.equal(db.docs.get(`employers/${uid}`).slug, slug);
  }
});

test('slug lookups prefer the public, oldest organization regardless of document order', async () => {
  const listed = { type: 'business', status: 'approved', onboardingComplete: true, description: 'Fictional organization', logoUrl: 'https://example.invalid/logo.png', website: 'https://example.invalid' };
  const db = memoryFirestore({
    'organizations/a-newcomer': { ...listed, name: 'Shared (newcomer)', slug: 'shared-name', status: 'pending', onboardingComplete: false, directoryReview: { status: 'draft', revision: 1 }, createdAt: '2026-09-01T00:00:00.000Z' },
    'organizations/m-original': { ...listed, name: 'Shared (original)', slug: 'shared-name', createdAt: '2024-01-01T00:00:00.000Z' },
    'organizations/z-later': { ...listed, name: 'Shared (later)', slug: 'shared-name', createdAt: '2025-01-01T00:00:00.000Z' },
    'organizations/b-private': { ...listed, name: 'Private (newer)', slug: 'private-name', publicVisibility: 'private', createdAt: '2026-01-01T00:00:00.000Z' },
    'organizations/c-private': { ...listed, name: 'Private (older)', slug: 'private-name', publicVisibility: 'private', createdAt: '2025-01-01T00:00:00.000Z' },
    'employers/a-disabled': { ...listed, name: 'Legacy (disabled)', slug: 'legacy-shared', status: 'disabled' },
    'employers/b-listed': { ...listed, name: 'Legacy (listed)', slug: 'legacy-shared' },
  });
  const { resolvePublicOrganization } = sourceModule('src/lib/server/public-organization-resolver.ts');
  assert.equal((await resolvePublicOrganization(db, 'shared-name')).id, 'm-original');
  assert.equal((await resolvePublicOrganization(db, 'private-name')).id, 'c-private', 'without a public match the choice is still stable');
  assert.equal((await resolvePublicOrganization(db, 'legacy-shared')).id, 'b-listed');
});

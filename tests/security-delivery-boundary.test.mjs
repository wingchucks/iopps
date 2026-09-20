import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));

function load(file, mocks, env = {}) {
  const cache = new Map();
  function read(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {}; cache.set(filename, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, process: { env }, console: { error() {} }, URL, Date, Error,
      require(id) {
        if (Object.hasOwn(mocks, id)) return mocks[id];
        if (id === 'next/server') return { NextResponse: Response };
        if (id.startsWith('@/')) return read(path.join(root, 'src', id.slice(2)) + '.ts');
        if (id.startsWith('.')) return read(path.resolve(path.dirname(filename), id));
        return require(id);
      },
    }, { filename });
    return exports;
  }
  return read(path.join(root, file));
}

function memoryDb() {
  const records = new Map(); let writes = 0;
  const snapshot = ref => ({ id: ref.id, exists: records.has(ref.path), data: () => records.get(ref.path) });
  const db = {
    collection: name => ({ doc: id => { const ref = { id, path: `${name}/${id}` }; return { ...ref, get: async () => snapshot(ref) }; } }),
    runTransaction: async callback => callback({
      get: async ref => snapshot(ref), getAll: async (...refs) => refs.map(snapshot),
      set: (ref, data) => { writes++; records.set(ref.path, data); },
      create: (ref, data) => { writes++; records.set(ref.path, data); },
      update: (ref, data) => { writes++; records.set(ref.path, { ...records.get(ref.path), ...data }); },
    }),
  };
  return { db, records, get writes() { return writes; } };
}
function request(body = {}, headers = {}) {
  const req = new Request('https://www.iopps.ca/api/test', { method: 'POST', headers: { host: 'www.iopps.ca', origin: 'https://www.iopps.ca', authorization: 'Bearer fictional', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1', ...headers }, body: JSON.stringify(body) });
  req.nextUrl = new URL(req.url); return req;
}
function verification(options = {}) {
  const store = memoryDb(); const calls = { generate: 0, send: 0, attest: 0 };
  const token = { uid: 'candidate', email: 'candidate@example.test', email_verified: false, ...options.token };
  const route = load('src/app/api/auth/verification-email/route.ts', {
    '@/lib/firebase-admin': { getAdminApp: () => ({}), getAdminDb: () => store.db, getAdminAuth: () => ({
      verifyIdToken: async () => { if (options.invalidAuth) throw Error('invalid'); return token; },
      generateEmailVerificationLink: async () => { calls.generate++; return 'https://firebase.invalid/__/auth/action?mode=verifyEmail&oobCode=fictional-code'; },
    }) },
    'firebase-admin/app-check': { getAppCheck: () => ({ verifyToken: async value => { calls.attest++; if (value !== 'valid') throw Error('invalid'); } }) },
    '@/lib/email': { sendAccountVerificationEmail: async () => { calls.send++; return { success: !options.deliveryFailure }; } },
  }, { NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'true', NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: 'fictional-site-key', NEXT_PUBLIC_SITE_URL: 'https://www.iopps.ca' });
  return { ...route, calls, store, token };
}

function applications(token = {}) {
  const store = memoryDb(); let archives = 0;
  store.records.set('jobs/optional', { status: 'active', title: 'Optional', employerId: 'employer' });
  store.records.set('jobs/required', { status: 'active', title: 'Required', requiresResume: true });
  const decodedToken = { uid: 'candidate', email_verified: false, firebase: { sign_in_provider: 'password' }, ...token };
  const route = load('src/app/api/applications/route.ts', {
    '@/lib/api-auth': { verifyAuthToken: async () => ({ success: true, decodedToken }) },
    '@/lib/firebase-admin': { getAdminDb: () => store.db },
    '@/lib/server/application-document-archive': { archiveApplicationResume: async () => { archives++; return 'archive'; } },
    'firebase-admin/storage': { getStorage: () => ({ bucket: () => ({}) }) },
  }, { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-iopps-preview.appspot.com' });
  return { ...route, store, decodedToken, get archives() { return archives; } };
}

test('application POST denies new unverified password submissions before database or archive writes', async () => {
  const h = applications();
  const res = await h.POST(request({ postId: 'optional', resumeUrl: 'fictional-upload', resumeType: 'file' }));
  assert.equal(res.status, 403); assert.match((await res.json()).error, /verify.*email/i);
  assert.equal(h.store.writes, 0); assert.equal(h.archives, 0);
});

test('verification delivery rejects spoofed localhost before quota, links or sends', async () => {
  for (const headers of [{}, { 'x-forwarded-host': 'localhost' }, { host: 'localhost:3000', origin: 'http://localhost:3000' }, { 'x-forwarded-host': '127.0.0.1:3000' }]) {
    for (const token of [undefined, 'invalid', 'valid']) {
      const h = verification();
      const res = await h.POST(request({}, { ...headers, ...(token ? { 'X-Firebase-AppCheck': token } : {}) }));
      assert.equal(res.status, token === 'valid' ? 200 : 403, JSON.stringify({ headers, token }));
      assert.equal(h.calls.generate, token === 'valid' ? 1 : 0);
      assert.equal(h.calls.send, token === 'valid' ? 1 : 0);
      assert.equal(h.store.writes, token === 'valid' ? 2 : 0);
      assert.equal(h.calls.attest, token ? 1 : 0);
    }
  }
});

test('verification handler reserves UID quota before delivery and does not consume password-reset quota', async () => {
  const h = verification();
  for (let i = 0; i < 3; i++) assert.equal((await h.POST(request({}, { 'X-Firebase-AppCheck': 'valid' }))).status, 200);
  const denied = await h.POST(request({}, { 'X-Firebase-AppCheck': 'valid', 'x-forwarded-for': '192.0.2.2' }));
  assert.equal(denied.status, 429); assert.equal(h.calls.generate, 3); assert.equal(h.calls.send, 3);
  assert.ok([...h.store.records.keys()].every(key => key.startsWith('verification_email_limits/')));
});

test('verification IP quota spans UIDs and failed delivery attempts remain reserved', async () => {
  const h = verification({ deliveryFailure: true });
  for (let i = 0; i < 10; i++) {
    h.token.uid = `candidate-${i}`;
    assert.equal((await h.POST(request({}, { 'X-Firebase-AppCheck': 'valid' }))).status, 500);
  }
  h.token.uid = 'new-candidate';
  assert.equal((await h.POST(request({}, { 'X-Firebase-AppCheck': 'valid' }))).status, 429);
  assert.equal(h.calls.generate, 10); assert.equal(h.calls.send, 10);
  assert.equal(h.store.records.size, 11, 'denial must not partially reserve a new UID');
});

test('verification handles verified accounts, missing identity, origin and limiter outage without sending', async () => {
  const h = verification({ token: { email_verified: true } });
  const verified = await h.POST(request({}, { 'X-Firebase-AppCheck': 'valid' }));
  assert.deepEqual(await verified.json(), { sent: false, alreadyVerified: true });
  assert.equal(h.store.writes, 0); assert.equal(h.calls.generate, 0);
  for (const headers of [{ authorization: '' }, { origin: 'https://attacker.example' }]) {
    const r = await h.POST(request({}, { 'X-Firebase-AppCheck': 'valid', ...headers }));
    assert.ok([401, 403].includes(r.status)); assert.equal(h.calls.send, 0);
  }
  const outage = verification();
  outage.store.db.runTransaction = async () => { throw Error('database unavailable'); };
  assert.equal((await outage.POST(request({}, { 'X-Firebase-AppCheck': 'valid' }))).status, 500);
  assert.equal(outage.calls.generate, 0); assert.equal(outage.calls.send, 0);
});

test('verification quotas reset at their own window boundary and never persist raw identities', async () => {
  const { reserveVerificationEmail } = load('src/lib/server/verification-email-limit.ts', {});
  const h = memoryDb();
  for (let i = 0; i < 3; i++) assert.equal(await reserveVerificationEmail(h.db, 'private-uid', '192.0.2.1', 1000), true);
  assert.equal(await reserveVerificationEmail(h.db, 'private-uid', '192.0.2.1', 86400999), false);
  assert.equal(await reserveVerificationEmail(h.db, 'private-uid', '192.0.2.1', 86401000), true);
  assert.ok([...h.records.keys()].every(key => /^verification_email_limits\/(uid|ip)-[a-f0-9]{64}$/.test(key)));
});

test('application POST preserves verified password and other-provider success plus required-file denial', async () => {
  for (const token of [{ email_verified: true }, { firebase: { sign_in_provider: 'google.com' } }, { firebase: { sign_in_provider: 'apple.com' } }]) {
    const h = applications(token);
    const first = await h.POST(request({ postId: 'optional', resumeType: 'profile' }));
    assert.equal(first.status, 201); assert.equal(h.store.writes, 1);
    const denied = await h.POST(request({ postId: 'required', resumeType: 'profile' }));
    assert.equal(denied.status, 422); assert.match((await denied.json()).error, /resume/i);
    assert.equal(h.store.writes, 1); assert.equal(h.archives, 0);
  }
});

test('application unverified immutable retry, owned receipt and withdrawal remain available', async () => {
  const h = applications({ email_verified: true });
  const created = await (await h.POST(request({ postId: 'optional', resumeType: 'profile' }))).json();
  h.decodedToken.email_verified = false;
  h.store.records.set('jobs/optional', { status: 'closed' });
  const retry = await h.POST(request({ postId: 'optional', resumeUrl: 'replacement' }));
  assert.equal(retry.status, 200);
  const retried = await retry.json();
  assert.equal(retried.created, false); assert.deepEqual(retried.application, created.application);
  assert.equal(h.store.writes, 1); assert.equal(h.archives, 0);
  const receiptRequest = request(); receiptRequest.nextUrl.searchParams.set('postId', 'optional');
  assert.deepEqual((await (await h.GET(receiptRequest)).json()).application, created.application);
  assert.equal((await h.PATCH(request({ appId: created.application.id, action: 'withdraw' }))).status, 200);
  assert.equal(h.store.writes, 2);
});

test('real demo Auth and Firestore enforce application verification and atomic delivery races', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true', timeout: 120000 }, async () => {
  assert.match(process.env.GCLOUD_PROJECT || '', /^demo-/);
  for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) assert.match(process.env[name] || '', /^127\.0\.0\.1:\d+$/);
  const { initializeApp, deleteApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const { createHash, randomUUID } = require('node:crypto');
  const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT }, `security-${randomUUID()}`);
  const auth = getAuth(app), db = getFirestore(app);
  // Firestore expects host-realm promises from transaction callbacks, not VM promises.
  const adapter = { collection: name => db.collection(name), runTransaction: callback => db.runTransaction(async tx => await callback(tx)) };
  const uid = `security-${randomUUID()}`, postId = `${uid}-job`, requiredId = `${uid}-required`;
  const email = `${uid}@example.test`, password = 'Fictional-QA-only-829!';
  const touched = new Set([`users/${uid}`, `jobs/${postId}`, `jobs/${requiredId}`, `applications/${uid}_${postId}`, `applications/${uid}_${requiredId}`]);
  const limitPath = (kind, value) => `verification_email_limits/${kind}-${createHash('sha256').update(value).digest('hex')}`;
  const signIn = async () => {
    const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fictional`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    assert.equal(response.status, 200); return (await response.json()).idToken;
  };
  try {
    await auth.createUser({ uid, email, password, emailVerified: false });
    await db.doc(`users/${uid}`).set({ role: 'community', status: 'active' });
    await db.doc(`jobs/${postId}`).set({ status: 'active', title: 'Fictional security test' });
    await db.doc(`jobs/${requiredId}`).set({ status: 'active', title: 'Fictional required file', requiresResume: true });
    const unverified = await signIn();
    const decoded = await auth.verifyIdToken(unverified);
    assert.equal(decoded.firebase.sign_in_provider, 'password'); assert.equal(decoded.email_verified, false);
    const admin = { adminAuth: auth, getAdminAuth: () => auth, getAdminDb: () => adapter };
    let archives = 0;
    const applicationsRoute = load('src/app/api/applications/route.ts', {
      '@/lib/firebase-admin': admin,
      '@/lib/server/application-document-archive': { archiveApplicationResume: async () => { archives++; throw Error('No archive expected'); } },
    }, process.env);
    const denied = await applicationsRoute.POST(request({ postId, resumeType: 'profile' }, { authorization: `Bearer ${unverified}` }));
    assert.equal(denied.status, 403); assert.equal((await db.doc(`applications/${uid}_${postId}`).get()).exists, false);
    await auth.updateUser(uid, { emailVerified: true });
    const verified = await signIn();
    assert.equal((await auth.verifyIdToken(verified)).email_verified, true);
    const accepted = await applicationsRoute.POST(request({ postId, resumeType: 'profile' }, { authorization: `Bearer ${verified}` }));
    assert.equal(accepted.status, 201); const receipt = (await accepted.json()).application;
    assert.equal((await db.doc(`applications/${uid}_${postId}`).get()).data().userId, uid);
    assert.equal((await applicationsRoute.POST(request({ postId: requiredId, resumeType: 'profile' }, { authorization: `Bearer ${verified}` }))).status, 422);
    assert.equal((await db.doc(`applications/${uid}_${requiredId}`).get()).exists, false);
    const retried = await applicationsRoute.POST(request({ postId, resumeUrl: 'replacement' }, { authorization: `Bearer ${unverified}` }));
    assert.equal(retried.status, 200); assert.deepEqual((await retried.json()).application, receipt); assert.equal(archives, 0);
    const get = request({}, { authorization: `Bearer ${unverified}` }); get.nextUrl.searchParams.set('postId', postId);
    assert.deepEqual((await (await applicationsRoute.GET(get)).json()).application, receipt);
    // Real token verification and real atomic Firestore reservation; provider send/link calls are no-send adapters.
    let generated = 0, sent = 0;
    const verificationRoute = load('src/app/api/auth/verification-email/route.ts', {
      '@/lib/firebase-admin': { ...admin, getAdminAuth: () => ({ verifyIdToken: token => auth.verifyIdToken(token), generateEmailVerificationLink: async () => { generated++; return 'https://firebase.invalid/__/auth/action?mode=verifyEmail&oobCode=fictional-no-send-code'; } }) },
      '@/lib/email': { sendAccountVerificationEmail: async () => { sent++; return { success: true }; } },
    }, { ...process.env, NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'false' });
    const ip = `${uid}-uid-race`;
    touched.add(limitPath('uid', uid)); touched.add(limitPath('ip', ip));
    const responses = await Promise.all(Array.from({ length: 8 }, () => verificationRoute.POST(request({}, { authorization: `Bearer ${unverified}`, 'x-forwarded-for': ip }))));
    assert.equal(responses.filter(r => r.status === 200).length, 3);
    assert.equal(responses.filter(r => r.status === 429).length, 5);
    assert.equal(generated, 3); assert.equal(sent, 3);
    assert.equal((await db.doc(limitPath('uid', uid)).get()).data().count, 3);
    assert.equal((await db.doc(limitPath('ip', ip)).get()).data().count, 3);
    // Cross-account race at the same IP uses the actual reservation helper.
    const { reserveVerificationEmail } = load('src/lib/server/verification-email-limit.ts', {});
    const sharedIp = `${uid}-ip-race`; touched.add(limitPath('ip', sharedIp));
    const ids = Array.from({ length: 14 }, (_, i) => `${uid}-${i}`);
    ids.forEach(id => touched.add(limitPath('uid', id)));
    const reserved = await Promise.all(ids.map(id => reserveVerificationEmail(adapter, id, sharedIp)));
    assert.equal(reserved.filter(Boolean).length, 10);
    assert.equal((await db.doc(limitPath('ip', sharedIp)).get()).data().count, 10);
    const accounts = await db.getAll(...ids.map(id => db.doc(limitPath('uid', id))));
    assert.equal(accounts.filter(doc => doc.exists).length, 10, 'no partial UID reservations on IP denial');
    const quotaUrl = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents/${limitPath('uid', uid)}`;
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const res = await fetch(quotaUrl, { method, headers: { authorization: `Bearer ${verified}`, 'content-type': 'application/json' }, ...(method === 'PATCH' ? { body: JSON.stringify({ fields: { count: { integerValue: '0' } } }) } : {}) });
      assert.equal(res.status, 403, `clients cannot ${method} delivery quotas`);
    }
    assert.equal((await db.doc(limitPath('uid', uid)).get()).data().count, 3);
  } finally {
    await Promise.all([...touched].map(p => db.doc(p).delete()));
    assert.ok((await db.getAll(...[...touched].map(p => db.doc(p)))).every(doc => !doc.exists));
    await auth.deleteUser(uid);
    await assert.rejects(auth.getUser(uid), error => error.code === 'auth/user-not-found');
    await db.terminate(); await deleteApp(app);
  }
});

test('verification handler enforces configured App Check before generating or sending', async () => {
  for (const attestation of [undefined, 'invalid']) {
    const h = verification();
    const res = await h.POST(request({}, attestation ? { 'X-Firebase-AppCheck': attestation } : {}));
    assert.equal(res.status, 403);
    assert.equal(h.calls.generate, 0); assert.equal(h.calls.send, 0); assert.equal(h.store.writes, 0);
  }
});

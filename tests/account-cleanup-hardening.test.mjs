import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
function load(file, dependencies, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports, URL, console, Date, ...globals, require: id => {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    if (id.startsWith('node:')) return nativeRequire(id);
    throw Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  let now = Date.now();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const uid = 'qa-owner', rows = new Map(), objects = new Map(), deletes = [], authDeletes = [], listings = [], queries = [];
  const hooks = {};
  rows.set(`users/${uid}`, { status: 'deleted', deletedAt: new Date(now - 7200000).toISOString() });
  // Existing safety tests exercise an eligible final sweep, not unknown Auth history.
  rows.set(`account_cleanup/${uid}`, { notBefore: new Date(now - 1000).toISOString(), createdAt: new Date(now - 7200000).toISOString(), authRemovedAt: new Date(now - 7200000).toISOString() });
  const snapshot = path => ({ id: path.split('/').at(-1), exists: rows.has(path), data: () => structuredClone(rows.get(path)), ref: ref(path) });
  function ref(path) { return { path, get: async () => snapshot(path), delete: async () => { rows.delete(path); }, update: async data => { if (!rows.has(path)) throw Error('NOT_FOUND'); Object.assign(rows.get(path), data); } }; }
  let lock = Promise.resolve();
  const db = {
    doc: ref,
    runTransaction: action => {
      const run = lock.then(async () => {
        const writes = [];
        const result = await action({ get: async target => snapshot(target.path),
          getAll: async (...targets) => targets.map(target => snapshot(target.path)),
          set: (target, data) => writes.push(() => rows.set(target.path, structuredClone(data))),
          update: (target, data) => writes.push(() => { if (!rows.has(target.path)) throw Error('NOT_FOUND'); Object.assign(rows.get(target.path), data); }),
          delete: target => writes.push(() => rows.delete(target.path)),
        });
        if (hooks.transaction) await hooks.transaction(writes);
        writes.forEach(write => write());
        return result;
      });
      lock = run.catch(() => {}); return run;
    },
    collection: name => {
      const query = (filters = [], maximum = Infinity, after = '') => ({
        where: (field, op, value) => query([...filters, [field, op, value]], maximum, after),
        limit: count => query(filters, count, after),
        orderBy: field => { assert.equal(field, '__name__'); return query(filters, maximum, after); },
        startAfter: doc => query(filters, maximum, doc.ref.path),
        get: async () => {
          queries.push({ name, maximum });
          if (hooks.query) await hooks.query(name, filters);
          return { docs: [...rows].sort(([a], [b]) => name === 'applications' ? a.localeCompare(b) : 0).filter(([path, data]) => path > after && path.startsWith(name + '/') && filters.every(([field, op, value]) => op === '<=' ? data[field] <= value : data[field] === value)).slice(0, maximum).map(([path]) => snapshot(path)) };
        },
      }); return query();
    },
  };
  const bucket = { name: 'fictional.example', getFiles: async options => {
    listings.push(options);
    const names = [...objects.keys()].filter(name => name.startsWith(options.prefix) && (!options.pageToken || name > options.pageToken)).sort();
    const page = names.slice(0, options.maxResults ?? Infinity);
    return [page.map(name => ({ name, metadata: { generation: objects.get(name) }, delete: async options => {
      if (hooks.delete) await hooks.delete(name, options);
      if (!objects.has(name)) return;
      if (options.ifGenerationMatch !== undefined && String(options.ifGenerationMatch) !== String(objects.get(name))) throw Object.assign(Error('generation mismatch'), { code: 412 });
      deletes.push({ name, options }); objects.delete(name);
    } })), names.length > page.length ? { pageToken: page.at(-1) } : null];
  } };
  const auth = { deleteUser: async id => { authDeletes.push(id); if (hooks.auth) await hooks.auth(id); } };
  const helper = load('src/lib/server/account-upload-cleanup.ts', {}, { Date: Clock });
  const route = load('src/app/api/cron/account-cleanup/route.ts', {
    'next/server': { NextResponse: Response }, 'firebase-admin/storage': { getStorage: () => ({ bucket: () => bucket }) },
    '@/lib/firebase-admin': { getAdminDb: () => db, getAdminApp: () => ({}), getAdminAuth: () => auth },
    '@/lib/server/account-upload-cleanup': helper,
  }, { Date: Clock, process: { env: { CRON_SECRET: 'fixture-secret' } } });
  return { uid, rows, objects, deletes, authDeletes, listings, queries, hooks, db, bucket, auth, helper,
    advance: ms => { now += ms; }, now: () => now,
    run: () => route.GET(new Request('https://fixture.invalid/cron', { headers: { authorization: 'Bearer fixture-secret' } })),
  };
}

function accountRoute(f) {
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [f.now()])); } static now() { return f.now(); } }
  return load('src/app/api/account/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/api-auth': { verifyAuthToken: async () => ({ success: true, decodedToken: { uid: f.uid, auth_time: f.now() / 1000 } }) },
    '@/lib/firebase-admin': { getAdminDb: () => f.db, getAdminAuth: () => f.auth, getAdminApp: () => ({}) },
    'firebase-admin/storage': { getStorage: () => ({ bucket: () => f.bucket }) },
    '@/lib/server/account-upload-cleanup': f.helper,
    '@/lib/server/super-admin': { isSuperAdminAccount: async () => false },
  }, { Date: Clock, process: { env: {} } });
}
const closeRequest = () => new Request('https://fixture.invalid/api/account', { method: 'DELETE', body: JSON.stringify({ confirmDelete: true }) });

test('Auth failure then cron recovery retains a final grace sweep for a fresh-token late upload', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  f.rows.delete(jobPath); f.rows.set(`users/${f.uid}`, { status: 'active' });
  let authExists = true;
  f.hooks.auth = async () => { throw Error('fictional Auth outage'); };
  assert.equal((await accountRoute(f).DELETE(closeRequest())).status, 503);
  assert.equal(f.rows.get(`users/${f.uid}`).status, 'deleted');
  assert.ok(f.rows.has(jobPath)); assert.equal(authExists, true);
  f.advance(90 * 60000 + 1);
  const removedAt = f.now(), tokenExpiresAt = f.now() + 3600000;
  f.hooks.auth = async () => { authExists = false; };
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  assert.equal(authExists, false);
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), removedAt);
  assert.equal(Date.parse(f.rows.get(jobPath).notBefore), removedAt + 90 * 60000);
  f.advance(1000); assert.ok(f.now() < tokenExpiresAt);
  const late = `resumes/${f.uid}/late-after-recovery.pdf`;
  f.objects.set(late, '9007199254740993');
  f.hooks.auth = async () => { throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); };
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  assert.equal(f.objects.has(late), true);
  f.advance(90 * 60000 - 1001);
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  f.advance(1);
  assert.deepEqual(await (await f.run()).json(), { completed: 1, failed: 0 });
  assert.equal(f.objects.has(late), false); assert.equal(f.rows.has(jobPath), false);
  assert.equal(String(f.deletes[0].options.ifGenerationMatch), '9007199254740993');
});

test('successful account closure anchors grace after Auth returns and cleans immediately', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  f.rows.delete(jobPath); f.rows.set(`users/${f.uid}`, { status: 'active' });
  f.objects.set(`resumes/${f.uid}/initial.pdf`, '123');
  let calls = 0;
  f.hooks.auth = async () => { if (++calls === 1) f.advance(30000); };
  assert.equal((await accountRoute(f).DELETE(closeRequest())).status, 200);
  assert.equal(f.rows.get(`users/${f.uid}`).status, 'deleted');
  assert.equal(f.objects.size, 0);
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), f.now());
  assert.equal(Date.parse(f.rows.get(jobPath).notBefore), f.now() + 90 * 60000);
  f.advance(90 * 60000);
  assert.deepEqual(await (await f.run()).json(), { completed: 1, failed: 0 });
});

test('repeated account closure preserves an existing cleanup lease, anchor and cursor', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  const queued = { notBefore: new Date(f.now() + 360000).toISOString(), leaseUntil: new Date(f.now() + 360000).toISOString(),
    leaseOwner: 'fictional-other-worker', authRemovedAt: new Date(f.now() - 7200000).toISOString(),
    finalSweepStarted: true, cursor: { prefixIndex: 1, pageToken: 'fictional-cursor' } };
  f.rows.set(jobPath, queued);
  const tombstone = structuredClone(f.rows.get(`users/${f.uid}`));
  assert.equal((await accountRoute(f).DELETE(closeRequest())).status, 200);
  assert.deepEqual(f.rows.get(jobPath), queued);
  assert.deepEqual(f.rows.get(`users/${f.uid}`), tombstone);
});

test('account closure leaves an unconfirmed active worker job untouched for owner recovery', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  const queued = { notBefore: new Date(f.now() + 360000).toISOString(), leaseUntil: new Date(f.now() + 360000).toISOString(),
    leaseOwner: 'fictional-other-worker', cursor: { prefixIndex: 1 } };
  f.rows.set(jobPath, structuredClone(queued));
  f.hooks.auth = async () => { throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); };
  assert.equal((await accountRoute(f).DELETE(closeRequest())).status, 200);
  assert.deepEqual(f.rows.get(jobPath), queued);
  f.advance(360001);
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), f.now());
  f.advance(90 * 60000);
  assert.deepEqual(await (await f.run()).json(), { completed: 1, failed: 0 });
});

test('unknown Auth history starts grace once and final sweep resets an older partial cursor', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  f.rows.set(jobPath, { notBefore: new Date(f.now() - 1).toISOString(), cursor: { prefixIndex: 1, pageToken: `resumes/${f.uid}/a.pdf` } });
  f.hooks.auth = async () => { throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); };
  for (let i = 0; i < 205; i++) f.objects.set(`resumes/${f.uid}/z-${String(i).padStart(3, '0')}.pdf`, '123');
  const anchor = f.now();
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), anchor);
  assert.ok(f.rows.get(jobPath).cursor.pageToken);
  const late = `resumes/${f.uid}/a-late.pdf`, avatar = `avatars/${f.uid}.png`;
  f.objects.set(late, '124'); f.objects.set(avatar, '125');
  f.advance(60000);
  assert.equal((await f.run()).status, 200);
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), anchor, 'not-found cannot slide the anchor');
  assert.ok(f.objects.has(late)); assert.ok(f.objects.has(avatar));
  f.advance(89 * 60000);
  const firstFinalListing = f.listings.length;
  assert.deepEqual(await (await f.run()).json(), { completed: 1, failed: 0 });
  assert.equal(f.listings[firstFinalListing].prefix, `avatars/${f.uid}.`);
  assert.equal(f.listings[firstFinalListing].pageToken, undefined);
  assert.equal(f.objects.size, 0); assert.equal(f.rows.has(jobPath), false);
});

test('lost route confirmation write recovers conservatively from user-not-found exactly once', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  f.rows.delete(jobPath); f.rows.set(`users/${f.uid}`, { status: 'active' });
  let transactions = 0, absent = false;
  f.hooks.transaction = async () => { if (++transactions === 2) throw Error('fictional confirmation write outage'); };
  f.hooks.auth = async () => {
    if (absent) throw Object.assign(Error('absent'), { code: 'auth/user-not-found' });
    absent = true;
  };
  assert.equal((await accountRoute(f).DELETE(closeRequest())).status, 503);
  assert.equal(absent, true);
  assert.equal(f.rows.get(jobPath).authRemovedAt, undefined);
  f.advance(90 * 60000);
  const confirmedAt = f.now();
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), confirmedAt);
  f.objects.set(`resumes/${f.uid}/late.pdf`, '123');
  f.advance(90 * 60000);
  assert.deepEqual(await (await f.run()).json(), { completed: 1, failed: 0 });
  assert.equal(f.objects.size, 0); assert.equal(f.rows.has(jobPath), false);
});

test('Auth confirmation survives later reference failure without restarting grace on retry', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  delete f.rows.get(jobPath).authRemovedAt;
  f.hooks.query = async name => { if (name === 'applications') throw Error('fictional query outage'); };
  const confirmedAt = f.now();
  assert.equal((await f.run()).status, 503);
  assert.equal(Date.parse(f.rows.get(jobPath).authRemovedAt), confirmedAt);
  f.hooks.query = undefined;
  f.hooks.auth = async () => { throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); };
  f.advance(86400000);
  assert.deepEqual(await (await f.run()).json(), { completed: 1, failed: 0 });
  assert.equal(f.rows.has(jobPath), false);
});

test('stale unknown-history worker cannot overwrite a successor Auth confirmation or schedule', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`, entered = deferred(), release = deferred();
  delete f.rows.get(jobPath).authRemovedAt;
  let attempts = 0;
  f.hooks.auth = async () => { if (++attempts === 1) { entered.resolve(); await release.promise; } };
  const stale = f.run(); await entered.promise;
  f.advance(360001);
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  const successor = structuredClone(f.rows.get(jobPath)), listings = f.listings.length;
  assert.equal(Date.parse(successor.authRemovedAt), f.now());
  release.resolve(); assert.equal((await stale).status, 503);
  assert.deepEqual(f.rows.get(jobPath), successor);
  assert.equal(f.listings.length, listings);
});

test('missing or imprecise generations never become unconditional or rounded deletes', async () => {
  const f = fixture(), path = `resumes/${f.uid}/private.pdf`;
  f.objects.set(path, undefined);
  await assert.rejects(f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, f.uid), /generation/i);
  assert.equal(f.objects.has(path), true);
  f.objects.set(path, '9007199254740993');
  await f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, f.uid);
  assert.equal(f.objects.has(path), false);
  assert.equal(String(f.deletes[0].options.ifGenerationMatch), '9007199254740993');
});

test('bounded sweeps advance past retained pages and remove only unreferenced owned objects', async () => {
  const f = fixture();
  const url = name => `https://firebasestorage.googleapis.com/v0/b/${f.bucket.name}/o/${encodeURIComponent(name)}?token=fixture`;
  for (let i = 0; i < 205; i++) {
    const name = `resumes/${f.uid}/${String(i).padStart(3, '0')}.pdf`;
    f.objects.set(name, '123');
    if (i < 120) f.rows.set(`applications/app-${i}`, { [i % 2 ? 'memberId' : 'userId']: f.uid, profileSnapshot: { resumeUrl: url(name) } });
  }
  f.objects.set(`application-documents/${f.uid}/archive.pdf`, '123');
  f.objects.set('resumes/foreign/private.pdf', '123');
  assert.equal((await f.run()).status, 200);
  assert.ok(f.rows.has(`account_cleanup/${f.uid}`), 'partial sweep must keep its durable job');
  assert.equal(f.deletes.length, 0, 'first page is entirely retained');
  assert.ok(f.listings.every(options => options.autoPaginate === false && options.maxResults <= 100));
  f.advance(60001); assert.equal((await f.run()).status, 200);
  assert.equal(f.deletes.length, 80);
  assert.ok(f.rows.has(`account_cleanup/${f.uid}`));
  f.advance(60001); assert.equal((await f.run()).status, 200);
  assert.equal(f.deletes.length, 85);
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
  assert.equal(f.objects.size, 122);
  assert.equal([...f.rows.keys()].filter(path => path.startsWith('applications/')).length, 120);
});

test('expired workers cannot resume effects or restore a job after a successor succeeds', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.objects.set(`resumes/${f.uid}/private.pdf`, '123');
  let attempt = 0;
  f.hooks.auth = async () => { if (++attempt === 1) { entered.resolve(); await release.promise; } };
  const stale = f.run(); await entered.promise;
  f.advance(360001);
  assert.equal((await f.run()).status, 200);
  const calls = f.listings.length;
  release.resolve();
  assert.equal((await stale).status, 503);
  assert.equal(f.listings.length, calls, 'stale worker must not resume Storage operations');
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
  assert.equal(f.objects.size, 0);
});

test('a changed tombstone stops cleanup before Storage deletion', async () => {
  const f = fixture(), path = `resumes/${f.uid}/private.pdf`;
  f.objects.set(path, '123');
  f.hooks.auth = async () => { f.rows.set(`users/${f.uid}`, { status: 'active' }); };
  await assert.rejects(f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, f.uid), /closed|tombstone/i);
  assert.equal(f.objects.has(path), true);
});

test('elapsed invocation budget leaves later jobs untouched', async () => {
  const f = fixture();
  f.objects.set(`resumes/${f.uid}/private.pdf`, '123');
  f.rows.set('users/qa-later', { status: 'deleted', deletedAt: 'fixture' });
  const queued = { notBefore: new Date(f.now() - 1000).toISOString() };
  f.rows.set('account_cleanup/qa-later', queued);
  f.hooks.auth = async () => { f.advance(240001); };
  assert.equal((await f.run()).status, 503);
  assert.deepEqual(f.authDeletes, [f.uid]);
  assert.deepEqual(f.rows.get('account_cleanup/qa-later'), queued);
  assert.equal(f.objects.size, 1);
});

test('failed queue finalization and retry writes retain the lease without aborting later jobs', async () => {
  const f = fixture();
  f.objects.set(`resumes/${f.uid}/private.pdf`, '123');
  f.rows.set('users/qa-later', { status: 'deleted', deletedAt: 'fixture' });
  f.rows.set('account_cleanup/qa-later', { notBefore: new Date(f.now() - 1000).toISOString(), authRemovedAt: new Date(f.now() - 7200000).toISOString() });
  let transaction = 0;
  f.hooks.transaction = async () => { if ([2, 3].includes(++transaction)) throw Error('queue unavailable'); };
  const response = await f.run();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { completed: 1, failed: 1 });
  assert.equal(f.rows.has('account_cleanup/qa-later'), false);
  assert.ok(f.rows.get(`account_cleanup/${f.uid}`).leaseOwner);
  f.advance(360001);
  assert.equal((await f.run()).status, 200);
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
  assert.equal(f.objects.size, 0);
});

test('application reference scans are paged without dropping late legacy references', async () => {
  const f = fixture(), path = `resumes/${f.uid}/shared.pdf`;
  f.objects.set(path, '123');
  for (let i = 0; i < 501; i++) f.rows.set(`applications/${String(i).padStart(3, '0')}`, { memberId: f.uid,
    ...(i === 500 ? { resumeUrl: `https://firebasestorage.googleapis.com/v0/b/${f.bucket.name}/o/${encodeURIComponent(path)}` } : {}) });
  assert.equal((await f.run()).status, 200);
  assert.equal(f.objects.has(path), true);
  assert.ok(f.queries.filter(query => query.name === 'applications').every(query => query.maximum <= 250));
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
});

test('worker whose last Storage request outlives its lease cannot finalize or delay the expired job', async () => {
  const f = fixture();
  f.objects.set(`resumes/${f.uid}/private.pdf`, '123');
  f.hooks.delete = async () => { f.advance(360001); };
  assert.equal((await f.run()).status, 503);
  const job = f.rows.get(`account_cleanup/${f.uid}`);
  assert.ok(job?.leaseOwner);
  assert.ok(Date.parse(job.notBefore) < f.now());
  f.hooks.delete = undefined;
  assert.equal((await f.run()).status, 200);
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
});

test('late-token uploads remain scheduled after immediate cleanup and are removed only when due', async () => {
  const f = fixture(), jobPath = `account_cleanup/${f.uid}`;
  f.rows.get(jobPath).notBefore = new Date(f.now() + 90 * 60000).toISOString();
  f.rows.get(jobPath).authRemovedAt = new Date(f.now()).toISOString();
  const queued = structuredClone(f.rows.get(jobPath));
  f.objects.set(`resumes/${f.uid}/initial.pdf`, '123');
  await f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, f.uid);
  assert.equal(f.objects.size, 0);
  assert.deepEqual(f.rows.get(jobPath), queued);
  f.objects.set(`resumes/${f.uid}/late.pdf`, '124');
  assert.deepEqual(await (await f.run()).json(), { completed: 0, failed: 0 });
  assert.equal(f.objects.size, 1);
  f.advance(90 * 60000 + 1);
  f.hooks.auth = async () => { throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); };
  assert.equal((await f.run()).status, 200);
  assert.equal(f.objects.size, 0);
  assert.equal(f.rows.has(jobPath), false);
  assert.equal(f.rows.get(`users/${f.uid}`).status, 'deleted');
});

test('failed worker after successful successor does not recreate its deleted queue document', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  let attempts = 0;
  f.hooks.auth = async () => { if (++attempts === 1) { entered.resolve(); await release.promise; throw Error('late failure'); } };
  const stale = f.run(); await entered.promise;
  f.advance(360001);
  assert.equal((await f.run()).status, 200);
  release.resolve(); assert.equal((await stale).status, 503);
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
});

test('generation conflict keeps the replacement and job until an exact-generation retry', async () => {
  const f = fixture(), path = `resumes/${f.uid}/private.pdf`;
  f.objects.set(path, '123');
  f.hooks.delete = async () => { f.objects.set(path, '124'); f.hooks.delete = undefined; };
  assert.equal((await f.run()).status, 503);
  assert.equal(f.objects.get(path), '124');
  assert.ok(Date.parse(f.rows.get(`account_cleanup/${f.uid}`).notBefore) >= f.now() + 86400000);
  f.advance(86400001);
  assert.equal((await f.run()).status, 200);
  assert.equal(f.objects.has(path), false);
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
  assert.equal(f.deletes[0].options.ifGenerationMatch, 124);
});

test('current and legacy snapshot references, avatars, archives and foreign uploads stay intact', async () => {
  const f = fixture();
  const url = path => `https://firebasestorage.googleapis.com/v0/b/${f.bucket.name}/o/${encodeURIComponent(path)}?token=fixture`;
  const paths = [`avatars/${f.uid}.png`, `resumes/${f.uid}/current.pdf`, `resumes/${f.uid}/legacy.pdf`, `resumes/${f.uid}/snapshot.pdf`,
    `application-documents/${f.uid}/archive.pdf`, 'avatars/foreign.png', 'resumes/foreign/private.pdf'];
  paths.forEach(path => f.objects.set(path, '123'));
  f.rows.set('applications/current', { userId: f.uid, resumeUrl: url(paths[1]) });
  f.rows.set('applications/legacy', { memberId: f.uid, resumeUrl: url(paths[2]), profileSnapshot: { photoURL: url(paths[0]), resumeUrl: url(paths[3]) } });
  const applicationRows = [...f.rows].filter(([path]) => path.startsWith('applications/'));
  assert.equal((await f.run()).status, 200);
  assert.deepEqual([...f.objects.keys()], paths);
  assert.deepEqual([...f.rows].filter(([path]) => path.startsWith('applications/')), applicationRows);
  assert.equal(f.deletes.length, 0);
});

test('incomplete legacy reference scan causes no Storage listing or deletion', async () => {
  const f = fixture();
  f.objects.set(`resumes/${f.uid}/private.pdf`, '123');
  f.hooks.query = async (name, filters) => { if (name === 'applications' && filters[0][0] === 'memberId') throw Error('Legacy query unavailable'); };
  await assert.rejects(f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, f.uid), /Legacy query unavailable/);
  assert.equal(f.listings.length, 0);
  assert.equal(f.objects.size, 1);
});

test('invalid identities and absent/live tombstones cause no Auth or Storage effects', async () => {
  const f = fixture();
  await assert.rejects(f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, '../foreign'), /identity/);
  for (const data of [undefined, { status: 'active' }, { status: 'deleted' }]) {
    if (data) f.rows.set(`users/${f.uid}`, data); else f.rows.delete(`users/${f.uid}`);
    await assert.rejects(f.helper.cleanClosedAccountUploads(f.db, f.bucket, f.auth, f.uid), /closed/);
  }
  assert.equal(f.authDeletes.length, 0);
  assert.equal(f.listings.length, 0);
});

test('simultaneous workers claim a due job once before Auth or Storage effects', async () => {
  const f = fixture(), entered = deferred(), release = deferred();
  f.objects.set(`resumes/${f.uid}/private.pdf`, '123');
  f.hooks.auth = async () => { entered.resolve(); await release.promise; };
  const first = f.run(); await entered.promise;
  const second = f.run();
  await new Promise(resolve => setTimeout(resolve, 20));
  release.resolve();
  const responses = await Promise.all([first, second]);
  assert.equal(f.authDeletes.length, 1);
  assert.equal(f.deletes.length, 1);
  assert.equal(f.rows.has(`account_cleanup/${f.uid}`), false);
  assert.ok(responses.every(response => response.status === 200));
});

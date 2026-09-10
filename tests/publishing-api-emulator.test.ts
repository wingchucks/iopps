/* eslint-disable @typescript-eslint/no-explicit-any -- VM isolates credentials/email; actual route and Firestore transactions run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as entitlements from '../src/lib/server/featured-job-entitlements.ts';
import * as school from '../src/lib/school-visibility.ts';

const enabled = process.env.IOPPS_TEST_EMULATORS === 'true';
async function harness(t: any) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  const app = initializeApp({ projectId: 'demo-iopps-publishing-api' }, crypto.randomUUID());
  const db = getFirestore(app); const uid = `publisher-${crypto.randomUUID()}`;
  const employer = db.doc(`employers/${uid}`);
  await employer.set({ plan: 'free', featuredPostCredits: 0 });
  class EmployerApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
  const context = { uid, employerId: uid, orgId: uid, orgRole: 'owner', organizationData: { name: 'Fictional org' }, employerData: {}, userData: {}, memberData: {}, emailVerified: true };
  let failures = 0; let attempts = 0; let failureMessage = '3 INVALID_ARGUMENT: Transaction is invalid or closed.';
  const port = new Proxy(db, { get(target, key) {
    // Host-realm callback prevents Firestore Promise identity checks rejecting VM async functions.
    if (key === 'runTransaction') return (fn: any) => {
      attempts++;
      if (failures > 0) { failures--; return Promise.reject(Object.assign(new Error(failureMessage), { code: 3 })); }
      return target.runTransaction(async tx => await fn(tx));
    };
    const value = (target as any)[key]; return typeof value === 'function' ? value.bind(target) : value;
  } });
  function load(file: string) {
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, Date, Error, console: { log() {}, error(...args: any[]) { console.error(...args.map(value => value instanceof Error ? { name: value.name, message: value.message, code: (value as any).code } : value)); } }, require: (id: string) => {
        if (id === 'next/server') return { NextResponse: { json: Response.json } };
        if (id === 'firebase-admin/firestore') return { FieldValue };
        if (id === '@/lib/firebase-admin') return { getAdminDb: () => port };
        if (id === '@/lib/server/employer-auth') {
          const authorize = async (req: Request) => { if (!req.headers.has('authorization')) throw new EmployerApiError(401, 'Unauthorized'); return context; };
          return { EmployerApiError, requireEmployerContext: authorize, requireEmployerPublishingContext: authorize };
        }
        if (id === '@/lib/server/featured-job-entitlements') return entitlements;
        if (id === '@/lib/school-visibility') return school;
        if (id === '@/lib/email') return { sendAdminContentPosted: async () => {} };
        throw new Error(id);
      },
    });
    return exports;
  }
  const create = load('src/app/api/employer/jobs/route.ts');
  const edit = load('src/app/api/employer/jobs/[id]/route.ts');
  const paths = new Set<string>();
  const id = (suffix: string) => { const key = `${uid}-${suffix}`; paths.add(`jobs/${key}`); paths.add(`posts/${key}`); return key; };
  const request = (body: unknown, authorized = true) => new Request('http://127.0.0.1/api/employer/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { authorization: 'Bearer fictional' } : {}) }, body: JSON.stringify(body) });
  t.after(async () => { for (const path of paths) await db.doc(path).delete(); await employer.delete(); await db.terminate(); await deleteApp(app); });
  return { uid, db, employer, id, closeOnce: () => { failures = 1; },
    failTransactions: (count: number, message = failureMessage) => { failures = count; failureMessage = message; }, attempts: () => attempts,
    create: (body: unknown, authorized = true) => create.POST(request(body, authorized)),
    edit: (key: string, body: unknown) => edit.PUT(request(body), { params: Promise.resolve({ id: key }) }) };
}

test('server retains draft creation/editing and rejects unpaid featured activation', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('draft');
  assert.equal((await h.create({ title: 'Draft', slug: id, status: 'draft', featured: true })).status, 200);
  assert.equal((await h.edit(id, { title: 'Edited draft' })).status, 200);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.title, 'Edited draft');
  assert.equal((await h.edit(id, { status: 'active', featured: true, featuredCreditConsumed: true })).status, 400);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.status, 'draft');
  await h.employer.update({ featuredPostCredits: 1 });
  assert.equal((await h.edit(id, { status: 'active', featured: true })).status, 200);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
  assert.equal((await h.edit(id, { title: 'Legitimate paid edit' })).status, 200);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
});

test('server preserves legacy job-post draft editing and entitlement enforcement', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('legacy');
  await h.db.doc(`posts/${id}`).set({ orgId: h.uid, type: 'job', status: 'draft', featured: false, title: 'Legacy' });
  assert.equal((await h.edit(id, { title: 'Legacy edited', status: 'draft' })).status, 200);
  assert.equal((await h.edit(id, { status: 'active', featured: true })).status, 400);
  await h.employer.update({ featuredPostCredits: 1 });
  assert.equal((await h.edit(id, { status: 'active', featured: true })).status, 200);
  assert.equal((await h.db.doc(`posts/${id}`).get()).data()?.featuredCreditConsumed, true);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
});

test('concurrent server publishing cannot spend the same featured credit twice', { skip: !enabled }, async t => {
  const h = await harness(t); await h.employer.update({ featuredPostCredits: 1 });
  const a = h.id('race-a'); const b = h.id('race-b');
  const results = await Promise.all([a, b].map(slug => h.create({ title: 'Paid role', slug, status: 'active', featured: true })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400], JSON.stringify(await Promise.all(results.map(r => r.clone().json()))));
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
  const snapshots = await Promise.all([a, b].map(id => h.db.doc(`jobs/${id}`).get()));
  assert.equal(snapshots.filter(s => s.exists).length, 1);
});

test('create cannot overwrite another organization job or its own existing paid job', { skip: !enabled }, async t => {
  const h = await harness(t);
  for (const collection of ['jobs', 'posts']) for (const owner of ['victim', h.uid]) {
    const id = h.id(`collision-${collection}-${owner}`); const ref = h.db.doc(`${collection}/${id}`);
    const existing = { type: 'job', orgId: owner, employerId: owner, title: 'Preserved', featured: true, status: 'active', featuredCreditConsumed: true };
    await ref.set(existing);
    assert.equal((await h.create({ title: 'Overwrite', slug: id, status: 'draft' })).status, 409);
    assert.deepEqual((await ref.get()).data(), existing);
    if (collection === 'posts') assert.equal((await h.db.doc(`jobs/${id}`).get()).exists, false);
  }
});

test('concurrent creates of the same identifier cannot replace the winner', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('same-id');
  const results = await Promise.all(['First', 'Second'].map(title => h.create({ title, slug: id, status: 'draft' })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const winner = results[0].status === 200 ? 'First' : 'Second';
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.title, winner);
});

test('concurrent publishing cannot exceed remaining included featured slots', { skip: !enabled }, async t => {
  const h = await harness(t); await h.employer.update({ plan: 'premium', subscriptionTier: 'premium' });
  for (let i = 0; i < 3; i++) await h.db.doc(`jobs/${h.id(`slot-${i}`)}`).set({ employerId: h.uid, orgId: h.uid, status: 'active', active: true, featured: true });
  const results = await Promise.all(['a', 'b'].map(suffix => h.create({ title: 'Slot race', slug: h.id(`slot-race-${suffix}`), status: 'active', featured: true })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400], JSON.stringify(await Promise.all(results.map(r => r.clone().json()))));
});

test('closed transaction retries with a fresh transaction without duplicate publishing', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('closed-transaction');
  await h.employer.update({ featuredPostCredits: 1 }); h.closeOnce();
  assert.equal((await h.create({ title: 'Recovered', slug: id, status: 'active', featured: true })).status, 200);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
  assert.equal((await h.create({ title: 'Duplicate', slug: id, status: 'active', featured: true })).status, 409);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.title, 'Recovered');
});

test('fresh transaction retry is bounded and excludes unrelated invalid arguments', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('bounded-retry'); h.failTransactions(10);
  assert.equal((await h.create({ title: 'Never created', slug: id })).status, 500);
  assert.equal(h.attempts(), 3);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).exists, false);
  h.failTransactions(10, '3 INVALID_ARGUMENT: bad document path');
  assert.equal((await h.create({ title: 'Still denied', slug: id })).status, 500);
  assert.equal(h.attempts(), 4);
});

test('server denies unauthenticated create before database writes', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('unauthenticated');
  assert.equal((await h.create({ title: 'Denied', slug: id }, false)).status, 401);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).exists, false);
});

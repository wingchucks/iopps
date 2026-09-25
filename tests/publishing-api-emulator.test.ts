import { loadEmployerJobRows } from '../src/lib/server/employer-job-list.ts';
/* eslint-disable @typescript-eslint/no-explicit-any -- VM isolates credentials/email; actual route and Firestore transactions run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as entitlements from '../src/lib/server/featured-job-entitlements.ts';
import * as hiringDetails from "../src/lib/job-hiring-details.ts";
import * as jobInputLimits from "../src/lib/server/job-input-limits.ts";
import * as school from '../src/lib/school-visibility.ts';
import * as paidPublication from '../src/lib/server/paid-job-publication.ts';
import * as paidReader from '../src/lib/server/paid-job-publication-reader.ts';
import * as paidFirestore from '../src/lib/server/paid-job-publication-firestore.ts';
import {activateAdminJob} from '../src/lib/server/admin-job-lifecycle.ts';

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
        if (id === '@/lib/server/employer-job-list') return { loadEmployerJobRows };
        if (id === 'next/server') return { NextResponse: { json: Response.json } };
        if (id === 'firebase-admin/firestore') return { FieldValue };
        if (id === '@/lib/firebase-admin') return { getAdminDb: () => port, adminDb: port };
        if (id === '@/lib/api-auth') return { verifyAdminToken: async () => ({success:true,decodedToken:{uid:'fictional-admin'}}) };
        if (id === '@/lib/server/admin-job-lifecycle') return {activateAdminJob};
        if (id === '@/lib/server/employer-auth') {
          const authorize = async (req: Request) => { if (!req.headers.has('authorization')) throw new EmployerApiError(401, 'Unauthorized'); context.employerData=(await employer.get()).data() ?? {}; return context; };
          return { EmployerApiError, requireEmployerContext: authorize, requireEmployerPublishingContext: authorize };
        }
        if (id === '@/lib/server/featured-job-entitlements') return entitlements;
        if (id === '@/lib/server/paid-job-publication') return paidPublication;
        if (id === '@/lib/server/paid-job-publication-reader') return paidReader;
        if (id === '@/lib/server/paid-job-publication-firestore') return paidFirestore;
        if (id === '@/lib/organization-profile') return {normalizeOrganizationRecord:(value:unknown)=>value};
        if (id === '@/lib/school-visibility') return school;
        if (id === '@/lib/job-hiring-details') return hiringDetails;
        if (id === '@/lib/server/job-input-limits') return jobInputLimits;
        if (id === '@/lib/email') return { sendAdminContentPosted: async () => {} };
        throw new Error(id);
      },
    });
    return exports;
  }
  const dashboard = load('src/app/api/employer/dashboard/route.ts');
  const create = load('src/app/api/employer/jobs/route.ts');
  const edit = load('src/app/api/employer/jobs/[id]/route.ts');
  const adminPosts = load('src/app/api/admin/posts/route.ts');
  const paths = new Set<string>();
  const id = (suffix: string) => { const key = `${uid}-${suffix}`; paths.add(`jobs/${key}`); paths.add(`posts/${key}`); paths.add(`archivedContent/${key}`); return key; };
  const request = (body: unknown, authorized = true) => new Request('http://127.0.0.1/api/employer/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { authorization: 'Bearer fictional' } : {}) }, body: JSON.stringify(body) });
  t.after(async () => { for (const path of paths) {await db.doc(path).delete();assert.equal((await db.doc(path).get()).exists,false);} await employer.delete();assert.equal((await employer.get()).exists,false); await db.terminate(); await deleteApp(app); });
  return { uid, db, employer, id, receipt:async(data:Record<string,unknown>)=>{const ref=db.collection('subscriptions').doc();paths.add(ref.path);await ref.set(data);}, closeOnce: () => { failures = 1; },
    failTransactions: (count: number, message = failureMessage) => { failures = count; failureMessage = message; }, attempts: () => attempts,
    dashboard: () => dashboard.GET(request({})),
    get: (key: string) => edit.GET(request({}), { params: Promise.resolve({id:key}) }),
    adminPost: (body: unknown) => adminPosts.POST(request(body)),
    create: (body: unknown, authorized = true) => create.POST(request(body, authorized)),
    edit: (key: string, body: unknown) => edit.PUT(request(body), { params: Promise.resolve({ id: key }) }) };
}

test('paid pricing GET summary requires paid evidence and excludes credit-funded placements', { skip: !enabled }, async t => {
  const h=await harness(t);const id=h.id('summary');
  await h.create({title:'Draft',slug:id,status:'draft'});
  await h.employer.update({plan:'premium',subscriptionTier:'premium',featuredPostCredits:1});
  let res=await h.get(id);assert.equal(res.status,200);let summary=(await res.json()).featuredSummary;
  assert.equal(summary.featuredSlotsTotal,0,'a tier label is not paid-term evidence');
  assert.equal(summary.canFeatureJobs,true);
  const funded=h.id('credit-funded');
  await h.create({title:'Featured paid',slug:funded,status:'active',featured:true,durationDays:30});
  await h.employer.update({featuredPostCredits:1});
  res=await h.get(id);assert.equal(res.status,200);summary=(await res.json()).featuredSummary;
  assert.equal(summary.featuredSlotsUsed,0,'credit-funded jobs do not occupy included slots');
  assert.deepEqual((await (await h.dashboard()).json()).featuredSummary,summary);
  assert.equal(summary.canFeatureJobs,true);
});

test('paid pricing denies unentitled standard active creation and consumes one purchased credit', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('paid-standard');
  assert.equal((await h.create({ title: 'Paid required', slug: id, status: 'active' })).status, 402);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).exists, false);
  await h.employer.update({ standardPostCredits: 1 });
  assert.equal((await h.create({ title: 'Paid required', slug: id, status: 'active' })).status, 200);
  const saved = (await h.db.doc(`jobs/${id}`).get()).data()!;
  assert.equal(saved.publication.durationDays, 30);
  assert.equal(saved.expiresAt.toMillis() - saved.publication.firstPublishedAt.toMillis(), 30 * 86400000);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 0);
  assert.equal((await h.edit(id, { title: 'Edit', closingDate: '', expiresAt: '2099-01-01' })).status, 200);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.expiresAt.toMillis(), saved.expiresAt.toMillis());
});

test('paid pricing admin activation also consumes a paid credit', { skip: !enabled }, async t => {
  const h=await harness(t);const id=h.id('admin-paid');
  assert.equal((await h.create({title:'Draft',slug:id,status:'draft'})).status,200);
  assert.match(String(await activateAdminJob(h.db,id)),/paid posting/i);
  await h.employer.update({standardPostCredits:1});
  assert.equal(await activateAdminJob(h.db,id),null);
  assert.equal((await h.employer.get()).data()?.standardPostCredits,0);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.publication.durationDays,30);
});

test('paid pricing admin restore is atomic and draft featuring cannot publish free', { skip: !enabled }, async t => {
  const h=await harness(t);const id=h.id('admin-restore');
  await h.create({title:'Draft',slug:id,status:'draft'});
  assert.equal(await activateAdminJob(h.db,id,{feature:true}),null);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.status,'draft');
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.featured,true);
  await h.db.doc(`jobs/${id}`).update({featured:false,status:'archived',archived:true});
  const archive=h.db.doc(`archivedContent/${id}`);
  // Cleanup is owned by the harness before its database closes.
  await archive.set({originalCollection:'jobs',originalId:id});
  assert.match(String(await activateAdminJob(h.db,id,{restore:true})),/paid posting/i);
  assert.equal((await archive.get()).exists,true);
  await h.employer.update({standardPostCredits:1});
  assert.equal(await activateAdminJob(h.db,id,{restore:true}),null);
  assert.equal((await archive.get()).exists,false);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.archived,false);
});

test('paid pricing admin posts route rejects unpaid restore and unknown collection', { skip: !enabled }, async t => {
  const h=await harness(t); const id=h.id('admin-route');
  await h.create({title:'Draft',slug:id,status:'draft'});
  await h.db.doc(`jobs/${id}`).update({status:'archived',archived:true});
  await h.db.doc(`archivedContent/${id}`).set({originalCollection:'jobs',originalId:id});
  assert.equal((await h.adminPost({action:'restore',collection:'jobs',postId:id})).status,409);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.status,'archived');
  assert.equal((await h.adminPost({action:'feature',collection:'employers',postId:h.uid})).status,400);
  assert.equal((await h.employer.get()).data()?.featured,undefined);
});

test('paid pricing draft activation cannot bypass the standard payment gate', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('unpaid-draft');
  assert.equal((await h.create({title:'Draft',slug:id,status:'draft'})).status,200);
  assert.equal((await h.edit(id,{status:'active'})).status,402);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.status,'draft');
});

test('server retains draft creation/editing and rejects unpaid featured activation', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('draft');
  assert.equal((await h.create({ title: 'Draft', slug: id, status: 'draft', featured: true })).status, 200);
  assert.equal((await h.edit(id, { title: 'Edited draft' })).status, 200);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.title, 'Edited draft');
  assert.equal((await h.edit(id, { status: 'active', featured: true, durationDays: 30, featuredCreditConsumed: true })).status, 402);
  assert.equal((await h.db.doc(`jobs/${id}`).get()).data()?.status, 'draft');
  await h.employer.update({ featuredPostCredits: 1 });
  assert.equal((await h.edit(id, { status: 'active', featured: true, durationDays: 30 })).status, 200);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
  assert.equal((await h.edit(id, { title: 'Legitimate paid edit' })).status, 200);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
});

test('server preserves legacy job-post draft editing and entitlement enforcement', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('legacy');
  await h.db.doc(`posts/${id}`).set({ orgId: h.uid, type: 'job', status: 'draft', featured: false, title: 'Legacy' });
  assert.equal((await h.edit(id, { title: 'Legacy edited', status: 'draft' })).status, 200);
  assert.equal((await h.edit(id, { status: 'active', featured: true, durationDays: 30 })).status, 402);
  await h.employer.update({ featuredPostCredits: 1 });
  assert.equal((await h.edit(id, { status: 'active', featured: true, durationDays: 30 })).status, 200);
  assert.equal((await h.db.doc(`posts/${id}`).get()).data()?.featuredCreditConsumed, true);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
});

test('job location and optional hiring details survive create, unrelated edits, and updates', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('hiring-details');
  const details = {
    territory: 'Treaty 6', territoryName: 'Sample community',
    criminalRecordCheck: 'Required after an offer', vulnerableSectorCheck: 'Not required',
    driversLicense: true, licenceClass: 'Class 5', willTrain: true, trainingDetails: 'Paid orientation',
    supports: ['Mentorship'], indigenousEncouraged: true,
  };
  assert.equal((await h.create({ title: 'Fictional coordinator', slug: id, status: 'draft', location: 'Saskatoon, Saskatchewan', hiringDetails: details })).status, 200);
  let saved = (await h.db.doc(`jobs/${id}`).get()).data();
  assert.equal(saved?.location, 'Saskatoon, Saskatchewan');
  assert.equal(saved?.hiringDetails.criminalRecordCheck, 'Required after an offer');
  assert.equal(saved?.hiringDetails.territory, 'Treaty 6');
  assert.equal(saved?.willTrain, true);
  assert.equal(saved?.driversLicense, true);
  assert.equal((await h.edit(id, { title: 'Updated coordinator' })).status, 200);
  assert.deepEqual((await h.db.doc(`jobs/${id}`).get()).data()?.hiringDetails, saved?.hiringDetails);
  assert.equal((await h.edit(id, { hiringDetails: { ...details, driversLicense: false, willTrain: false } })).status, 200);
  saved = (await h.db.doc(`jobs/${id}`).get()).data();
  assert.equal(saved?.driversLicense, false);
  assert.equal(saved?.willTrain, false);
  assert.equal(saved?.hiringDetails.licenceClass, '');
  assert.equal(saved?.hiringDetails.trainingDetails, '');
});

test('employers can revise required documents and return an external job to IOPPS applications', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('application-settings');
  assert.equal((await h.create({ title: 'Coordinator', slug: id, status: 'draft', requiresResume: true, requiresCoverLetter: true, requiresReferences: true, applicationUrl: 'https://example.invalid/apply', closingDate: '2099-12-31' })).status, 200);
  assert.equal((await h.edit(id, { requiresReferences: false, applicationUrl: '', closingDate: '' })).status, 200);
  const saved = (await h.db.doc(`jobs/${id}`).get()).data();
  assert.equal(saved?.requiresReferences, false);
  assert.equal(saved?.requiresResume, true);
  assert.equal(saved?.requiresCoverLetter, true);
  assert.equal(saved?.applicationUrl, '');
  assert.equal(saved?.externalApplyUrl, '');
  assert.equal(saved?.closingDate, '');
});

test('concurrent server publishing cannot spend the same featured credit twice', { skip: !enabled }, async t => {
  const h = await harness(t); await h.employer.update({ featuredPostCredits: 1 });
  const a = h.id('race-a'); const b = h.id('race-b');
  const results = await Promise.all([a, b].map(slug => h.create({ title: 'Paid role', slug, status: 'active', featured: true, durationDays: 30 })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 402], JSON.stringify(await Promise.all(results.map(r => r.clone().json()))));
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
  const h = await harness(t);const startsAt=new Date(Date.now()-86400000),expiresAt=new Date(Date.now()+31536000000);
  await h.employer.update({plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:startsAt,subscriptionEnd:expiresAt});
  await h.receipt({orgId:h.uid,plan:'tier2',status:'active',billingCycle:'annual',amount:2500,startsAt,expiresAt});
  for (let i = 0; i < 3; i++) await h.db.doc(`jobs/${h.id(`slot-${i}`)}`).set({ employerId: h.uid, orgId: h.uid, status: 'active', active: true, featured: true });
  const ids=['a','b'].map(suffix=>h.id(`slot-race-${suffix}`));
  const results = await Promise.all(ids.map(slug => h.create({ title: 'Slot race', slug, status: 'active', featured: true, durationDays: 30 })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 402], JSON.stringify(await Promise.all(results.map(r => r.clone().json()))));
  const saved=await Promise.all(ids.map(id=>h.db.doc(`jobs/${id}`).get()));
  assert.equal(saved.filter(doc=>doc.exists).length,1);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits,0);
});

test('closed transaction retries with a fresh transaction without duplicate publishing', { skip: !enabled }, async t => {
  const h = await harness(t); const id = h.id('closed-transaction');
  await h.employer.update({ featuredPostCredits: 1 }); h.closeOnce();
  assert.equal((await h.create({ title: 'Recovered', slug: id, status: 'active', featured: true, durationDays: 30 })).status, 200);
  assert.equal((await h.employer.get()).data()?.featuredPostCredits, 0);
  assert.equal((await h.create({ title: 'Duplicate', slug: id, status: 'active', featured: true, durationDays: 30 })).status, 409);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { createImportedJobOnce, feedImportIdentity } from '../src/lib/server/feed-import-identity.ts';

test('demo: parallel import creates exactly one job and reservation; separate locations and reposts survive', {skip:process.env.IOPPS_TEST_EMULATORS !== 'true'}, async () => {
  assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  const app = initializeApp({projectId:'demo-iopps-preview'}, 'import-'+crypto.randomUUID());
  const db = getFirestore(app);
  const base = {title:'Fictional Branch Manager', location:'Winnipeg, MB', feedId:'fixture-'+crypto.randomUUID(), employerId:'fictional-'+crypto.randomUUID(), externalId:'REQ-A', publishedAt:new Date('2026-09-08'), active:true};
  const variants = [base, {...base,location:'Delta, BC'}, {...base,publishedAt:new Date('2026-04-15')}, {...base,externalId:'req-a'}];
  const refs = variants.flatMap(data=>[db.doc('feedImportIdentities/'+feedImportIdentity(data)),db.doc('jobs/import-'+feedImportIdentity(data))]);
  const employer=db.doc('employers/'+base.employerId);refs.push(employer);
  try {
    await employer.set({standardPostCredits:variants.length});
    const created = await Promise.all(Array.from({length:6},()=>createImportedJobOnce(db,base)));
    assert.equal(created.filter(Boolean).length,1);
    for(const data of variants.slice(1)) assert.equal(await createImportedJobOnce(db,data),true);
    for(const ref of refs) assert.equal((await ref.get()).exists,true);
    assert.equal((await employer.get()).data()?.standardPostCredits,0);
    const job=refs[1];await job.update({active:false,status:'deleted'});
    assert.equal(await createImportedJobOnce(db,base),false);
    assert.equal((await job.get()).get('status'),'deleted');
  } finally {
    for(const ref of refs)await ref.delete();
    for(const ref of refs)assert.equal((await ref.get()).exists,false);
    await deleteApp(app);
  }
});

test('demo: a closed import transaction restarts fresh, at most three times, and only for that error', {skip:process.env.IOPPS_TEST_EMULATORS !== 'true'}, async () => {
  const app = initializeApp({projectId:'demo-iopps-preview'}, 'import-'+crypto.randomUUID());
  const db = getFirestore(app);
  let failures=0, attempts=0, message='3 INVALID_ARGUMENT: Transaction is invalid or closed.';
  const closing = new Proxy(db, {get(target, key) {
    if (key === 'runTransaction') return (fn: Parameters<Firestore['runTransaction']>[0]) => {
      attempts++;
      if (failures > 0) { failures--; return Promise.reject(Object.assign(new Error(message), {code:3})); }
      return target.runTransaction(fn);
    };
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  }});
  const base = {title:'Fictional Records Clerk', location:'Regina, SK', feedId:'fixture-'+crypto.randomUUID(), employerId:'fictional-'+crypto.randomUUID(), externalId:'REQ-B', publishedAt:new Date('2026-09-08'), active:false};
  const refsOf = (data: typeof base) => [db.doc('feedImportIdentities/'+feedImportIdentity(data)), db.doc('jobs/import-'+feedImportIdentity(data))];
  const recovered = refsOf(base), neverCreated = refsOf({...base, externalId:'REQ-C'});
  try {
    failures = 2;
    assert.equal(await createImportedJobOnce(closing, base), true);
    assert.equal(attempts, 3);
    for (const ref of recovered) assert.equal((await ref.get()).exists, true);
    assert.equal(await createImportedJobOnce(closing, base), false);
    failures = 10; attempts = 0;
    await assert.rejects(createImportedJobOnce(closing, {...base, externalId:'REQ-C'}), /Transaction is invalid or closed/);
    assert.equal(attempts, 3);
    message = '3 INVALID_ARGUMENT: bad document path'; attempts = 0;
    await assert.rejects(createImportedJobOnce(closing, {...base, externalId:'REQ-C'}), /bad document path/);
    assert.equal(attempts, 1);
    for (const ref of neverCreated) assert.equal((await ref.get()).exists, false);
  } finally {
    for (const ref of recovered) await ref.delete();
    await deleteApp(app);
  }
});

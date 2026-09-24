import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

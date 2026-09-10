import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createReconciliationAdapter } from '../src/lib/server/hermes-reconciliation-firestore.ts';
const enabled=process.env.IOPPS_TEST_EMULATORS==='true';
test('adapter uses bounded projected snapshot pagination and does not mutate business records',{skip:!enabled},async t=>{
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
 const app=initializeApp({projectId:`demo-recon-${randomBytes(5).toString('hex')}`},`recon-${randomBytes(5).toString('hex')}`);
 const db=getFirestore(app);t.after(async()=>{await db.terminate();await deleteApp(app);});
 const batch=db.batch();for(let i=0;i<205;i++)batch.set(db.collection('jobs').doc(String(i).padStart(4,'0')),{employerId:'owner',status:'draft',title:'private-title',email:'private@example.invalid'});await batch.commit();
 const before=await db.doc('jobs/0000').get();
 const adapter=createReconciliationAdapter(db,()=>100000);
 const snapshot=await adapter.readSnapshot();assert.equal(snapshot.jobs.length,205);
 assert.deepEqual(snapshot.jobs[0].data,{employerId:'owner',status:'draft'});
 assert.equal((await db.doc('jobs/0000').get()).updateTime?.toMillis(),before.updateTime?.toMillis());
 const results=await Promise.all([adapter.consumeReportBudget('test'),adapter.consumeReportBudget('test')]);assert.deepEqual(results.sort(),[false,true]);
 assert.equal(await createReconciliationAdapter(db,()=>160001).consumeReportBudget('test'),true);
});
test('adapter refuses an over-cap database instead of reporting partial success',{skip:!enabled},async t=>{
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
 const app=initializeApp({projectId:`demo-recon-${randomBytes(5).toString('hex')}`},`recon-${randomBytes(5).toString('hex')}`);const db=getFirestore(app);
 t.after(async()=>{await db.terminate();await deleteApp(app);});
 for(let start=0;start<1001;start+=400){const batch=db.batch();for(let i=start;i<Math.min(1001,start+400);i++)batch.set(db.collection('jobs').doc(String(i).padStart(4,'0')),{status:'draft'});await batch.commit();}
 await db.doc('jobs/1000').delete();
 assert.equal((await createReconciliationAdapter(db).readSnapshot()).jobs.length,1000);
 await db.doc('jobs/1000').set({status:'draft'});
 await assert.rejects(createReconciliationAdapter(db).readSnapshot(),/capacity/i);
});

test('projected byte cap fails closed and pagination uses Firestore UTF-8 order',{skip:!enabled},async t=>{
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';const id=`demo-recon-${randomBytes(5).toString('hex')}`;
 const app=initializeApp({projectId:id},id);const db=getFirestore(app);t.after(async()=>{await db.terminate();await deleteApp(app);});
 await db.doc('jobs/\uE000').set({status:'draft'});await db.doc('jobs/😀').set({status:'draft'});
 assert.equal((await createReconciliationAdapter(db).readSnapshot()).jobs.length,2);
 const batch=db.batch();for(let i=0;i<3;i++)batch.set(db.doc(`employers/large-${i}`),{plan:'x'.repeat(800000)});await batch.commit();
 await assert.rejects(createReconciliationAdapter(db).readSnapshot(),/capacity/i);
});

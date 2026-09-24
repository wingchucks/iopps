import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp,FieldValue} from 'firebase-admin/firestore';
import {createFirebaseHermesFirestorePort} from '../src/lib/server/hermes-firestore-adapter.ts';
import {createHermesJobApprovalFirestoreAdapter,hermesJobApprovalIdempotencyDocumentId} from '../src/lib/server/hermes-job-approval-firestore.ts';
import {reviewHermesJobApproval,applyHermesJobApproval,JOB_APPROVAL_CONFIRMATION} from '../src/lib/server/hermes-job-approval.ts';
test('paid pricing signed approval debits once and verifies exact retry and drift',{skip:process.env.IOPPS_TEST_EMULATORS!=='true'},async()=>{
 const app=initializeApp({projectId:'demo-paid-signed'},crypto.randomUUID());const db=getFirestore(app);
 const owner='owner-'+crypto.randomUUID(),job='job-'+crypto.randomUUID();
 const execution={keyId:'fixture',idempotencyKey:job,requestHash:'a'.repeat(64)};
 const receipt=hermesJobApprovalIdempotencyDocumentId(execution);
 const paths=['employers/'+owner,'jobs/'+job,'hermesAdminIdempotency/'+receipt,'hermesAdminAudit/'+receipt];
 try{
  await db.doc(paths[0]).set({standardPostCredits:1});
  await db.doc(paths[1]).set({employerId:owner,title:'Fictional paid job',status:'draft',active:false,featured:false});
  const adapter=createHermesJobApprovalFirestoreAdapter(createFirebaseHermesFirestorePort(db));
  const deps=adapter.createServiceDeps({reviewSecret:'s'.repeat(64),execution});
  const review=await reviewHermesJobApproval({jobId:job},deps);
  assert.equal(review.ok,true);assert.equal(review.desired.funding,'standard_credit');
  const applied=await applyHermesJobApproval({reviewToken:review.reviewToken,confirmation:JOB_APPROVAL_CONFIRMATION},deps);
  assert.equal(applied.ok,true);assert.equal(applied.verified.funding,'standard_credit');
  assert.equal((await db.doc(paths[0]).get()).data().standardPostCredits,0);
  assert.equal((await db.doc(paths[1]).get()).data().publication.durationDays,30);
  assert.equal((await adapter.getIdempotentApply(execution)).status,'applied');
  await db.doc(paths[1]).update({deletedAt:new Date()});
  await assert.rejects(()=>adapter.getIdempotentApply(execution),/verification|drift/i);
  await db.doc(paths[1]).update({deletedAt:FieldValue.delete()});
  const original=(await db.doc(paths[1]).get()).data().postedAt;
  await db.doc(paths[1]).update({postedAt:new Timestamp(original.seconds,original.nanoseconds+1000)});
  await assert.rejects(()=>adapter.getIdempotentApply(execution),/verification|drift/i);
  await db.doc(paths[1]).update({postedAt:original});
  await db.doc(paths[1]).update({'publication.durationDays':45});
  await assert.rejects(()=>adapter.getIdempotentApply(execution),/verification|drift/i);
 }finally{for(const p of paths)await db.doc(p).delete();for(const p of paths)assert.equal((await db.doc(p).get()).exists,false);await db.terminate();await deleteApp(app);}
});

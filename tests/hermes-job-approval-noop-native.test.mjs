import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {createFirebaseHermesFirestorePort} from '../src/lib/server/hermes-firestore-adapter.ts';
import {createHermesJobApprovalFirestoreAdapter,hermesJobApprovalIdempotencyDocumentId} from '../src/lib/server/hermes-job-approval-firestore.ts';
import {reviewHermesJobApproval,applyHermesJobApproval,JOB_APPROVAL_CONFIRMATION} from '../src/lib/server/hermes-job-approval.ts';
test('paid pricing historical no-op preserves versions and first readback rejects deletion',{skip:process.env.IOPPS_TEST_EMULATORS!=='true'},async()=>{
 const app=initializeApp({projectId:'demo-paid-signed'},crypto.randomUUID()),db=getFirestore(app);
 const owner='owner-'+crypto.randomUUID(),job='job-'+crypto.randomUUID();
 const execution={keyId:'fixture',idempotencyKey:job,requestHash:'b'.repeat(64)},receipt=hermesJobApprovalIdempotencyDocumentId(execution);
 const paths=['employers/'+owner,'jobs/'+job,'hermesAdminIdempotency/'+receipt,'hermesAdminAudit/'+receipt];
 try{
  await db.doc(paths[0]).set({standardPostCredits:1});
  await db.doc(paths[1]).set({employerId:owner,status:'active',active:true,postedAt:Timestamp.fromDate(new Date('2026-09-01'))});
  const before=await Promise.all(paths.slice(0,2).map(p=>db.doc(p).get()));
  const port=createFirebaseHermesFirestorePort(db),adapter=createHermesJobApprovalFirestoreAdapter(port),deps=adapter.createServiceDeps({reviewSecret:'s'.repeat(64),execution});
  const review=await reviewHermesJobApproval({jobId:job},deps);assert.equal(review.ok,true);
  const applied=await applyHermesJobApproval({reviewToken:review.reviewToken,confirmation:JOB_APPROVAL_CONFIRMATION},deps);assert.equal(applied.status,'verified_noop');
  const after=await Promise.all(paths.slice(0,2).map(p=>db.doc(p).get()));after.forEach((doc,i)=>assert.equal(doc.updateTime.isEqual(before[i].updateTime),true));
  const next={...execution,idempotencyKey:job+'-delete'},nextId=hermesJobApprovalIdempotencyDocumentId(next);paths.push('hermesAdminIdempotency/'+nextId,'hermesAdminAudit/'+nextId);
  const injecting={...port,async runTransaction(fn){const result=await port.runTransaction(fn);await db.doc(paths[1]).update({deletedAt:new Date()});return result;}};
  const nextDeps=createHermesJobApprovalFirestoreAdapter(injecting).createServiceDeps({reviewSecret:'s'.repeat(64),execution:next});
  const nextReview=await reviewHermesJobApproval({jobId:job},nextDeps);assert.equal(nextReview.ok,true);
  await assert.rejects(()=>applyHermesJobApproval({reviewToken:nextReview.reviewToken,confirmation:JOB_APPROVAL_CONFIRMATION},nextDeps),/verification|drift/i);
 }finally{for(const p of paths)await db.doc(p).delete();for(const p of paths)assert.equal((await db.doc(p).get()).exists,false);await db.terminate();await deleteApp(app);}
});

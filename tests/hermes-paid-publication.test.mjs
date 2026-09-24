import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePaidValue,resolveHermesPaidPublication} from '../src/lib/server/hermes-paid-publication.ts';
import {reviewHermesJobApproval,applyHermesJobApproval,JOB_APPROVAL_CONFIRMATION} from '../src/lib/server/hermes-job-approval.ts';
const at=new Date('2026-09-24T12:00:00Z');
test('signed review and apply bind Standard payment even with explicit featured false',async()=>{
 const f=fixture();let clock=at;let committed=false;
 const doc={...f.document,collection:'jobs',schema:'employer-job-v1',version:'j1'};
 const deps={reviewSecret:'s'.repeat(64),findJobCandidates:async()=>[doc],
  resolvePaidPublication:async(d,featured,reviewed)=>({ok:true,state:(await resolveHermesPaidPublication(f.reader,d,featured,clock,reviewed)).state}),
  commit:async({boundState})=>{assert.equal(boundState.paidPublication.funding,'standard_credit');committed=true;return {status:'applied',verified:{}};}};
 const review=await reviewHermesJobApproval({jobId:'job',featured:false},deps);
 assert.equal(review.ok,true);assert.equal(review.desired.funding,'standard_credit');assert.equal(review.desired.durationDays,30);
 clock=new Date('2026-09-24T12:00:10Z');
 const result=await applyHermesJobApproval({reviewToken:review.reviewToken,confirmation:JOB_APPROVAL_CONFIRMATION},deps);
 assert.equal(result.ok,true);assert.equal(committed,true);
});
test('paid review rejects conflicting account aliases before charging',async()=>{
 const f=fixture();f.document.data.orgId='unrelated';
 await assert.rejects(()=>resolveHermesPaidPublication(f.reader,f.document,false,at),/identity/i);
});
test('timestamp canonicalization retains native microseconds and Date parity',()=>{
 const stamp=(seconds,nanoseconds)=>({seconds,nanoseconds,toDate:()=>new Date(seconds*1000+Math.floor(nanoseconds/1e6))});
 assert.deepEqual(normalizePaidValue(new Date(1000)),normalizePaidValue(stamp(1,0)));
 assert.notDeepEqual(normalizePaidValue(stamp(1,1000)),normalizePaidValue(stamp(1,2000)));
});
function fixture(){
 let account={standardPostCredits:1};let version='v1';
 const reader={async getDocument(c,id){return c==='employers'&&id==='owner'?{id,data:account,version}:null;},async queryExact(){return [];}};
 const document={id:'job',data:{employerId:'owner',status:'draft',active:false,featured:false}};
 return {reader,document,change(){account={standardPostCredits:2};version='v2';}};
}
test('paid review binds Standard funding and survives an advancing apply clock',async()=>{
 const f=fixture();const review=await resolveHermesPaidPublication(f.reader,f.document,false,at);
 assert.equal(review.state.funding,'standard_credit');assert.equal(review.state.durationDays,30);
 assert.equal(review.employerPatch.standardPostCredits,0);
 const apply=await resolveHermesPaidPublication(f.reader,f.document,false,new Date('2026-09-24T12:00:10Z'),review.state);
 assert.deepEqual(apply.state,review.state);assert.deepEqual(apply.jobPatch,review.jobPatch);
});
test('paid review rejects changed account evidence and elapsed reviewed lifetime',async()=>{
 const f=fixture();const review=await resolveHermesPaidPublication(f.reader,f.document,false,at);
 f.change();await assert.rejects(()=>resolveHermesPaidPublication(f.reader,f.document,false,at,review.state),/changed|review/i);
 const g=fixture();await assert.rejects(()=>resolveHermesPaidPublication(g.reader,g.document,false,new Date('2026-11-01'),review.state),/expired|elapsed/i);
});
test('paid review rejects unpaid drafts and preserves actual historical active listings',async()=>{
 const f=fixture();f.document.data.employerId='missing';await assert.rejects(()=>resolveHermesPaidPublication(f.reader,f.document,false,at),/account/i);
 const g=fixture();g.document.data={employerId:'owner',status:'active',active:true,featured:false};
 const result=await resolveHermesPaidPublication(g.reader,g.document,false,at);
 assert.equal(result.state.funding,'existing_legacy');assert.deepEqual(result.employerPatch,{});
});

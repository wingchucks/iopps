/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
test('transactional submission derives employer, validates requirements, and returns immutable repeat', async()=>{
 const url=new URL('../src/lib/server/application-submission.ts',import.meta.url);
 assert.ok(existsSync(url),'server submission boundary is missing');
 const {submitApplication}=await import(url.href);
 // In-memory transaction adapter exercises the real orchestration, no Firebase/network writes.
 const records=new Map([['posts/role',{type:'job',title:'Role',orgId:'real-org',orgName:'Employer',status:'active',requiresCoverLetter:true}]]);
 let writes=0;
 const db={collection:(c:string)=>({doc:(id:string)=>({path:`${c}/${id}`})}),runTransaction:async(fn:(transaction:any)=>Promise<any>)=>fn({get:async(ref:any)=>({exists:records.has(ref.path),data:()=>records.get(ref.path)}),create:(ref:any,data:any)=>{writes++;records.set(ref.path,data);}})};
 await assert.rejects(submitApplication(db,'candidate',{postId:'role'}),/cover letter/);
 assert.equal(writes,0);
 const first=await submitApplication(db,'candidate',{postId:'role',coverLetter:'Original',orgId:'forged',postTitle:'Forged',status:'offered'});
 assert.equal(first.application.orgId,'real-org');
 assert.equal(first.application.status,'submitted');
 const second=await submitApplication(db,'candidate',{postId:'role',coverLetter:'Changed'});
 assert.equal(second.created,false);assert.equal(writes,1);
 assert.equal(second.application.coverLetter,'Original');
 assert.deepEqual(second.application.appliedAt,first.application.appliedAt);
 let verified=0;
 records.set('jobs/another',{type:'job',title:'Another',status:'active'});
 await submitApplication(db,'candidate',{postId:'another'},async()=>{verified++;});
 assert.equal(verified,1,'new submissions must verify files before writing');
 await submitApplication(db,'candidate',{postId:'another'},async()=>{throw new Error('repeat must not validate replacement files');});
 records.set('posts/mirrored',{type:'job',status:'active'});
 records.set('jobs/mirrored',{status:'closed'});
 await assert.rejects(submitApplication(db,'candidate',{postId:'mirrored'}),/no longer accepting/);
});

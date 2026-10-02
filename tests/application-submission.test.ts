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

test('employer-facing applicant snapshot comes from the stored profile and verified email, not the request', async()=>{
 const {submitApplication}=await import(new URL('../src/lib/server/application-submission.ts',import.meta.url).href);
 const records=new Map<string,any>([
  ['posts/role',{type:'job',title:'Role',orgId:'real-org',status:'active'}],
  ['members/candidate',{displayName:'Stored Name',email:'stale@example.invalid',headline:'Stored headline',skills:['Stored',7],education:[{school:'Real U',degree:'BA',field:'History',year:2020,injected:{nested:true}}]}],
 ]);
 const db={collection:(c:string)=>({doc:(id:string)=>({path:`${c}/${id}`})}),runTransaction:async(fn:(transaction:any)=>Promise<any>)=>fn({get:async(ref:any)=>({exists:records.has(ref.path),data:()=>records.get(ref.path)}),create:(ref:any,data:any)=>{records.set(ref.path,data);}})};
 const forged={displayName:'Forged Executive',email:'someone.else@example.invalid',headline:'CEO',education:[{school:'Fake',role:'admin'}]};
 const {application}=await submitApplication(db,'candidate',{postId:'role',profileSnapshot:forged},async()=>{},{email:'verified@example.invalid'});
 const snapshot=application.profileSnapshot;
 assert.equal(snapshot.displayName,'Stored Name');
 assert.equal(snapshot.email,'verified@example.invalid');
 assert.equal(snapshot.headline,'Stored headline');
 assert.deepEqual(snapshot.skills,['Stored']);
 assert.deepEqual(snapshot.education,[{school:'Real U',degree:'BA',field:'History',year:2020}]);
 assert.ok(!JSON.stringify(snapshot).includes('Forged')&&!JSON.stringify(snapshot).includes('someone.else'));
 const {application:noProfile}=await submitApplication(db,'newcomer',{postId:'role'},async()=>{},{email:'newcomer@example.invalid'});
 assert.equal(noProfile.profileSnapshot.email,'newcomer@example.invalid');
});

test('profile applications attach the saved member-profile resume, never a client-supplied URL', async()=>{
 const {submitApplication}=await import(new URL('../src/lib/server/application-submission.ts',import.meta.url).href);
 const saved='https://firebasestorage.googleapis.com/v0/b/demo.test/o/resumes%2Fcandidate%2Fsaved.pdf?alt=media&token=t';
 const records=new Map<string,any>([
  ['posts/required',{type:'job',title:'Required',status:'active',requiresResume:true}],
  ['posts/optional',{type:'job',title:'Optional',status:'active'}],
  ['members/candidate',{displayName:'Stored Name',resumeUrl:saved,resumeFileName:'Saved CV.pdf'}],
  // The apply page offers only the member profile's resume; another stored field is not it.
  ['users/newcomer',{resumeUrl:'https://firebasestorage.googleapis.com/v0/b/demo.test/o/resumes%2Fnewcomer%2Flegacy.pdf'}],
 ]);
 let writes=0;
 const db={collection:(c:string)=>({doc:(id:string)=>({path:`${c}/${id}`})}),runTransaction:async(fn:(transaction:any)=>Promise<any>)=>fn({get:async(ref:any)=>({exists:records.has(ref.path),data:()=>records.get(ref.path)}),create:(ref:any,data:any)=>{writes++;records.set(ref.path,data);}})};
 const sources:any[]=[];
 const archive=async(resume:any)=>{sources.push(resume);return resume.resumeUrl?'https://archive.invalid/copy':'';};
 const forged='https://firebasestorage.googleapis.com/v0/b/demo.test/o/resumes%2Fcandidate%2Fother.pdf';
 const {application}=await submitApplication(db,'candidate',{postId:'required',resumeType:'profile',resumeUrl:forged,resumeFileName:'Forged.pdf'},archive);
 assert.deepEqual(sources,[{resumeType:'profile',resumeUrl:saved}]);
 assert.equal(application.resumeUrl,'https://archive.invalid/copy');
 assert.equal(application.resumeType,'profile');
 assert.equal(application.resumeFileName,'Saved CV.pdf');
 // Without a saved resume a required-file job is refused before any copy or write...
 await assert.rejects(submitApplication(db,'newcomer',{postId:'required',resumeType:'profile',resumeUrl:saved},archive),/A resume file is required/);
 assert.equal(sources.length,1);assert.equal(writes,1);
 // ...and other jobs are saved without a resume.
 const {application:withoutResume}=await submitApplication(db,'newcomer',{postId:'optional',resumeType:'profile',resumeFileName:'Forged.pdf'},archive);
 assert.deepEqual(sources[1],{resumeType:'profile',resumeUrl:''});
 assert.equal(withoutResume.resumeUrl,'');assert.equal(withoutResume.resumeFileName,null);
 // An uploaded file is the applicant's own upload, passed to the same server verification.
 const upload='https://firebasestorage.googleapis.com/v0/b/demo.test/o/resumes%2Fcandidate%2Fupload.pdf';
 const {application:uploaded}=await submitApplication(db,'candidate',{postId:'optional',resumeType:'file',resumeUrl:upload,resumeFileName:'Upload.pdf'},archive);
 assert.deepEqual(sources[2],{resumeType:'file',resumeUrl:upload});
 assert.equal(uploaded.resumeUrl,'https://archive.invalid/copy');assert.equal(uploaded.resumeFileName,'Upload.pdf');
});

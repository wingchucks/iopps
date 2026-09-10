/* eslint-disable @typescript-eslint/no-explicit-any -- actual routes with isolated demo DB/public auth fixtures */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {randomBytes} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {mergePublicJobRecords} from '../src/lib/public-job-merge.ts';
import * as featured from '../src/lib/server/featured-job-entitlements.ts';
const enabled=process.env.IOPPS_TEST_EMULATORS==='true';
class FixtureEmployerApiError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status;}}
async function harness(t:any, options={closedFailures:0,message:'Transaction is invalid or closed.'}){
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';const id='demo-admin-'+randomBytes(5).toString('hex');const app=initializeApp({projectId:id},id);const db=getFirestore(app);t.after(async()=>{await db.terminate();await deleteApp(app);});
 const bridge=new Proxy(db,{get(target,prop){if(prop==='runTransaction')return(cb:any)=>{if(options.closedFailures>0){options.closedFailures--;throw Object.assign(new Error(options.message),{code:3});}return target.runTransaction(async tx=>await cb(tx));};const v=Reflect.get(target,prop);return typeof v==='function'?v.bind(target):v;}});
 function load(path:string):any{const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console,Promise,Error,require:(name:string)=>{
 if(name==='next/server')return{NextResponse:{json:Response.json}};if(name==='@/lib/firebase-admin')return{adminDb:bridge,getAdminDb:()=>bridge};if(name==='firebase-admin/firestore')return{FieldValue};if(name==='@/lib/api-auth')return{verifyAdminToken:async()=>({success:true})};if(name==='@/lib/server/employer-auth')return{EmployerApiError:FixtureEmployerApiError,requireEmployerContext:async()=>({uid:'owner',employerId:'owner',orgId:'owner'}),requireEmployerPublishingContext:async()=>({uid:'owner',employerId:'owner',orgId:'owner'})};if(name.includes('featured-job-entitlements'))return featured;if(name==='@/lib/server/admin-job-lifecycle')return load('src/lib/server/admin-job-lifecycle.ts');throw new Error(name);
 }});return exports;}
 const route=load('src/app/api/admin/jobs/route.ts');return{db,employerAction:(method:'PUT'|'DELETE',body={status:'active'} as Record<string,unknown>)=>load('src/app/api/employer/jobs/[id]/route.ts')[method](new Request('http://127.0.0.1/api/employer/jobs/fixture',{method,body:JSON.stringify(body)}),{params:Promise.resolve({id:'fixture'})}),list:()=>route.GET({nextUrl:new URL('http://127.0.0.1/api/admin/jobs')}),action:(action:string,jobId='fixture')=>route.POST(new Request('http://127.0.0.1/api/admin/jobs',{method:'POST',body:JSON.stringify({action,jobId})}))};
}
test('admin deletion keeps authoritative tombstone and closes job mirror', {skip:!enabled},async t=>{
 const {db,action}=await harness(t);await db.doc('jobs/fixture').set({active:false,status:'closed',employerId:'owner'});await db.doc('posts/fixture').set({type:'job',active:true,status:'active',orgId:'owner'});
 assert.equal((await action('delete')).status,200);const job=await db.doc('jobs/fixture').get();const post=await db.doc('posts/fixture').get();assert.equal(job.exists,true);assert.equal(job.data()?.status,'deleted');assert.equal(post.data()?.active,false);assert.equal(mergePublicJobRecords([{id:job.id,...job.data()}],[{id:post.id,...post.data()}]).length,0);
});

test('admin featured activation denies unpaid placement and consumes one credit exactly once',{skip:!enabled},async t=>{
 const {db,action}=await harness(t);await db.doc('employers/owner').set({plan:'free',featuredPostCredits:0});await db.doc('jobs/fixture').set({employerId:'owner',featured:true,status:'draft',active:false});
 assert.equal((await action('activate')).status,400);assert.equal((await db.doc('jobs/fixture').get()).data()?.active,false);
 await db.doc('employers/owner').update({featuredPostCredits:1});assert.equal((await action('activate')).status,200);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,0);assert.equal((await db.doc('jobs/fixture').get()).data()?.featuredCreditConsumed,true);
 assert.equal((await action('activate')).status,200);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,0);
 await action('delete');assert.equal((await action('activate')).status,400);
});

test('deleted tombstones stay out of admin listing and malformed featured flags fail closed',{skip:!enabled},async t=>{
 const {db,action,list}=await harness(t);await db.doc('jobs/fixture').set({active:false,status:'draft',createdAt:new Date(),featured:'true'});
 assert.equal((await action('activate')).status,400);await action('delete');assert.equal((await (await list()).json()).jobs.length,0);
});
test('parallel admin activations cannot spend the same last credit twice',{skip:!enabled},async t=>{
 const {db,action}=await harness(t);await db.doc('employers/owner').set({plan:'free',featuredPostCredits:1});for(const id of ['first','second'])await db.doc('jobs/'+id).set({employerId:'owner',featured:true,status:'draft',active:false});
 const responses=await Promise.all(['first','second'].map(id=>action('activate',id)));assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,0);
});

test('employer cannot reactivate admin tombstone or revive mirror through owner deletion',{skip:!enabled},async t=>{
 const {db,action,employerAction}=await harness(t);await db.doc('employers/owner').set({plan:'free'});await db.doc('jobs/fixture').set({employerId:'owner',managedBy:'employer',status:'active',active:true});await db.doc('posts/fixture').set({type:'job',orgId:'owner',status:'active',active:true});
 await action('delete');assert.equal((await employerAction('PUT')).status,404);assert.equal((await employerAction('DELETE')).status,404);
 await db.doc('jobs/fixture').set({employerId:'owner',managedBy:'employer',status:'active',active:true});await db.doc('posts/fixture').set({type:'job',orgId:'owner',status:'active',active:true});
 assert.equal((await employerAction('DELETE')).status,200);assert.equal((await db.doc('jobs/fixture').get()).data()?.status,'deleted');assert.equal((await db.doc('posts/fixture').get()).data()?.status,'deleted');
});

test('admin deactivation closes both public record surfaces',{skip:!enabled},async t=>{
 const {db,action}=await harness(t);await db.doc('jobs/fixture').set({active:true,status:'active'});await db.doc('posts/fixture').set({type:'job',active:true,status:'active'});
 assert.equal((await action('deactivate')).status,200);assert.equal((await db.doc('posts/fixture').get()).data()?.active,false);assert.equal((await db.doc('posts/fixture').get()).data()?.status,'closed');
});
test('admin activation cannot publish a featured mirror behind a nonfeatured canonical job',{skip:!enabled},async t=>{
 const {db,action}=await harness(t);await db.doc('jobs/fixture').set({employerId:'owner',featured:false,active:false,status:'draft'});await db.doc('posts/fixture').set({type:'job',orgId:'owner',featured:true,active:false,status:'draft'});
 assert.equal((await action('activate')).status,400);assert.equal((await db.doc('posts/fixture').get()).data()?.active,false);
});

test('employer featured edit preserves mirrored placement for later admin activation',{skip:!enabled},async t=>{
 const {db,action,employerAction}=await harness(t);await db.doc('employers/owner').set({plan:'free',featuredPostCredits:1});
 await db.doc('jobs/fixture').set({employerId:'owner',managedBy:'employer',featured:false,active:false,status:'draft'});await db.doc('posts/fixture').set({type:'job',orgId:'owner',featured:false,active:false,status:'draft'});
 assert.equal((await employerAction('PUT',{status:'active',featured:true})).status,200);
 assert.equal((await db.doc('posts/fixture').get()).data()?.featured,true);assert.equal((await db.doc('posts/fixture').get()).data()?.featuredCreditConsumed,true);
 await action('deactivate');assert.equal((await action('activate')).status,200);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,0);
});
test('employer update cannot rewrite another employer job mirror',{skip:!enabled},async t=>{
 const {db,employerAction}=await harness(t);await db.doc('employers/owner').set({plan:'free',featuredPostCredits:1});await db.doc('jobs/fixture').set({employerId:'owner',managedBy:'employer',featured:false,active:false,status:'draft'});await db.doc('posts/fixture').set({type:'job',orgId:'someone-else',featured:false,active:false,status:'draft'});
 assert.equal((await employerAction('PUT',{status:'active',featured:true})).status,409);assert.equal((await db.doc('posts/fixture').get()).data()?.active,false);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,1);
});

test('employer edit cannot silently reconcile contradictory paid placement proof',{skip:!enabled},async t=>{
 const {db,employerAction}=await harness(t);await db.doc('employers/owner').set({plan:'free',featuredPostCredits:1});await db.doc('jobs/fixture').set({employerId:'owner',managedBy:'employer',featured:true,active:false,status:'draft'});await db.doc('posts/fixture').set({type:'job',orgId:'owner',featured:true,featuredCreditConsumed:true,active:false,status:'draft'});
 assert.equal((await employerAction('PUT',{status:'active',featured:true})).status,409);assert.equal((await db.doc('posts/fixture').get()).data()?.featuredCreditConsumed,true);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,1);
});

test('employer included-slot accounting counts each mirrored identity once',{skip:!enabled},async t=>{
 const {db,employerAction}=await harness(t);await db.doc('employers/owner').set({plan:'premium',featuredPostCredits:0});
 for(const id of ['one','two','fixture']) { const active=id!=='fixture';await db.doc('jobs/'+id).set({employerId:'owner',managedBy:'employer',featured:true,active,status:active?'active':'draft'});await db.doc('posts/'+id).set({type:'job',orgId:'owner',featured:true,active,status:active?'active':'draft'}); }
 assert.equal((await employerAction('PUT')).status,200);assert.equal((await db.doc('employers/owner').get()).data()?.featuredPostCredits,0);
});

test('admin activation recovers only bounded closed-transaction failures',{skip:!enabled},async t=>{
 for(const [failures,message,status,remaining] of [[1,'Transaction is invalid or closed.',200,0],[4,'Transaction is invalid or closed.',500,1],[3,'Unrelated invalid argument',500,2]] as const){
  const options={closedFailures:failures as number,message:message as string};const {db,action}=await harness(t,options);await db.doc('jobs/fixture').set({active:false,status:'draft'});
  assert.equal((await action('activate')).status,status);assert.equal(options.closedFailures,remaining);
 }
});

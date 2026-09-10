/* eslint-disable @typescript-eslint/no-explicit-any -- real cron route with demo-only dependencies */
import {execFileSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {randomBytes} from 'node:crypto';import {initializeApp,deleteApp} from 'firebase-admin/app';import {getFirestore} from 'firebase-admin/firestore';import * as expiration from '../src/lib/server/subscription-expiration.ts';
const enabled=process.env.IOPPS_TEST_EMULATORS==='true';
async function harness(t:any,configured=true){process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';const id='demo-exp-'+randomBytes(5).toString('hex');const app=initializeApp({projectId:id},id);const db=getFirestore(app);t.after(async()=>{await db.terminate();await deleteApp(app);});const state={fail:false};
 const bridge=new Proxy(db,{get(target,prop){if(prop==='batch')return()=>{const batch=target.batch();if(state.fail)batch.commit=async()=>{throw new Error('Injected commit failure');};return batch;};if(prop==='runTransaction')return(cb:any)=>target.runTransaction(async tx=>{const wrapped=new Proxy(tx,{get(target,prop){if(prop==='update')return(...args:any[])=>{if(state.fail)throw new Error('Injected transaction failure');return (target.update as any)(...args);};const v=Reflect.get(target,prop);return typeof v==='function'?v.bind(target):v;}});return await cb(wrapped);});const v=Reflect.get(target,prop);return typeof v==='function'?v.bind(target):v;}});
 const exports:any={};vm.runInNewContext(ts.transpileModule(process.env.IOPPS_TEST_BASELINE === 'true' ? execFileSync('git',['show','71853a27afd701a2cd9804f7a04c0ee42fd525e3:src/app/api/cron/check-subscriptions/route.ts'],{encoding:'utf8'}) : readFileSync('src/app/api/cron/check-subscriptions/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console:{log(){},error(){}},Promise,Error,Date,process:{env:configured?{CRON_SECRET:'fictional-cron'}:{}},require:(name:string)=>{if(name==='next/server')return{NextResponse:{json:Response.json}};if(name==='@/lib/firebase-admin')return{getAdminDb:()=>bridge};if(name==='@/lib/server/subscription-expiration')return expiration;throw new Error(name);}});
 return{db,state,run:(authorized=true)=>exports.GET(new Request('http://127.0.0.1/api/cron/check-subscriptions',{headers:authorized?{authorization:'Bearer fictional-cron'}:{}}))};}
test('subscription cron rejects absent secret configuration',{skip:!enabled},async t=>{const h=await harness(t,false);assert.equal((await h.run(false)).status,401);});
test('subscription expiration receipt and downgrade roll back together then retry',{skip:!enabled},async t=>{
 const {db,state,run}=await harness(t);await db.doc('subscriptions/old').set({orgId:'owner',plan:'tier2',status:'active',expiresAt:new Date('2000-01-01')});await db.doc('employers/owner').set({plan:'premium'});await db.doc('organizations/owner').set({plan:'premium'});
 state.fail=true;assert.equal((await run()).status,500);assert.equal((await db.doc('subscriptions/old').get()).data()?.status,'active');assert.equal((await db.doc('employers/owner').get()).data()?.plan,'premium');
 state.fail=false;assert.equal((await run()).status,200);assert.equal((await db.doc('subscriptions/old').get()).data()?.status,'expired');assert.equal((await db.doc('employers/owner').get()).data()?.plan,'free');assert.equal((await run()).status,200);
});

test('a one-time post receipt does not preserve an expired annual plan',{skip:!enabled},async t=>{
 const {db,run}=await harness(t);await db.doc('employers/owner').set({plan:'premium'});await db.doc('subscriptions/old').set({orgId:'owner',plan:'tier2',status:'active',expiresAt:new Date('2000-01-01')});await db.doc('subscriptions/post').set({orgId:'owner',plan:'featured-post',status:'active',expiresAt:null});
 assert.equal((await run()).status,200);assert.equal((await db.doc('employers/owner').get()).data()?.plan,'free');assert.equal((await db.doc('subscriptions/post').get()).data()?.status,'active');
});
test('a concurrent new payment retains its plan when an old receipt expires',{skip:!enabled},async t=>{
 const {db,run}=await harness(t);await db.doc('employers/owner').set({plan:'standard'});await db.doc('subscriptions/old').set({orgId:'owner',plan:'tier1',status:'active',expiresAt:new Date('2000-01-01')});
 const [response]=await Promise.all([run(),db.runTransaction(async tx=>{const ref=db.doc('employers/owner');await tx.get(ref);tx.set(db.doc('subscriptions/new'),{orgId:'owner',plan:'tier2',status:'active',expiresAt:new Date('2999-01-01')});tx.update(ref,{plan:'premium',subscriptionTier:'premium'});})]);
 assert.equal(response.status,200);assert.equal((await db.doc('employers/owner').get()).data()?.plan,'premium');assert.equal((await db.doc('subscriptions/new').get()).data()?.status,'active');assert.equal((await db.doc('subscriptions/old').get()).data()?.status,'expired');
});

test('subscription expiry follows unique legacy organization mapping',{skip:!enabled},async t=>{
 const {db,run}=await harness(t);await db.doc('employers/owner').set({plan:'premium'});await db.doc('organizations/legacy').set({employerId:'owner',plan:'premium'});await db.doc('subscriptions/old').set({orgId:'owner',plan:'tier2',status:'active',expiresAt:new Date('2000-01-01')});
 assert.equal((await run()).status,200);assert.equal((await db.doc('organizations/legacy').get()).data()?.subscriptionTier,'free');
});
test('ambiguous legacy organization mapping cannot partially expire a receipt',{skip:!enabled},async t=>{
 const {db,run}=await harness(t);await db.doc('employers/owner').set({plan:'premium'});for(const id of ['a','b'])await db.doc('organizations/'+id).set({employerId:'owner',plan:'premium'});await db.doc('subscriptions/old').set({orgId:'owner',plan:'tier2',status:'active',expiresAt:new Date('2000-01-01')});
 assert.equal((await run()).status,500);assert.equal((await db.doc('subscriptions/old').get()).data()?.status,'active');assert.equal((await db.doc('employers/owner').get()).data()?.plan,'premium');
});

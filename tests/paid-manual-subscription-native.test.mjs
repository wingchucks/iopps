import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import * as artifacts from '../src/lib/server/admin-subscription-override.ts';
import * as transactionModule from '../src/lib/server/admin-subscription-transaction.ts';
import {resolvePaidPublicationTerm} from '../src/lib/server/paid-job-term.ts';
const enabled=process.env.IOPPS_TEST_EMULATORS==='true';
async function harness(t){
 const app=initializeApp({projectId:'demo-iopps-manual-paid'},crypto.randomUUID());const db=getFirestore(app);
 const id=`manual-${crypto.randomUUID()}`;const emp=db.doc(`employers/${id}`);const org=db.doc(`organizations/${id}`);
 await emp.set({name:'Fictional manual account',standardPostCredits:2});await org.set({employerId:id,name:'Fictional organization'});
 const extraRefs=[];let failPath='';
 const port=new Proxy(db,{get(target,key){if(key==='runTransaction')return fn=>target.runTransaction(async tx=>await fn(new Proxy(tx,{get(transaction,key){if(key==='set')return (ref,...args)=>{if(ref.path===failPath){failPath='';throw Error('Fictional transaction failure');}return transaction.set(ref,...args);};const value=transaction[key];return typeof value==='function'?value.bind(transaction):value;}})));const value=target[key];return typeof value==='function'?value.bind(target):value;}});
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/employers/[orgId]/subscription/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,console,require(id){
 if(id==='@/lib/server/admin-subscription-override')return artifacts;
 if(id==='@/lib/server/admin-subscription-transaction')return transactionModule;
 if(id==='next/server')return {NextResponse:{json:Response.json}};
 if(id==='@/lib/api-auth')return {verifySuperAdminToken:async()=>({success:true,decodedToken:{uid:'fixture-admin'}})};
 if(id==='@/lib/firebase-admin')return {adminDb:port};throw Error(id);
 }});
 const read=async()=>({employer:(await emp.get()).data(),organization:(await org.get()).data(),receipts:(await db.collection('subscriptions').where('orgId','==',id).get()).docs.map(d=>({id:d.id,data:d.data()})),audits:(await emp.collection('actionHistory').get()).docs.map(d=>({id:d.id,data:d.data()}))});
 t.after(async()=>{for(const ref of extraRefs){await ref.delete();assert.equal((await ref.get()).exists,false);}for(const d of (await db.collection('subscriptions').where('orgId','==',id).get()).docs)await d.ref.delete();for(const d of (await emp.collection('actionHistory').get()).docs)await d.ref.delete();await emp.delete();await org.delete();assert.equal((await emp.get()).exists,false);assert.equal((await org.get()).exists,false);assert.equal((await db.collection('subscriptions').where('orgId','==',id).get()).size,0);await db.terminate();await deleteApp(app);});
 const body={planId:'tier1',subscriptionStart:'2026-09-01',subscriptionEnd:'2027-09-01',amount:1250,gstAmount:62.5,totalAmount:1312.5};
 return {db,id,emp,org,body,read,extraRef:path=>{const ref=db.doc(path);extraRefs.push(ref);return ref;},failOnce:path=>{failPath=path;},send:(body)=>exports.POST(new Request('http://localhost/api/admin/subscription',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({orgId:id})})};
}
test('paid pricing manual Standard term initializes receipt-bound usage atomically', {skip:!enabled},async t=>{
 const h=await harness(t);const response=await h.send(h.body);assert.equal(response.status,200);
 const state=await h.read();assert.equal(state.receipts.length,1);
 assert.deepEqual(state.employer.jobPostingUsage,{termId:state.receipts[0].id,used:0});
 assert.equal(state.employer.subscription.termId,state.receipts[0].id);
 assert.equal(resolvePaidPublicationTerm({employerId:h.id,employer:state.employer,receipts:state.receipts,now:new Date('2026-09-24')})?.id,state.receipts[0].id);
 assert.deepEqual(state.organization.subscription,state.employer.subscription);assert.equal(state.audits.length,1);
 await h.emp.update({'jobPostingUsage.used':7});
 const before=await h.read();assert.equal((await h.send(h.body)).status,200);assert.deepEqual(await h.read(),before);
});
const receipt=(h,overrides={})=>({orgId:h.id,plan:'tier1',status:'active',billingCycle:'annual',amount:1250,gstAmount:62.5,totalAmount:1312.5,startsAt:new Date(h.body.subscriptionStart),expiresAt:new Date(h.body.subscriptionEnd),createdAt:new Date('2026-09-01'),...overrides});
async function rejectsUnchanged(h,body,status=409){const before=await h.read();const result=await h.send(body);assert.equal(result.status,status,await result.text());assert.deepEqual(await h.read(),before);}

test('paid pricing manual existing receipt keeps identity and never guesses missing quota', {skip:!enabled},async t=>{
 const h=await harness(t);const id=`legacy-${h.id}`;await h.db.doc(`subscriptions/${id}`).set(receipt(h));
 for(const usage of [undefined,{termId:id,used:-1},{termId:'other',used:3},{termId:id,used:1.5}]){
   if(usage)await h.emp.update({jobPostingUsage:usage});await rejectsUnchanged(h,h.body);
 }
 await h.emp.update({jobPostingUsage:{termId:id,used:18}});
 assert.equal((await h.send({...h.body,createSubscriptionRecord:false})).status,200);
 const state=await h.read();assert.equal(state.receipts.length,1);assert.equal(state.employer.subscription.termId,id);assert.equal(state.employer.jobPostingUsage.used,18);
 await rejectsUnchanged(h,{...h.body,amount:1200,totalAmount:1262.5});
});

test('paid pricing receiptless manual terms preserve synthetic identity and disallow conversion', {skip:!enabled},async t=>{
 const h=await harness(t);const body={...h.body,createSubscriptionRecord:false};
 assert.equal((await h.send(body)).status,200);let state=await h.read();
 const identity=`manual:${h.id}:tier1:2026-09-01T00:00:00.000Z:2027-09-01T00:00:00.000Z`;
 assert.equal(state.receipts.length,0);assert.equal(state.employer.subscription.termId,undefined);assert.equal(state.employer.jobPostingUsage.termId,identity);
 assert.equal(resolvePaidPublicationTerm({employerId:h.id,employer:state.employer,receipts:[],now:new Date('2026-09-24')})?.id,identity);
 await h.emp.update({'jobPostingUsage.used':9});assert.equal((await h.send(body)).status,200);assert.equal((await h.read()).employer.jobPostingUsage.used,9);
 await rejectsUnchanged(h,h.body);
});

test('paid pricing manual forward renewal preserves old receipt and clears stale projection', {skip:!enabled},async t=>{
 const h=await harness(t);const id=`old-${h.id}`;const old=receipt(h,{startsAt:new Date('2025-09-01'),expiresAt:new Date('2026-09-01')});
 await h.db.doc(`subscriptions/${id}`).set(old);const oldReceipt=(await h.db.doc(`subscriptions/${id}`).get()).data();
 await h.emp.update({subscriptionStart:'2025-09-01',billingStartAt:'2025-09-01',subscriptionEnd:'2026-09-01',subscription:{tier:'standard',termId:id,paymentId:'admin-grant-tier1',billingStartAt:'2025-09-01',subscriptionEnd:'2026-09-01',bonusAccessEndsAt:'2025-09-01'},bonusAccessEndsAt:'2025-09-01',jobPostingUsage:{termId:id,used:14}});
 assert.equal((await h.send(h.body)).status,200);const state=await h.read();
 assert.equal(state.receipts.length,2);assert.equal(state.employer.jobPostingUsage.used,0);assert.equal(state.employer.standardPostCredits,2);assert.equal(state.employer.bonusAccessEndsAt,undefined);assert.equal(state.employer.subscription.bonusAccessEndsAt,undefined);
 assert.deepEqual((await h.db.doc(`subscriptions/${id}`).get()).data(),oldReceipt);
 await rejectsUnchanged(h,{...h.body,subscriptionStart:'2025-09-01',subscriptionEnd:'2026-09-01'},400);
});

test('paid pricing manual overlap duplicate financial conflict and future replacement reject atomically', {skip:!enabled},async t=>{
 const h=await harness(t);assert.equal((await h.send(h.body)).status,200);
 for(const body of [{...h.body,subscriptionStart:'2026-09-02'},{...h.body,subscriptionEnd:'2027-10-01'},{...h.body,planId:'tier2',amount:2500,gstAmount:125,totalAmount:2625},{...h.body,subscriptionStart:'2027-09-01',subscriptionEnd:'2028-09-01',bonusAccessGrantedAt:'2026-09-01',bonusAccessEndsAt:'2027-09-01'}])await rejectsUnchanged(h,body);
 await h.db.doc(`subscriptions/duplicate-${h.id}`).set(receipt(h));await rejectsUnchanged(h,h.body);
});

test('paid pricing manual mapping is authoritative and write failure has no partial grant', {skip:!enabled},async t=>{
 const h=await harness(t);await h.org.delete();await rejectsUnchanged(h,h.body);
 const stranger=h.extraRef(`organizations/stranger-${h.id}`);await stranger.set({name:'Fictional manual account',slug:'same-name'});await rejectsUnchanged(h,h.body);
 const linked=h.extraRef(`organizations/linked-${h.id}`);await linked.set({employerId:h.id});
 h.failOnce(linked.path);await rejectsUnchanged(h,h.body,500);assert.equal((await linked.get()).data().subscription,undefined);
 await h.org.set({employerId:h.id});await rejectsUnchanged(h,h.body);
 await h.org.set({employerId:'foreign'});await rejectsUnchanged(h,h.body);
 await h.org.delete();assert.equal((await h.send(h.body)).status,200);const state=await h.read();assert.equal(state.receipts[0].data.organizationId,linked.id);assert.equal(state.receipts[0].data.orgId,h.id);
});

test('paid pricing manual input rejects invalid annual grants and preserves complimentary nonpayment', {skip:!enabled},async t=>{
 const h=await harness(t);
 for(const body of [{...h.body,billingCycle:'one-time'},{...h.body,subscriptionTier:'premium'},{...h.body,amount:-1},{...h.body,totalAmount:0},{...h.body,bonusAccessEndsAt:'not-date'},{...h.body,subscriptionStart:'2027-10-01'},{...h.body,subscriptionEnd:'2026-08-01'}])await rejectsUnchanged(h,body,400);
 assert.equal((await h.send({...h.body,amount:0,gstAmount:0,totalAmount:0})).status,200);
 const state=await h.read();assert.equal(state.employer.jobPostingUsage,undefined);assert.equal(resolvePaidPublicationTerm({employerId:h.id,employer:state.employer,receipts:state.receipts,now:new Date('2026-09-24')}),null);
});
test('paid pricing manual review rejects replay drift on both projections and audit identity', {skip:!enabled},async t=>{
 for(const [target,patch] of [['emp',{'subscription.status':'expired'}],['emp',{subscriptionEnd:'2028-09-01'}],['org',{'subscription.termId':'other-term'}],['emp',{'subscription.gstAmount':999}],['audit',{termId:'other-term'}]]){
  await t.test(target+JSON.stringify(patch),async t=>{const h=await harness(t);const body={...h.body,planId:'tier2',amount:2500,gstAmount:125,totalAmount:2625};assert.equal((await h.send(body)).status,200);
   const ref=target==='audit'?h.emp.collection('actionHistory').doc((await h.read()).audits[0].id):h[target];await ref.update(patch);await rejectsUnchanged(h,body);
  });
 }
});
test('paid pricing manual review protects conflicting organization terms and overlapping grants', {skip:!enabled},async t=>{
 const h=await harness(t);
 await h.org.update({subscription:{tier:'premium',billingStartAt:'2026-10-01',subscriptionEnd:'2027-10-01',paymentId:'admin-manual-tier2',amountPaid:2500}});
 await rejectsUnchanged(h,h.body);
 await h.org.set({employerId:h.id});
 await h.emp.update({subscription:{tier:'premium',billingStartAt:'2026-01-01',subscriptionEnd:'2027-01-01',paymentId:'admin-grant-tier2',amountPaid:0}});
 await rejectsUnchanged(h,h.body);
});
test('paid pricing manual review preserves receiptless money and retired School payment kind', {skip:!enabled},async t=>{
 for(const [plan,paymentId,amount,requested] of [['premium','admin-manual-tier2',2500,1],['premium','admin-manual-tier2',2500,0],['school',undefined,undefined,5500],['school','admin-grant-tier3',0,5500]]){
  await t.test(plan+String(amount)+String(requested),async t=>{const h=await harness(t);
   await h.emp.update({subscription:{tier:plan,billingStartAt:'2026-09-01',subscriptionEnd:'2027-09-01',...(paymentId?{paymentId,amountPaid:amount,gstAmount:amount*.05,totalAmount:amount*1.05}:{})}});
   await rejectsUnchanged(h,{...h.body,planId:plan==='premium'?'tier2':'tier3',createSubscriptionRecord:false,amount:requested,gstAmount:0,totalAmount:requested});
  });
 }
});
test('paid pricing manual review rejects receipt bound to another organization', {skip:!enabled},async t=>{
 const h=await harness(t);const body={...h.body,planId:'tier2',amount:2500,gstAmount:125,totalAmount:2625};
 await h.db.doc(`subscriptions/foreign-org-${h.id}`).set(receipt(h,{plan:'tier2',amount:2500,gstAmount:125,totalAmount:2625,organizationId:'another-org'}));
 await rejectsUnchanged(h,body);
});
test('paid pricing first manual subscription accepts normal free signup defaults', {skip:!enabled},async t=>{
 const h=await harness(t);await h.emp.update({plan:'free',subscriptionTier:'free'});await h.org.update({plan:'free',subscriptionTier:'free'});
 assert.equal((await h.send(h.body)).status,200);assert.equal((await h.read()).employer.jobPostingUsage.used,0);
});
test('paid pricing manual historical financial disagreement is not reconciled implicitly', {skip:!enabled},async t=>{
 const h=await harness(t);const common={tier:'premium',billingStartAt:'2026-09-01',subscriptionEnd:'2027-09-01'};
 await h.emp.update({subscription:{...common,paymentId:'admin-manual-tier2',amountPaid:2500,gstAmount:125,totalAmount:2625}});
 await h.org.update({subscription:{...common,paymentId:'admin-grant-tier2',amountPaid:0,gstAmount:0,totalAmount:0}});
 await rejectsUnchanged(h,{...h.body,planId:'tier2',createSubscriptionRecord:false,amount:2500,gstAmount:125,totalAmount:2625});
});
test('paid pricing matching School receipt cannot override contradictory grant evidence', {skip:!enabled},async t=>{
 const h=await harness(t);await h.emp.update({subscription:{tier:'school',billingStartAt:'2026-09-01',subscriptionEnd:'2027-09-01',paymentId:'admin-grant-tier3',amountPaid:0,gstAmount:0,totalAmount:0}});
 await h.db.doc(`subscriptions/school-${h.id}`).set(receipt(h,{plan:'tier3',amount:5500,gstAmount:275,totalAmount:5775}));
 await rejectsUnchanged(h,{...h.body,planId:'tier3',amount:5500,gstAmount:275,totalAmount:5775});
});
test('paid pricing legacy missing tax evidence preserves entitlement but refuses implicit backfill', {skip:!enabled},async t=>{
 const h=await harness(t);const subscription={tier:'premium',status:'active',billingStartAt:'2026-09-01',subscriptionEnd:'2027-09-01',paymentId:'admin-manual-tier2',amountPaid:2500};
 await h.emp.update({subscription});
 const state=await h.read();assert.equal(resolvePaidPublicationTerm({employerId:h.id,employer:state.employer,receipts:[],now:new Date('2026-09-24')})?.tier,'premium');
 await rejectsUnchanged(h,{...h.body,planId:'tier2',createSubscriptionRecord:false,amount:2500,gstAmount:125,totalAmount:2625});
});

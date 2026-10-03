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
import {expireSubscriptionAtomically,buildEndedSubscriptionAccessPatch} from '../src/lib/server/subscription-expiration.ts';
import {memoryFirestore} from './helpers/memory-firestore.mjs';

// Runs against the Firestore emulator in CI and against the in-memory transaction double locally.
const emulator=process.env.IOPPS_TEST_EMULATORS==='true';
const DAY=86400000;
const iso=ms=>new Date(ms).toISOString();
async function harness(t){
 let db,app;const refreshes={count:0};
 if(emulator){app=initializeApp({projectId:'demo-iopps-admin-repair'},crypto.randomUUID());db=getFirestore(app);}
 else db=memoryFirestore().db;
 const id=`repair-${crypto.randomUUID()}`;const emp=db.doc(`employers/${id}`);const org=db.doc(`organizations/${id}`);
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/admin/employers/[orgId]/subscription/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,console,require(name){
  if(name==='@/lib/server/admin-subscription-override')return artifacts;
  if(name==='@/lib/server/admin-subscription-transaction')return transactionModule;
  if(name==='next/server')return {NextResponse:{json:Response.json}};
  if(name==='@/lib/api-auth')return {verifySuperAdminToken:async()=>({success:true,decodedToken:{uid:'fixture-admin'}})};
  if(name==='@/lib/firebase-admin')return {adminDb:db};
  if(name==='@/lib/public-partner-cache')return {refreshPublicPartners:()=>{refreshes.count++;}};throw Error(name);
 }});
 const receipts=async()=>{const seen=new Map();for(const field of ['orgId','employerId'])for(const d of (await db.collection('subscriptions').where(field,'==',id).get()).docs)seen.set(d.id,{id:d.id,data:d.data()});return [...seen.values()];};
 const read=async()=>({employer:(await emp.get()).data(),organization:(await org.get()).data(),receipts:await receipts(),audits:(await emp.collection('actionHistory').get()).docs.map(d=>({id:d.id,data:d.data()}))});
 // One hook, in this order: delete the fixtures while the client is open, then close it.
 // A query on a terminated client never settles, which held the emulator run open.
 if(emulator) t.after(async()=>{
  try{for(const r of await receipts())await db.doc(`subscriptions/${r.id}`).delete();for(const d of (await emp.collection('actionHistory').get()).docs)await d.ref.delete();await emp.delete();await org.delete();}
  finally{await db.terminate();await deleteApp(app);}
 });
 const send=body=>exports.POST(new Request('http://localhost/api/admin/subscription',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({orgId:id})});
 const resolve=async(at=new Date())=>{const state=await read();return resolvePaidPublicationTerm({employerId:id,employer:state.employer,receipts:state.receipts,now:at});};
 return {db,id,emp,org,read,send,resolve,refreshes};
}
const now=Date.now();
const premium=(start,end)=>({planId:'tier2',subscriptionStart:iso(start),subscriptionEnd:iso(end),amount:2500,gstAmount:125,totalAmount:2625});

test('a normally signed-up organization (plan: null) can be given its first manual plan',async t=>{
 const h=await harness(t);
 await h.emp.set({name:'Fictional signup',plan:'free',subscriptionTier:'free'});await h.org.set({name:'Fictional signup',type:'business',plan:null});
 const response=await h.send(premium(now-DAY,now+364*DAY));assert.equal(response.status,200,await response.clone().text());
 assert.equal((await h.read()).organization.plan,'premium');assert.equal((await h.resolve())?.tier,'premium');
 assert.equal(h.refreshes.count,1,'the partner cards are refreshed after the plan is saved');
});

test('a customer lapsed by the daily check can be given a new term despite retained old dates',async t=>{
 const h=await harness(t);
 const oldStart=now-400*DAY,oldEnd=now-35*DAY;
 const projection={plan:'standard',subscriptionTier:'standard',subscriptionStatus:'active',subscriptionStart:iso(oldStart),billingStartAt:iso(oldStart),subscriptionEnd:iso(oldEnd),
  subscription:{tier:'standard',status:'active',billingStartAt:iso(oldStart),subscriptionEnd:iso(oldEnd),termId:`old-${h.id}`}};
 await h.emp.set({name:'Fictional lapsed',...projection});await h.org.set({name:'Fictional lapsed',employerId:h.id,...projection});
 await h.db.doc(`subscriptions/old-${h.id}`).set({orgId:h.id,employerId:h.id,organizationId:h.id,plan:'tier1',status:'active',amount:1250,gstAmount:62.5,totalAmount:1312.5,billingCycle:'annual',startsAt:new Date(oldStart),createdAt:new Date(oldStart),expiresAt:new Date(oldEnd)});
 assert.equal(await expireSubscriptionAtomically(h.db,`old-${h.id}`,new Date()),true);
 const lapsed=await h.read();assert.equal(lapsed.employer.plan,'free');assert.equal(lapsed.organization.plan,null);assert.ok(lapsed.employer.subscriptionStart,'historical dates are retained');
 const response=await h.send(premium(now-DAY,now+364*DAY));assert.equal(response.status,200,await response.clone().text());
 assert.equal((await h.resolve())?.tier,'premium');
});

test('a lapsed projection the daily check has not processed yet is not a current term',async t=>{
 const h=await harness(t);
 const projection={plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:iso(now-370*DAY),billingStartAt:iso(now-370*DAY),subscriptionEnd:iso(now-5*DAY)};
 await h.emp.set({name:'Fictional',...projection});await h.org.set({employerId:h.id,...projection});
 assert.equal((await h.send(premium(now-DAY,now+364*DAY))).status,200);
});

test('a current paid term still refuses overlapping or contradictory replacements',async t=>{
 const h=await harness(t);
 await h.emp.set({name:'Fictional'});await h.org.set({employerId:h.id});
 assert.equal((await h.send(premium(now-10*DAY,now+355*DAY))).status,200);
 const before=await h.read();
 const refreshed=h.refreshes.count;
 for(const body of [premium(now-5*DAY,now+360*DAY),{...premium(now-10*DAY,now+355*DAY),planId:'tier1',amount:1250,gstAmount:62.5,totalAmount:1312.5}]) {
  const response=await h.send(body);assert.equal(response.status,409,await response.clone().text());
 }
 assert.deepEqual(await h.read(),before);assert.equal(h.refreshes.count,refreshed,'a refused override changes nothing public');
 // A manual receipt is not trusted over a contradictory projection, even for its own exact term.
 await h.emp.update({billingStartAt:iso(now-200*DAY)});
 const contradictory=await h.send(premium(now-10*DAY,now+355*DAY));
 assert.equal(contradictory.status,409);assert.match((await contradictory.json()).error,/Contradictory/);
});

test('pre-release Stripe payments merged over a grant are repaired from the paid receipt',async t=>{
 const h=await harness(t);
 const start=now-40*DAY,end=now+325*DAY,receiptId=`cs_live_${h.id.replace(/-/g,'_')}`;
 const stale={plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:new Date(start),subscriptionEnd:new Date(end),
  billingStartAt:iso(now-90*DAY),bonusAccessGrantedAt:iso(now-90*DAY),bonusAccessReason:'Bonus early access before paid term begins',
  subscription:{tier:'premium',status:'active',billingStartAt:new Date(start),subscriptionEnd:new Date(end),expiresAt:iso(now-60*DAY),paymentId:'admin-grant-tier2',amountPaid:0,gstAmount:0,totalAmount:0,bonusAccessGrantedAt:iso(now-90*DAY),bonusAccessEndsAt:iso(now-90*DAY)}};
 await h.emp.set({name:'Fictional pre-release buyer',...stale});await h.org.set({name:'Fictional pre-release buyer',employerId:h.id,plan:'premium',subscriptionTier:'premium',subscription:{tier:'premium',paymentId:'admin-grant-tier2',amountPaid:0,billingStartAt:iso(now-90*DAY),subscriptionEnd:iso(now-60*DAY)}});
 await h.db.doc(`subscriptions/${receiptId}`).set({orgId:h.id,employerId:h.id,organizationId:h.id,plan:'tier2',status:'active',amount:2500,gstAmount:125,totalAmount:2625,billingCycle:'annual',kind:'subscription',stripeSessionId:receiptId,stripePaymentIntent:'pi_fictional',createdAt:new Date(start),expiresAt:new Date(end)});
 assert.equal((await h.resolve())?.id,receiptId,'publication already trusts the paid receipt');
 const response=await h.send(premium(start,end));assert.equal(response.status,200,await response.clone().text());
 const state=await h.read();
 assert.equal(state.receipts.length,1);assert.equal(state.employer.subscription.termId,receiptId);assert.equal(state.employer.subscription.paymentId,receiptId);
 assert.equal(state.employer.bonusAccessGrantedAt,undefined);assert.equal(state.employer.billingStartAt,iso(start));
 assert.deepEqual(state.organization.subscription,state.employer.subscription);
 assert.equal(state.audits[0].data.repairedFromReceipt,receiptId);
 assert.equal((await h.resolve())?.id,receiptId);
 assert.equal((await h.send(premium(start,end))).status,200,'replay stays idempotent');
 // Amounts on a paid receipt remain immutable.
 assert.equal((await h.send({...premium(start,end),amount:2000,gstAmount:100,totalAmount:2100})).status,409);
});

test('a pre-release Standard buyer without a usage counter can be repaired and explicitly reconciled',async t=>{
 const h=await harness(t);
 const start=now-200*DAY,end=now+165*DAY,receiptId=`cs_live_${h.id.replace(/-/g,'_')}`;
 const projection={plan:'standard',subscriptionTier:'standard',subscriptionStatus:'active',subscriptionStart:new Date(start),subscriptionEnd:new Date(end),billingStartAt:iso(now-300*DAY),
  subscription:{tier:'standard',status:'active',billingStartAt:new Date(start),subscriptionEnd:new Date(end),paymentId:'admin-grant-tier1',amountPaid:0}};
 await h.emp.set({name:'Fictional Standard buyer',...projection});await h.org.set({employerId:h.id});
 await h.db.doc(`subscriptions/${receiptId}`).set({orgId:h.id,employerId:h.id,plan:'tier1',status:'active',amount:1250,gstAmount:62.5,totalAmount:1312.5,billingCycle:'annual',kind:'subscription',stripeSessionId:receiptId,createdAt:new Date(start),expiresAt:new Date(end)});
 const body={planId:'tier1',subscriptionStart:iso(start),subscriptionEnd:iso(end),amount:1250,gstAmount:62.5,totalAmount:1312.5};
 assert.equal((await h.send(body)).status,200);
 assert.equal((await h.read()).employer.jobPostingUsage,undefined,'no guessed number is written; publication counts the term');
 const reconciled=await h.send({...body,jobPostingUsed:6});
 assert.equal(reconciled.status,200);assert.equal((await reconciled.json()).usageReconciled,true);
 const state=await h.read();
 assert.deepEqual(state.employer.jobPostingUsage,{termId:receiptId,used:6});
 assert.ok(state.audits.some(a=>a.data.action==='standard_usage_reconciliation' && a.data.used===6));
 assert.equal((await h.send({...body,jobPostingUsed:6})).status,200);
 assert.equal((await h.send({...body,planId:'tier2',subscriptionTier:'standard'})).status,400);
 assert.equal((await h.send({...premium(now-DAY,now+364*DAY),jobPostingUsed:2})).status,400,'usage applies only to a paid Standard term');
});

test('a refunded payment no longer blocks a replacement term as an overlapping paid term',async t=>{
 const h=await harness(t);
 const start=now-20*DAY,end=now+345*DAY,receiptId=`cs_live_${h.id.replace(/-/g,'_')}`;
 const projection={plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:new Date(start),billingStartAt:new Date(start),subscriptionEnd:new Date(end),
  subscription:{tier:'premium',status:'active',billingStartAt:new Date(start),subscriptionEnd:new Date(end),termId:receiptId}};
 await h.emp.set({name:'Fictional',...projection});await h.org.set({employerId:h.id,...projection});
 await h.db.doc(`subscriptions/${receiptId}`).set({orgId:h.id,employerId:h.id,organizationId:h.id,plan:'tier2',status:'active',amount:2500,gstAmount:125,totalAmount:2625,billingCycle:'annual',stripeSessionId:receiptId,createdAt:new Date(start),expiresAt:new Date(end)});
 assert.equal((await h.send(premium(now-DAY,now+364*DAY))).status,409,'an active paid term is protected');
 const ended=buildEndedSubscriptionAccessPatch(new Date(),'refunded');
 await h.emp.set(ended,{merge:true});await h.org.set({...ended,plan:null},{merge:true});
 await h.db.doc(`subscriptions/${receiptId}`).update({status:'refunded'});
 const response=await h.send(premium(now-DAY,now+364*DAY));assert.equal(response.status,200,await response.clone().text());
 assert.equal((await h.resolve())?.tier,'premium');
});

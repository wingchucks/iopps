/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as pricing from '../src/lib/pricing.ts';
import * as intent from '../src/lib/auth-redirect.ts';
import * as publicationFirestore from '../src/lib/server/paid-job-publication-firestore.ts';
import * as publicationReader from '../src/lib/server/paid-job-publication-reader.ts';
import { memoryFirestore } from './helpers/memory-firestore.mjs';
function load(context: any = {uid:'org',orgId:'org',employerId:'org',orgRole:'owner'}, authStatus = 0, seed: Record<string, unknown> = {'employers/org':{name:'Fictional org'}}) {
 const calls: any[]=[];
 const memory=memoryFirestore(seed);
 class EmployerApiError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status} }
 const exports:any={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/stripe/checkout/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,URLSearchParams,console,Date,process:{env:{STRIPE_SECRET_KEY:'sk_test_fictional'}},require:(id:string)=>{
  if(id==='next/server') return {NextResponse:{json:(b:unknown,i?:ResponseInit)=>Response.json(b,i)}};
  if(id==='stripe')return {default:class {checkout={sessions:{create:async(p:unknown)=>{calls.push(p);return {url:'https://checkout.stripe.com/fictional'}}}}}};
  if(id==='@/lib/pricing')return pricing;
  if(id==='@/lib/auth-redirect')return intent;
  if(id==='@/lib/firebase-admin')return {getAdminDb:()=>memory.db};
  if(id==='@/lib/server/paid-job-publication-firestore')return publicationFirestore;
  if(id==='@/lib/server/paid-job-publication-reader')return publicationReader;
  if(id==='@/lib/server/employer-auth')return {EmployerApiError,requireEmployerContext:async(req:Request)=>{if(authStatus || !req.headers.has('authorization'))throw new EmployerApiError(authStatus||401,'Unauthorized');return context;}};
  throw Error(id);
 }});
 return {calls,memory,post:(body:unknown,authorized=true)=>exports.POST(new Request('https://www.iopps.ca/api/stripe/checkout',{method:'POST',headers:{origin:'https://attacker.example',...(authorized?{authorization:'Bearer fictional'}:{})},body:JSON.stringify(body)})),
  get:(authorized=true)=>exports.GET(new Request('https://www.iopps.ca/api/stripe/checkout',{headers:authorized?{authorization:'Bearer fictional'}:{}}))};
}
test('checkout validates exact plans and constructs trusted safe continuation URLs',async()=>{
 for(const planId of [undefined,'constructor','toString','__proto__',[],123,'invalid','tier3','program-post']) {
  const a=load();assert.equal((await a.post({planId})).status,400);assert.equal(a.calls.length,0);
 }
 const a=load();assert.equal((await a.post({planId:'featured-post',redirect:'/org/dashboard/jobs/new'})).status,200);
 assert.equal(a.calls[0].metadata.orgId,'org');
 const success=new URL(a.calls[0].success_url);assert.equal(success.origin,'https://www.iopps.ca');assert.equal(success.searchParams.get('redirect'),'/org/dashboard/jobs/new');
 assert.equal(new URL(a.calls[0].cancel_url).searchParams.get('redirect'),'/org/dashboard/jobs/new');
 const b=load();await b.post({planId:'tier1',redirect:'//attacker.example'});assert.equal(new URL(b.calls[0].success_url).searchParams.has('redirect'),false);
 const standard=load();assert.equal((await standard.post({planId:'standard-post',amount:1,durationDays:999})).status,200);
 assert.equal(standard.calls[0].line_items[0].price_data.unit_amount,12500);
 assert.equal(standard.calls[0].line_items[0].price_data.currency,'cad');
 assert.match(pricing.ONE_TIME_PLANS['standard-post'].shortDescription,/30 days/);
 assert.equal(pricing.getPlanById('constructor'),null);
});
test('checkout UI wiring never defaults a plan and carries authenticated return intent',()=>{
 const checkout=readFileSync('src/app/org/checkout/page.tsx','utf8');
 assert.doesNotMatch(checkout,/params\.plan \|\| "tier1"|: plans\.tier1/);
 assert.match(checkout,/getIdToken/);assert.match(checkout,/Authorization/);assert.match(checkout,/redirect/);
 const success=readFileSync('src/app/org/checkout/success/page.tsx','utf8');
 assert.match(success,/safeAuthRedirect/);assert.doesNotMatch(success,/has been activated|has been added/);
 assert.match(readFileSync('src/app/org/checkout/cancel/page.tsx','utf8'),/authIntentHref/);
});
test('checkout rejects forged profile organization linkage even when role says owner',async()=>{
 const a=load({uid:'attacker',orgId:'org',orgRole:'owner'});
 assert.equal((await a.post({planId:'tier1'})).status,403);assert.equal(a.calls.length,0);
});
test('checkout denies unauthenticated and mismatched organization before Stripe',async()=>{
 const a=load();assert.equal((await a.post({planId:'tier1',orgId:'org'},false)).status,401);assert.equal(a.calls.length,0);
 const b=load();assert.equal((await b.post({planId:'tier1',orgId:'victim'})).status,403);assert.equal(b.calls.length,0);
});

const DAY=86400000;
function paidAccount(start:number,end:number,overrides:any={}) {
 const projection={name:'Fictional org',plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:new Date(start),billingStartAt:new Date(start),subscriptionEnd:new Date(end),
  subscription:{tier:'premium',status:'active',billingStartAt:new Date(start),subscriptionEnd:new Date(end),termId:'cs_current'}};
 return {'employers/org':{...projection,...overrides},'organizations/org':projection,
  'subscriptions/cs_current':{orgId:'org',employerId:'org',plan:'tier2',status:'active',amount:2500,gstAmount:125,totalAmount:2625,billingCycle:'annual',stripeSessionId:'cs_current',startsAt:new Date(start),createdAt:new Date(start),expiresAt:new Date(end)}};
}
test('an active paid annual term is never repurchased mid-term; plan changes go through support',async()=>{
 const now=Date.now();const seed=paidAccount(now-100*DAY,now+265*DAY);
 const same=load(undefined,0,seed);const sameResponse=await same.post({planId:'tier2'});
 assert.equal(sameResponse.status,409);const sameBody=await sameResponse.json();
 assert.equal(sameBody.reason,'current_plan');assert.match(sameBody.error,/Renewal opens/);assert.equal(same.calls.length,0);
 const change=load(undefined,0,seed);const changeResponse=await change.post({planId:'tier1'});
 assert.equal(changeResponse.status,409);assert.match((await changeResponse.json()).error,/Contact us .* to change plans/);assert.equal(change.calls.length,0);
 const credit=load(undefined,0,seed);assert.equal((await credit.post({planId:'featured-post'})).status,200,'single postings stay purchasable');
 const {billing}=await (await load(undefined,0,seed).get()).json();
 assert.equal(billing.paidTerm.id,'cs_current');assert.equal(billing.annualPlans.tier2.reason,'current_plan');assert.match(billing.annualPlans.tier2.label,/^Current plan · ends /);
 assert.equal(billing.annualPlans.tier1.reason,'plan_change');assert.equal(billing.canPurchase,true);
});
test('same-tier renewal opens for the last 60 days and a paid renewal blocks another annual purchase',async()=>{
 const now=Date.now();const seed=paidAccount(now-320*DAY,now+45*DAY);
 const renew=load(undefined,0,seed);assert.equal((await renew.post({planId:'tier2'})).status,200);assert.equal(renew.calls[0].metadata.planId,'tier2');
 const {billing}=await (await load(undefined,0,seed).get()).json();
 assert.equal(billing.annualPlans.tier2.kind,'renewal');assert.equal(billing.annualPlans.tier2.startsAt,new Date(now+45*DAY).toISOString());
 assert.equal(billing.annualPlans.tier2.endsAt,pricing.addOneCalendarYear(new Date(now+45*DAY)).toISOString());
 assert.equal((await load(undefined,0,seed).post({planId:'tier1'})).status,409);
 const queued={...seed,'subscriptions/cs_renewal':{orgId:'org',employerId:'org',plan:'tier2',status:'active',amount:2500,billingCycle:'annual',stripeSessionId:'cs_renewal',renewalOf:'cs_current',startsAt:new Date(now+45*DAY),createdAt:new Date(now),expiresAt:pricing.addOneCalendarYear(new Date(now+45*DAY))}};
 for(const planId of ['tier1','tier2']) {const response=await load(undefined,0,queued).post({planId});assert.equal(response.status,409);assert.equal((await response.json()).reason,'renewal_scheduled');}
 assert.equal((await (await load(undefined,0,queued).get()).json()).billing.renewal.id,'cs_renewal');
});
test('complimentary access does not block buying a paid plan and is reported truthfully',async()=>{
 const now=Date.now();
 const grant={name:'Fictional org',plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:new Date(now-DAY),billingStartAt:new Date(now-DAY),subscriptionEnd:new Date(now+300*DAY),
  subscription:{tier:'premium',status:'active',billingStartAt:new Date(now-DAY),subscriptionEnd:new Date(now+300*DAY),paymentId:'admin-grant-tier2',amountPaid:0,gstAmount:0,totalAmount:0}};
 const a=load(undefined,0,{'employers/org':grant});assert.equal((await a.post({planId:'tier2'})).status,200);
 const {billing}=await (await load(undefined,0,{'employers/org':grant}).get()).json();
 assert.equal(billing.plan,'free');assert.equal(billing.paidTerm,null);assert.equal(billing.complimentary.tier,'premium');assert.equal(billing.annualPlans.tier2.kind,'new');
});
test('checkout never charges into an employer document publication does not read',async()=>{
 const mismatch=load({uid:'org',orgId:'org',employerId:'legacy-employer',orgRole:'owner'},0,{'employers/legacy-employer':{name:'Legacy'},'employers/org':{name:'Org'}});
 const response=await mismatch.post({planId:'standard-post'});assert.equal(response.status,409);assert.equal((await response.json()).reason,'billing_review');assert.equal(mismatch.calls.length,0);
 // Primary document missing: publication and fulfillment both use employers/{orgId}.
 const fallback=load({uid:'org',orgId:'org',employerId:'legacy-employer',orgRole:'owner'},0,{'employers/org':{name:'Org'}});
 assert.equal((await fallback.post({planId:'standard-post'})).status,200);
 const none=load({uid:'org',orgId:'org',employerId:'org',orgRole:'owner'},0,{'organizations/org':{name:'Org only',plan:null}});
 assert.equal((await none.post({planId:'tier1'})).status,200,'an organization-only account buys its first plan');
});
test('unresolvable paid evidence waits for review before another annual purchase',async()=>{
 const now=Date.now();const seed=paidAccount(now-100*DAY,now+265*DAY,{billingStartAt:new Date(now-150*DAY),subscription:{tier:'premium',status:'active',billingStartAt:new Date(now-150*DAY),subscriptionEnd:new Date(now+265*DAY),termId:'another'}});
 const response=await load(undefined,0,seed).post({planId:'tier2'});
 assert.equal(response.status,409);assert.equal((await response.json()).reason,'billing_review');
 assert.equal((await load(undefined,0,seed).post({planId:'standard-post'})).status,200);
 const member=await (await load({uid:'member',orgId:'org',employerId:'org',orgRole:'member'},0,seed).get()).json();
 assert.equal(member.billing.canPurchase,false);assert.equal(member.billing.reviewRequired,true);
 assert.equal((await load(undefined,0,seed).get(false)).status,401);
});

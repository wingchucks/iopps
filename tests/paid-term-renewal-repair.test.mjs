import test from 'node:test';
import assert from 'node:assert/strict';
import {fundedAnnualTermIds,renewalChain,resolvePaidPublicationTerm} from '../src/lib/server/paid-job-term.ts';
import {decidePaidPublication} from '../src/lib/server/paid-job-publication.ts';
import {preparePaidPublication} from '../src/lib/server/paid-job-publication-reader.ts';

const now=new Date('2026-09-29T18:00:00Z');
const start=new Date('2026-03-15T17:22:05.000Z'),end=new Date('2027-03-15T17:22:05.000Z');
const stripe=(overrides={})=>({id:'cs_live_fictional',data:{orgId:'org1',employerId:'org1',plan:'tier1',status:'active',amount:1250,gstAmount:62.5,totalAmount:1312.5,
 billingCycle:'annual',kind:'subscription',stripeSessionId:'cs_live_fictional',stripePaymentIntent:'pi_fictional',createdAt:start,expiresAt:end,...overrides}});
const resolve=(employer,receipts=[stripe()],at=now)=>resolvePaidPublicationTerm({employerId:'org1',employer,receipts,now:at});

test('pre-release Sep 9-24 payments merged over an admin grant still resolve to the paid Stripe term',()=>{
 // Webhook merge kept the grant's paymentId, bonus fields and expiresAt; a stale top-level billingStartAt remained.
 const employer={plan:'standard',subscriptionTier:'standard',subscriptionStatus:'active',subscriptionStart:start,subscriptionEnd:end,
  billingStartAt:'2026-02-01T00:00:00.000Z',bonusAccessGrantedAt:'2026-02-01T00:00:00.000Z',bonusAccessReason:'Bonus early access before paid term begins',
  subscription:{tier:'standard',status:'active',billingStartAt:start,subscriptionEnd:end,expiresAt:'2026-12-31T00:00:00.000Z',paymentId:'admin-grant-tier1',amountPaid:0,
   bonusAccessGrantedAt:'2026-02-01T00:00:00.000Z',bonusAccessEndsAt:'2026-02-01T00:00:00.000Z'}};
 assert.deepEqual(resolve(employer),{id:'cs_live_fictional',tier:'standard',startsAt:start,endsAt:end});
});

test('pre-Sep-9 payments that only wrote top-level fields beat a stale nested map',()=>{
 const employer={plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:start,subscriptionEnd:end,
  subscription:{tier:'free',status:'expired',billingStartAt:'2025-01-01T00:00:00.000Z',subscriptionEnd:'2026-01-01T00:00:00.000Z'}};
 const receipt=stripe({plan:'tier2',amount:2500,id:undefined});
 assert.equal(resolve(employer,[{...receipt,id:'random-legacy-id'}]).id,'random-legacy-id');
});

test('receipt trust keeps every protection against genuine contradictions',()=>{
 const employer={plan:'standard',subscriptionTier:'standard',subscriptionStatus:'active',subscriptionStart:start,subscriptionEnd:end,billingStartAt:'2026-02-01T00:00:00.000Z',
  subscription:{tier:'standard',status:'active',billingStartAt:start,subscriptionEnd:end,paymentId:'admin-grant-tier1',amountPaid:0}};
 assert.equal(resolve(employer).id,'cs_live_fictional');
 // Not a Stripe receipt, refunded, another tier, other dates, revoked projection or another bound term: no trust.
 assert.equal(resolve(employer,[stripe({stripeSessionId:undefined})]),null);
 for(const status of ['refunded','disputed','expired']) assert.equal(resolve(employer,[stripe({status})]),null,status);
 assert.equal(resolve(employer,[stripe({plan:'tier2'})]),null);
 assert.equal(resolve(employer,[stripe({expiresAt:new Date('2027-04-01T00:00:00Z')})]),null);
 assert.equal(resolve({...employer,subscriptionStatus:'expired',subscription:{...employer.subscription,status:'expired'}}),null);
 assert.equal(resolve({...employer,subscription:{...employer.subscription,termId:'another-term'}}),null);
 assert.equal(resolve({...employer,plan:'free',subscriptionTier:'free',subscription:{...employer.subscription,tier:'free',status:'expired'}}),null);
 // Two corroborated receipts stay ambiguous.
 assert.throws(()=>resolve(employer,[stripe(),{...stripe(),id:'cs_live_second'}]),/reconcil/i);
 // Complimentary-only evidence still never funds postings.
 assert.equal(resolve({...employer,subscriptionStart:'2026-02-01T00:00:00.000Z',subscription:{...employer.subscription,billingStartAt:'2026-02-01T00:00:00.000Z'}},[]),null);
});

test('a paid renewal takes over exactly when the renewed term ends',()=>{
 const employer={plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:start,billingStartAt:start,subscriptionEnd:end,
  subscription:{tier:'premium',status:'active',billingStartAt:start,subscriptionEnd:end,termId:'cs_old'}};
 const renewalEnd=new Date('2028-03-15T17:22:05.000Z');
 const receipts=[stripe({plan:'tier2',amount:2500,stripeSessionId:'cs_old'}),{id:'cs_renewal',data:{orgId:'org1',employerId:'org1',plan:'tier2',status:'active',amount:2500,billingCycle:'annual',stripeSessionId:'cs_renewal',renewalOf:'cs_old',startsAt:end,createdAt:now,expiresAt:renewalEnd}}];
 receipts[0]={...receipts[0],id:'cs_old'};
 assert.equal(resolve(employer,receipts).id,'cs_old');
 assert.equal(resolve(employer,receipts,new Date(end.getTime()-1)).id,'cs_old');
 assert.deepEqual(resolve(employer,receipts,end),{id:'cs_renewal',tier:'premium',startsAt:end,endsAt:renewalEnd});
 assert.equal(resolve(employer,receipts,renewalEnd),null);
 assert.deepEqual(renewalChain({employerId:'org1',employer,receipts,now},{id:'cs_old',endsAt:end}).map(t=>t.id),['cs_renewal']);
 // A refunded or detached renewal never takes over.
 assert.equal(resolve(employer,[receipts[0],{...receipts[1],data:{...receipts[1].data,status:'refunded'}}],end),null);
 assert.equal(resolve(employer,[receipts[0],{...receipts[1],data:{...receipts[1].data,startsAt:new Date(end.getTime()+1000)}}],new Date(end.getTime()+2000)),null);
 assert.deepEqual(fundedAnnualTermIds({employerId:'org1',receipts}),['cs_old','cs_renewal']);
});

test('listings funded by a superseded paid term stay editable until their own expiry, revoked ones do not',()=>{
 const oldTerm={id:'cs_old',tier:'standard',startsAt:new Date('2026-01-01'),endsAt:new Date('2027-01-01')};
 const newTerm={id:'cs_new',tier:'premium',startsAt:new Date('2026-09-01'),endsAt:new Date('2027-09-01')};
 const funded=decidePaidPublication({employer:{jobPostingUsage:{termId:'cs_old',used:0}},current:null,status:'active',featured:false,now:new Date('2026-09-20T00:00:00Z'),includedFeaturedUsed:0,paidTerm:oldTerm}).jobPatch;
 const current={...funded,status:'closed',featured:false};
 const edit=(fundedTermIds)=>decidePaidPublication({employer:{},current,status:'active',featured:false,now,includedFeaturedUsed:0,paidTerm:newTerm,fundedTermIds});
 assert.throws(()=>edit(undefined),/expired or changed/i);
 assert.throws(()=>edit(['cs_new']),/expired or changed/i);
 const result=edit(['cs_new','cs_old']);
 assert.deepEqual(result.employerPatch,{});
 assert.equal(result.jobPatch.expiresAt.toISOString(),funded.expiresAt.toISOString(),'never gains a longer lifetime');
 assert.throws(()=>decidePaidPublication({employer:{},current,status:'active',featured:false,now:new Date('2026-10-21T00:00:00Z'),includedFeaturedUsed:0,paidTerm:newTerm,fundedTermIds:['cs_old']}),/expired/i);
});

test('the reader passes standing receipts, so replaced-term jobs edit while refunded-term jobs do not',async()=>{
 const records={'employers/org1':{plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:'2026-09-01T00:00:00.000Z',billingStartAt:'2026-09-01T00:00:00.000Z',subscriptionEnd:'2027-09-01T00:00:00.000Z',
   subscription:{tier:'premium',status:'active',billingStartAt:'2026-09-01T00:00:00.000Z',subscriptionEnd:'2027-09-01T00:00:00.000Z',termId:'cs_new'}},
  'subscriptions/cs_new':{orgId:'org1',employerId:'org1',plan:'tier2',status:'active',amount:2500,billingCycle:'annual',stripeSessionId:'cs_new',createdAt:'2026-09-01T00:00:00.000Z',expiresAt:'2027-09-01T00:00:00.000Z'},
  'subscriptions/cs_old':{orgId:'org1',employerId:'org1',plan:'tier1',status:'active',amount:1250,billingCycle:'annual',stripeSessionId:'cs_old',createdAt:'2026-01-01T00:00:00.000Z',expiresAt:'2027-01-01T00:00:00.000Z'}};
 const funded={publication:{version:1,funding:'standard_subscription',termId:'cs_old',firstPublishedAt:new Date('2026-08-20T00:00:00Z'),expiresAt:new Date('2026-09-19T00:00:00Z'),durationDays:30},
  expiresAt:new Date('2026-09-19T00:00:00Z'),status:'closed',featured:false,employerId:'org1'};
 const r={async getDocument(c,id){const data=records[c+'/'+id];return data?{id,data}:null;},async queryExact(c,f,v){return Object.entries(records).filter(([k,d])=>k.startsWith(c+'/')&&d[f]===v).map(([k,d])=>({id:k.split('/')[1],data:d}));}};
 const at=new Date('2026-09-10T00:00:00Z');
 const result=await preparePaidPublication(r,{employerId:'org1',organizationId:'org1',jobId:'j',current:funded,status:'active',featured:false,now:at});
 assert.deepEqual(result.employerPatch,{});
 records['subscriptions/cs_old']={...records['subscriptions/cs_old'],status:'refunded'};
 await assert.rejects(preparePaidPublication(r,{employerId:'org1',organizationId:'org1',jobId:'j',current:funded,status:'active',featured:false,now:at}),/expired or changed/i);
});

test('a receipt-backed Standard term without a usage counter counts what it already funded instead of refusing',async()=>{
 const projection={plan:'standard',subscriptionTier:'standard',subscriptionStatus:'active',subscriptionStart:start,subscriptionEnd:end};
 const records={'employers/org1':projection,'subscriptions/cs_live_fictional':stripe().data};
 // Pre-policy listings published inside the term (any status, soft-deleted included) count once.
 for(let n=0;n<5;n++) records['jobs/legacy'+n]={employerId:'org1',status:n===4?'deleted':'closed',postedAt:new Date('2026-04-0'+(n+1)+'T12:00:00Z')};
 records['jobs/before-term']={employerId:'org1',status:'active',postedAt:new Date('2026-01-01T00:00:00Z')};
 records['jobs/credit']={employerId:'org1',status:'active',postedAt:new Date('2026-05-01T00:00:00Z'),standardCreditConsumed:true};
 records['jobs/never-published']={employerId:'org1',status:'draft',createdAt:new Date('2026-05-01T00:00:00Z')};
 records['posts/legacy0']={type:'job',orgId:'org1',status:'active',postedAt:new Date('2026-04-01T12:00:00Z')};
 records['jobs/funded']={employerId:'org1',status:'active',publication:{version:1,funding:'standard_subscription',termId:'cs_live_fictional',firstPublishedAt:new Date('2026-09-20T00:00:00Z'),expiresAt:new Date('2026-10-20T00:00:00Z'),durationDays:30}};
 records['jobs/other-term']={employerId:'org1',status:'closed',publication:{version:1,funding:'standard_subscription',termId:'cs_older',firstPublishedAt:new Date('2026-02-20T00:00:00Z'),expiresAt:new Date('2026-03-20T00:00:00Z'),durationDays:30}};
 const r={async getDocument(c,id){const data=records[c+'/'+id];return data?{id,data}:null;},async queryExact(c,f,v){return Object.entries(records).filter(([k,d])=>k.startsWith(c+'/')&&d[f]===v).map(([k,d])=>({id:k.split('/')[1],data:d}));}};
 const input={employerId:'org1',organizationId:'org1',jobId:'new',current:null,status:'active',featured:false,durationDays:30,now};
 const result=await preparePaidPublication(r,input);
 assert.equal(result.jobPatch.publication.funding,'standard_subscription');
 assert.deepEqual(result.employerPatch.jobPostingUsage,{termId:'cs_live_fictional',used:7},'5 legacy + 1 funded + this posting');
 // A stored counter for this term is authoritative; a counter for another term is replaced by the count.
 records['employers/org1']={...projection,jobPostingUsage:{termId:'cs_live_fictional',used:14}};
 assert.deepEqual((await preparePaidPublication(r,input)).employerPatch.jobPostingUsage,{termId:'cs_live_fictional',used:15});
 records['employers/org1']={...projection,jobPostingUsage:{termId:'cs_older',used:2}};
 assert.deepEqual((await preparePaidPublication(r,input)).employerPatch.jobPostingUsage,{termId:'cs_live_fictional',used:7});
 // A corrupt counter for this term still requires reconciliation, and an exhausted term needs a credit.
 records['employers/org1']={...projection,jobPostingUsage:{termId:'cs_live_fictional',used:-1}};
 await assert.rejects(preparePaidPublication(r,input),/reconcil/i);
 for(let n=0;n<10;n++) records['jobs/more'+n]={employerId:'org1',status:'closed',postedAt:new Date('2026-06-0'+(n%9+1)+'T12:00:00Z')};
 records['employers/org1']=projection;
 await assert.rejects(preparePaidPublication(r,input),e=>e.code==='payment_required');
 records['employers/org1']={...projection,standardPostCredits:1};
 assert.deepEqual((await preparePaidPublication(r,input)).employerPatch,{standardPostCredits:0});
});

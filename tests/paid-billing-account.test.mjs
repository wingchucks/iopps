import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePaidPublication,readBillingOverview,readPaidFeaturedSummary,readPaidPublishingSummaries} from '../src/lib/server/paid-job-publication-reader.ts';
import {buildFeaturedJobSummary} from '../src/lib/server/featured-job-entitlements.ts';

// Production error "Employer account not found.": requireEmployerContext accepts accounts whose
// billing document is employers/{orgId} (or that have none yet); publication must resolve the same way.
const now=new Date('2026-09-29T18:00:00Z');
function reader(records){
  const reads=[];
  return {reads,async getDocument(c,id){reads.push(c+'/'+id);const data=records[c+'/'+id];return data?{id,data,version:'v-'+id}:null;},
    async queryExact(c,f,v,limit){return Object.entries(records).filter(([key,data])=>key.startsWith(c+'/')&&data[f]===v).slice(0,limit).map(([key,data])=>({id:key.split('/')[1],data}));}};
}
const premium={plan:'premium',subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:'2026-01-10T00:00:00.000Z',subscriptionEnd:'2027-01-10T00:00:00.000Z',featuredPostCredits:1,standardPostCredits:2};
const premiumReceipt={orgId:'owner-uid',employerId:'owner-uid',plan:'tier2',status:'active',amount:2500,billingCycle:'annual',stripeSessionId:'cs_test_fictional',createdAt:'2026-01-10T00:00:00.000Z',expiresAt:'2027-01-10T00:00:00.000Z'};
const job=(overrides={})=>({jobId:'job-1',current:null,status:'active',featured:false,durationDays:30,now,...overrides});

test('organization-only legacy account (no employers document) drafts, closes and is offered payment instead of 409',async()=>{
 const records={'organizations/owner-uid':{name:'Fictional legacy org',plan:null}};
 for(const status of ['draft','closed']) {
  const result=await preparePaidPublication(reader(records),{employerId:'owner-uid',organizationId:'owner-uid',...job({status})});
  assert.deepEqual(result.employerPatch,{});assert.deepEqual(result.jobPatch,{});
  assert.equal(result.paidTerm,null);assert.equal(result.employerDocumentId,'owner-uid');
 }
 await assert.rejects(preparePaidPublication(reader(records),{employerId:'owner-uid',organizationId:'owner-uid',...job()}),e=>e.code==='payment_required');
 const summaries=await readPaidPublishingSummaries(reader(records),{employerId:'owner-uid',organizationId:'owner-uid',now},{canPurchase:true});
 assert.equal(summaries.publishingSummary.standard.reason,'payment_required');
 assert.equal(summaries.featuredSummary.plan,'free');
 assert.equal(summaries.billing.plan,'free');assert.equal(summaries.billing.annualPlans.tier2.available,true);
});

test('account whose billing document is employers/{orgId} reads that document and its receipts',async()=>{
 // users.employerId points at a missing employer document; members.orgId is the owner org.
 const records={'employers/owner-uid':premium,'subscriptions/cs_test_fictional':premiumReceipt,'organizations/owner-uid':{name:'Fictional org'},
  'jobs/live':{employerId:'legacy-employer',orgId:'owner-uid',status:'active',featured:true,featuredEntitlement:'included_slot'}};
 const input={employerId:'legacy-employer',organizationId:'owner-uid',now};
 const summary=await readPaidFeaturedSummary(reader(records),input);
 assert.equal(summary.plan,'premium');assert.equal(summary.featuredSlotsUsed,1);assert.equal(summary.featuredPostCredits,1);
 const {employerDocumentId,overview}=await readBillingOverview(reader(records),input,{canPurchase:true});
 // Stripe fulfillment credits employers/{orgId}: the same document publication now reads.
 assert.equal(employerDocumentId,'owner-uid');assert.equal(overview.paidTerm.id,'cs_test_fictional');
 // A writer that still targets employers/{employerId} is refused rather than creating a shadow document.
 await assert.rejects(preparePaidPublication(reader(records),{...input,...job()}),e=>e.code==='billing_account_mismatch' && /billing account/.test(e.message));
 await assert.rejects(preparePaidPublication(reader(records),{...input,...job({status:'draft'})}),e=>e.code==='billing_account_mismatch');
 const opted=await preparePaidPublication(reader(records),{...input,...job(),writesResolvedEmployerDocument:true});
 assert.equal(opted.employerDocumentId,'owner-uid');assert.equal(opted.jobPatch.publication.funding,'premium_subscription');
 const credit=await preparePaidPublication(reader({...records,'employers/owner-uid':{standardPostCredits:2}}),{...input,...job(),writesResolvedEmployerDocument:true});
 assert.equal(credit.employerDocumentId,'owner-uid');assert.deepEqual(credit.employerPatch,{standardPostCredits:1});
});

test('primary employer document wins exactly as requireEmployerContext resolves it',async()=>{
 const r=reader({'employers/legacy-employer':{standardPostCredits:3},'employers/owner-uid':premium});
 const result=await preparePaidPublication(r,{employerId:'legacy-employer',organizationId:'owner-uid',...job()});
 assert.equal(result.employerDocumentId,'legacy-employer');assert.deepEqual(result.employerPatch,{standardPostCredits:2});
 assert.ok(!r.reads.includes('employers/owner-uid'),'fallback is only read when the primary document is missing');
 const {employerDocumentId}=await readBillingOverview(reader({'employers/legacy-employer':{},'employers/owner-uid':premium}),{employerId:'legacy-employer',organizationId:'owner-uid',now},{canPurchase:true});
 assert.equal(employerDocumentId,'legacy-employer','checkout compares this with the organization it charges for');
});

test('unpublish, close and draft saves report the paying plan and real featured usage',async()=>{
 const records={'employers/owner-uid':premium,'subscriptions/cs_test_fictional':premiumReceipt,
  'jobs/a':{employerId:'owner-uid',status:'active',featured:true},'jobs/b':{employerId:'owner-uid',status:'active',featured:true},
  'jobs/job-1':{employerId:'owner-uid',status:'active',featured:true}};
 for(const status of ['draft','closed']) {
  const paid=await preparePaidPublication(reader(records),{employerId:'owner-uid',organizationId:'owner-uid',...job({status,featured:true,current:records['jobs/job-1']})});
  assert.deepEqual(paid.employerPatch,{});assert.deepEqual(paid.jobPatch,{});
  assert.equal(paid.paidTerm.tier,'premium');assert.equal(paid.includedFeaturedUsed,2,'other live featured jobs, excluding the one being closed');
  // Exactly what the employer job routes build from the result.
  const summary=buildFeaturedJobSummary({plan:paid.paidTerm?.tier ?? 'free',featuredJobsUsed:paid.includedFeaturedUsed,featuredPostCredits:Number(paid.employerPatch.featuredPostCredits ?? paid.employer.featuredPostCredits ?? 0)});
  assert.deepEqual([summary.plan,summary.featuredSlotsTotal,summary.featuredSlotsRemaining,summary.canFeatureJobs],['premium',4,2,true]);
 }
 // Reconciliation problems never block closing; the summary just degrades.
 const ambiguous={...records,'subscriptions/duplicate':premiumReceipt};
 const closed=await preparePaidPublication(reader(ambiguous),{employerId:'owner-uid',organizationId:'owner-uid',...job({status:'closed'})});
 assert.deepEqual(closed.employerPatch,{});assert.equal(closed.paidTerm,null);
 await assert.rejects(preparePaidPublication(reader(ambiguous),{employerId:'owner-uid',organizationId:'owner-uid',...job()}),/reconcil/i);
});

test('a date-only closing date keeps its featured slot through that Saskatchewan day',async()=>{
 // 03:00 UTC on Sep 30 is still 21:00 on Sep 29 in America/Regina (UTC-6).
 const lateEvening=new Date('2026-09-30T03:00:00Z');
 const records={'employers/owner-uid':premium,'subscriptions/cs_test_fictional':premiumReceipt};
 for(let n=0;n<4;n++) records['jobs/j'+n]={employerId:'owner-uid',status:'active',featured:true,closingDate:'2026-09-29'};
 const args={employerId:'owner-uid',organizationId:'owner-uid',...job({featured:true,durationDays:10,now:lateEvening})};
 const summary=await readPaidFeaturedSummary(reader(records),{employerId:'owner-uid',organizationId:'owner-uid',now:lateEvening});
 assert.equal(summary.featuredSlotsUsed,4);assert.equal(summary.featuredSlotsRemaining,0);
 // The paid credit is used instead of a slot the four live listings still hold.
 assert.equal((await preparePaidPublication(reader(records),args)).jobPatch.publication.funding,'featured_credit');
 // On the next Saskatchewan day the slots are free again.
 const nextDay=new Date('2026-09-30T06:00:00Z');
 assert.equal((await readPaidFeaturedSummary(reader(records),{employerId:'owner-uid',organizationId:'owner-uid',now:nextDay})).featuredSlotsUsed,0);
});

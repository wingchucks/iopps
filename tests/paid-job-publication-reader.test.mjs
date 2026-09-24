import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePaidPublication} from '../src/lib/server/paid-job-publication-reader.ts';
const now=new Date('2026-09-24T12:00:00Z');
const employer={subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:'2026-01-01',subscriptionEnd:'2027-01-01'};
const receipt={orgId:'owner',plan:'tier2',status:'active',amount:2500,billingCycle:'annual',createdAt:'2026-01-01',expiresAt:'2027-01-01'};
function reader(records){return {async getDocument(c,id){const data=records[c+'/'+id];return data?{id,data}:null;},async queryExact(c,f,v,limit){return Object.entries(records).filter(([key,data])=>key.startsWith(c+'/')&&data[f]===v).slice(0,limit).map(([key,data])=>({id:key.split('/')[1],data}));}};}
const args={employerId:'owner',organizationId:'org',jobId:'new',current:null,status:'active',featured:true,durationDays:45,now};
test('transaction reader dedupes mirrors, ignores expired and credit-funded featured slots',async()=>{
 const records={'employers/owner':employer,'subscriptions/r1':receipt};
 for(let n=0;n<3;n++)records['jobs/j'+n]={employerId:'owner',status:'active',featured:true};
 records['posts/j0']={orgId:'org',type:'job',status:'active',featured:true};
 records['jobs/old']={employerId:'owner',status:'active',featured:true,expiresAt:'2026-01-01'};
 records['jobs/credit']={employerId:'owner',status:'active',featured:true,featuredEntitlement:'featured_credit',publication:{version:1,funding:'featured_credit'}};
 const result=await preparePaidPublication(reader(records),args);
 assert.equal(result.includedFeaturedUsed,3);
 assert.equal(result.jobPatch.publication.funding,'premium_subscription');
 records['jobs/j3']={employerId:'owner',status:'active',featured:true};
 await assert.rejects(()=>preparePaidPublication(reader(records),args),/paid posting/i);
});
test('deactivation does not require reconciling unrelated payment or usage records',async()=>{
 const result=await preparePaidPublication(reader({'employers/owner':employer,'subscriptions/r1':receipt,'subscriptions/r2':receipt}),{...args,status:'closed',current:{status:'active'}});
 assert.deepEqual(result.employerPatch,{});
 assert.deepEqual(result.jobPatch,{});
});
test('paid standard credit works without any subscription, missing account rejects',async()=>{
 const result=await preparePaidPublication(reader({'employers/owner':{standardPostCredits:1}}),{...args,featured:false,durationDays:30});
 assert.equal(result.employerPatch.standardPostCredits,0);
 await assert.rejects(()=>preparePaidPublication(reader({}),args),/account/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as publication from '../src/lib/server/paid-job-publication.ts';
const now=new Date('2026-09-24T12:00:00Z');
const decide=(overrides={})=>publication.decidePaidPublication({employer:{},current:null,status:'active',featured:false,now,includedFeaturedUsed:0,paidTerm:null,...overrides});
test('standard publication requires payment but drafts do not',()=>{
 assert.throws(()=>decide(),/paid posting/i);
 assert.deepEqual(decide({status:'draft'}).employerPatch,{});
});
test('standard credit funds exactly30days without consuming featured credit',()=>{
 const result=decide({employer:{standardPostCredits:1,featuredPostCredits:2}});
 assert.equal(result.employerPatch.standardPostCredits,0);
 assert.equal(result.employerPatch.featuredPostCredits,undefined);
 assert.equal(result.jobPatch.expiresAt.toISOString(),'2026-10-24T12:00:00.000Z');
 assert.equal(result.jobPatch.publication.funding,'standard_credit');
});
test('featured credit is the entire posting and requires explicit1..45day selection',()=>{
 for (const durationDays of [undefined,0,46,1.5,'30',NaN]) {
  assert.throws(()=>decide({featured:true,durationDays,employer:{standardPostCredits:1,featuredPostCredits:1}}),/duration/i);
 }
 const result=decide({featured:true,durationDays:12,employer:{standardPostCredits:1,featuredPostCredits:1}});
 assert.equal(result.employerPatch.featuredPostCredits,0);
 assert.equal(result.employerPatch.standardPostCredits,undefined);
 assert.equal(result.jobPatch.publication.durationDays,12);
 assert.equal(result.jobPatch.expiresAt.toISOString(),'2026-10-06T12:00:00.000Z');
});
const premium={id:'receipt1',tier:'premium',startsAt:new Date('2026-01-01'),endsAt:new Date('2027-01-01')};
test('annual Standard consumes15per term; Premium is unlimited with4included featured slots',()=>{
 const standard={...premium,tier:'standard'};
 const result=decide({paidTerm:standard,employer:{jobPostingUsage:{termId:'receipt1',used:14}}});
 assert.deepEqual(result.employerPatch.jobPostingUsage,{termId:'receipt1',used:15});
 assert.throws(()=>decide({paidTerm:standard,employer:{jobPostingUsage:{termId:'receipt1',used:15}}}),/paid posting/i);
 assert.throws(()=>decide({paidTerm:standard}),/reconcil/i);
 assert.equal(decide({paidTerm:premium}).jobPatch.publication.funding,'premium_subscription');
 assert.equal(decide({paidTerm:premium,featured:true,durationDays:45,includedFeaturedUsed:3}).jobPatch.featuredEntitlement,'included_slot');
 assert.throws(()=>decide({paidTerm:premium,featured:true,durationDays:45,includedFeaturedUsed:4}),/paid posting/i);
 assert.equal(decide({paidTerm:premium,featured:true,durationDays:45,includedFeaturedUsed:4,employer:{featuredPostCredits:1}}).employerPatch.featuredPostCredits,0);
});
test('expired or future annual terms cannot authorize publication',()=>{
 assert.throws(()=>decide({paidTerm:{...premium,endsAt:now}}),/paid posting/i);
 assert.throws(()=>decide({paidTerm:{...premium,startsAt:new Date('2026-12-01')}}),/paid posting/i);
});
test('valid publication resumes without debit or lifetime extension; expired term cannot renew implicitly',()=>{
 const original=decide({employer:{standardPostCredits:1}}).jobPatch;
 const current={...original,status:'closed',featured:false};
 const result=decide({current,now:new Date('2026-10-01')});
 assert.deepEqual(result.employerPatch,{});
 assert.equal(result.jobPatch.expiresAt.toISOString(),original.expiresAt.toISOString());
 assert.throws(()=>decide({current,now:new Date('2026-11-01'),employer:{standardPostCredits:1}}),/expired/i);
 assert.throws(()=>decide({current,featured:true,durationDays:45,employer:{featuredPostCredits:1}}),/new.*posting/i);
});
test('persisted authorization rejects malformed history rather than grandfathering it',()=>{
 for(const history of [[],{},'bad',{version:1,firstPublishedAt:now,expiresAt:new Date('2027-01-01')}]){
  assert.throws(()=>decide({current:{status:'active',publication:history}}),/reconcil/i);
 }
 assert.throws(()=>decide({current:{status:'active',expiresAt:'invalid'}}),/reconcil/i);
 const valid=decide({employer:{standardPostCredits:1}}).jobPatch;
 for(const change of [{funding:'unknown'},{durationDays:31},{firstPublishedAt:new Date('2026-10-01')},{expiresAt:new Date('2027-01-01')}]) {
  assert.throws(()=>decide({current:{...valid,status:'closed',publication:{...valid.publication,...change}}}),/reconcil/i);
 }
 assert.throws(()=>decide({current:{...valid,status:'closed',featuredEntitlement:'included_slot'},featured:true,paidTerm:premium}),/reconcil/i);
});
test('subscription resumes never outlive a shortened term or use a replacement term',()=>{
 const original=decide({paidTerm:premium}).jobPatch;
 assert.throws(()=>decide({current:{...original,status:'closed'},paidTerm:{...premium,id:'replacement'}}),/expired or changed/i);
 const result=decide({current:{...original,status:'closed'},paidTerm:{...premium,endsAt:new Date('2026-10-01')}});
 assert.equal(result.jobPatch.expiresAt.toISOString(),'2026-10-01T00:00:00.000Z');
 const featured=decide({paidTerm:premium,featured:true,durationDays:45}).jobPatch;
 assert.throws(()=>decide({current:{...featured,status:'closed',featured:true},featured:true,paidTerm:premium,includedFeaturedUsed:4}),/slot/i);
 assert.throws(()=>decide({current:{...featured,status:'active',featured:true,closingDate:'2026-09-23'},featured:true,paidTerm:premium,includedFeaturedUsed:4}),/slot/i);
});
test('existing legacy content remains editable without granting republish rights',()=>{
 assert.deepEqual(decide({current:{status:'active',featured:false,postedAt:now}}).jobPatch,{});
 assert.throws(()=>decide({current:{status:'closed',featuredCreditConsumed:true,postedAt:now}}),/reconcil/i);
});

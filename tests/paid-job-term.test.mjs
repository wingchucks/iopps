import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePaidPublicationTerm} from '../src/lib/server/paid-job-term.ts';
const now=new Date('2026-09-24T12:00:00Z');
const employer={subscriptionTier:'premium',subscriptionStatus:'active',subscriptionStart:'2026-01-01',subscriptionEnd:'2027-01-01'};
const receipt={id:'receipt1',data:{orgId:'org1',plan:'tier2',status:'active',amount:2500,billingCycle:'annual',kind:'subscription',createdAt:'2026-01-01',expiresAt:'2027-01-01'}};
const resolve=(overrides={})=>resolvePaidPublicationTerm({employerId:'org1',employer,receipts:[receipt],now,...overrides});
test('paid receipt and active matching account authorize the exact term',()=>{
 const result=resolve();assert.equal(result.id,'receipt1');assert.equal(result.tier,'premium');
});
test('labels alone, complimentary, foreign and mismatched receipts do not authorize jobs',()=>{
 assert.equal(resolve({receipts:[]}),null);
 for(const change of [{orgId:'other'},{amount:0},{amount:'2500'},{plan:'tier1'},{expiresAt:'2028-01-01'},{status:'expired'},{billingCycle:'one-time'}]){
  assert.equal(resolve({receipts:[{...receipt,data:{...receipt.data,...change}}]}),null);
 }
 for(const subscriptionStatus of ['cancelled','expired','trial','inactive'])assert.equal(resolve({employer:{...employer,subscriptionStatus}}),null);
});
test('overlapping matching receipts are ambiguous, never an extra allowance',()=>{
 assert.throws(()=>resolve({receipts:[receipt,{...receipt,id:'receipt2'}]}),/reconcil/i);
});
test('inactive receipt overrides a stale manual projection and early access cannot bridge gaps',()=>{
 const subscription={tier:'premium',status:'active',paymentId:'admin-manual-tier2',amountPaid:2500,billingStartAt:'2026-01-01',subscriptionEnd:'2027-01-01'};
 assert.equal(resolve({employer:{...employer,subscription},receipts:[{...receipt,data:{...receipt.data,status:'cancelled'}}]}),null);
 const future={...subscription,billingStartAt:'2026-10-01',subscriptionEnd:'2027-10-01',bonusAccessGrantedAt:'2026-09-01',bonusAccessEndsAt:'2026-09-26'};
 assert.equal(resolve({employer:{subscriptionTier:'premium',subscriptionStatus:'active',subscription:future},receipts:[]}),null);
});
test('positive manual paid projection keeps explicit early access, not a reason-only grant',()=>{
 const subscription={tier:'premium',status:'active',paymentId:'admin-manual-tier2',amountPaid:2500,billingStartAt:'2026-10-01',subscriptionEnd:'2027-10-01',bonusAccessGrantedAt:'2026-09-01',bonusAccessEndsAt:'2026-10-01'};
 const manual={subscriptionTier:'premium',subscriptionStatus:'active',subscription};
 assert.equal(resolve({employer:manual,receipts:[]}).tier,'premium');
 assert.equal(resolve({employer:{...manual,subscription:{...subscription,paymentId:'admin-grant-tier2'}},receipts:[]}),null);
 assert.equal(resolve({employer:{...manual,subscription:{...subscription,bonusAccessEndsAt:undefined}},receipts:[]}),null);
});

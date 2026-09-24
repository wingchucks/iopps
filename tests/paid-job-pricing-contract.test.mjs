import test from 'node:test';
import assert from 'node:assert/strict';
import {isPlanAvailableForPurchase,ONE_TIME_PLANS,SUBSCRIPTION_PLANS} from '../src/lib/pricing.ts';

test('standard single job is purchasable for125CAD and30days',()=>{
 assert.equal(ONE_TIME_PLANS['standard-post'].amount,125);
 assert.equal(isPlanAvailableForPurchase('standard-post'),true);
 assert.match(ONE_TIME_PLANS['standard-post'].shortDescription,/30 days/i);
 assert.ok(ONE_TIME_PLANS['standard-post'].features.includes('30-day listing'));
});
test('featured single job advertises client choice up to45days at200CAD',()=>{
 assert.equal(ONE_TIME_PLANS['featured-post'].amount,200);
 assert.match(ONE_TIME_PLANS['featured-post'].shortDescription,/up to 45 days/i);
});
test('annual prices retained without free-job claims and School is not for sale',()=>{
 assert.equal(SUBSCRIPTION_PLANS.tier1.amount,1250);
 assert.equal(SUBSCRIPTION_PLANS.tier2.amount,2500);
 assert.equal(SUBSCRIPTION_PLANS.tier2.jobLimit,'Unlimited job postings');
 assert.doesNotMatch(JSON.stringify([SUBSCRIPTION_PLANS.tier1,SUBSCRIPTION_PLANS.tier2]),/free job/i);
 assert.equal(isPlanAvailableForPurchase('tier3'),false);
});

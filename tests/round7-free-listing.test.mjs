import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {sourceModule} from './helpers/security-fixtures.mjs';
test('free listing control never presents the paid Standard name as the free product',()=>{
 const {default:Control}=sourceModule('src/components/FeaturedJobControl.tsx',{mocks:{'next/link':({children,...props})=>React.createElement('a',props,children)}});
 const html=renderToStaticMarkup(React.createElement(Control,{checked:false,onChange(){},summary:{plan:'free',canFeatureJobs:false,featuredSlotsTotal:0,featuredSlotsUsed:0,featuredSlotsRemaining:0,featuredPostCredits:0}}));
 assert.match(html,/Free listing/);assert.doesNotMatch(html,/Standard (?:job listings|listing)/i);
 for(const file of ['src/app/org/dashboard/billing/page.tsx','src/components/PricingTabs.tsx','src/lib/pricing.ts'])assert.doesNotMatch(readFileSync(file,'utf8'),/Standard job listings/i,file);
 // Paid entitlement identifiers and prices are not part of the copy change.
 const {SUBSCRIPTION_PLANS}=sourceModule('src/lib/pricing.ts');assert.equal(SUBSCRIPTION_PLANS.tier1.title,'Standard');assert.equal(SUBSCRIPTION_PLANS.tier1.amount,1250);
});

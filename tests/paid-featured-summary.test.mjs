import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFeaturedJobSummary} from '../src/lib/server/featured-job-entitlements.ts';

test('an unused purchased featured credit remains spendable beside an existing placement',()=>{
 const summary=buildFeaturedJobSummary({plan:'free',featuredJobsUsed:1,featuredPostCredits:1});
 assert.equal(summary.canFeatureJobs,true);
 assert.equal(summary.featuredSlotsRemaining,0);
});

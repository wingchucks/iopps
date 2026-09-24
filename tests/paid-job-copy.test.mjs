import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authIntentHref,postSignupDestination} from '../src/lib/auth-redirect.ts';
const read=(path)=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('public pricing offers both paid single job products without free posting claims',()=>{
 const source=read('components/PricingTabs.tsx');
 assert.doesNotMatch(source,/Job posting and application management are free|Jobs and events listing|Payment is only required when/);
 assert.match(source,/postHref\("standard-post"\)/);
});
test('billing and featured control do not advertise free job postings',()=>{
 for(const file of ['app/org/dashboard/billing/page.tsx','components/FeaturedJobControl.tsx']){
  assert.doesNotMatch(read(file),/Free job listings|Posting a job is free|free listing|Free listing/);
 }
 assert.match(read('app/org/dashboard/billing/page.tsx'),/key: "standard-post"/);
});
test('pricing entry pages distinguish free profiles from paid jobs',()=>{
 for(const file of ['app/signup/page.tsx','app/org/plans/page.tsx','app/pricing/page.tsx']) {
  const source=read(file);
  assert.doesNotMatch(source,/only pay when|plan only when|choose promotion only/);
  assert.match(source,/job postings|job posting/i);
 }
 assert.match(read('app/signup/page.tsx'),/"tier1", "tier2", "standard-post", "featured-post"/);
});
test('single posting layout reserves two desktop columns for two products',()=>{
 assert.doesNotMatch(read('components/PricingTabs.tsx'),/xl:grid-cols-3/);
});
test('job forms expose selected featured duration and send it to publication APIs',()=>{
 for(const file of ['app/org/dashboard/jobs/new/page.tsx','app/org/dashboard/jobs/[id]/edit/page.tsx']) {
  const source=read(file);
  assert.match(source,/Featured listing duration/);
  assert.match(source,/durationDays:/);
  assert.match(source,/max=\{45\}/);
 }
});
test('retired School sale is absent from signup and checkout intent',()=>{
 assert.doesNotMatch(read('app/signup/page.tsx'),/SUBSCRIPTION_PLANS\.tier3|setSelectedPlan\("tier3"\)/);
 assert.doesNotMatch(read('app/api/stripe/checkout/route.ts'),/Posting a job is free/);
 assert.equal(authIntentHref('/signup',new URLSearchParams({plan:'tier3'})),'/signup');
 assert.equal(postSignupDestination(new URLSearchParams({plan:'tier3'}),'/org/plans'),'/org/plans');
 assert.equal(postSignupDestination(new URLSearchParams({plan:'standard-post'}),'/org/plans'),'/org/checkout?plan=standard-post');
});

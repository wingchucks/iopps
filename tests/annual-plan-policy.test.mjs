import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {sourceModule} from './helpers/security-fixtures.mjs';
import {addOneCalendarYear,annualPurchaseOption,annualPurchaseOptions,formatBillingDate,renewalWindowOpensAt} from '../src/lib/pricing.ts';

test('annual terms end exactly one calendar year later on the Saskatchewan clock',()=>{
 // Old code truncated to midnight: new Date(y+1, m, d) gave 364.x days, shown a day early.
 const purchase=new Date('2026-09-29T21:30:15.250Z');
 assert.equal(addOneCalendarYear(purchase).toISOString(),'2027-09-29T21:30:15.250Z');
 assert.equal(formatBillingDate(addOneCalendarYear(purchase)),'September 29, 2027');
 // 03:00 UTC on Sep 30 is still Sep 29 in Regina: the anniversary is Sep 29 at the same wall-clock time.
 assert.equal(formatBillingDate(addOneCalendarYear(new Date('2026-09-30T03:00:00Z'))),'September 29, 2027');
 // February 29 (Regina date) maps to February 28.
 assert.equal(addOneCalendarYear(new Date('2028-02-29T18:00:00Z')).toISOString(),'2029-02-28T18:00:00.000Z');
 assert.equal(addOneCalendarYear(new Date('2028-03-01T03:00:00Z')).toISOString(),'2029-03-01T03:00:00.000Z','Feb 29 21:00 Regina -> Feb 28 21:00 Regina');
 assert.equal(addOneCalendarYear(new Date('2027-02-28T18:00:00Z')).toISOString(),'2028-02-28T18:00:00.000Z');
 assert.equal(addOneCalendarYear(new Date('2026-12-31T23:59:59.999Z')).toISOString(),'2027-12-31T23:59:59.999Z');
});

const term=(tier,endsAt)=>({id:'cs_current',tier,startsAt:'2026-01-10T00:00:00.000Z',endsAt});
test('a paid term blocks annual purchases except a same-tier renewal in its last 60 days',()=>{
 const end='2027-01-10T00:00:00.000Z';
 assert.equal(renewalWindowOpensAt(new Date(end)).toISOString(),'2026-11-11T00:00:00.000Z');
 const before=new Date('2026-11-10T23:59:59Z'),opening=new Date('2026-11-11T00:00:00Z');
 assert.deepEqual(annualPurchaseOption('tier2',{paidTerm:null,renewal:null},before),{planId:'tier2',available:true,kind:'new',reason:null,label:null,message:null,startsAt:null,endsAt:null});
 const early=annualPurchaseOption('tier2',{paidTerm:term('premium',end),renewal:null},before);
 assert.equal(early.available,false);assert.equal(early.reason,'current_plan');assert.equal(early.label,'Current plan · ends January 9, 2027');
 assert.match(early.message,/Renewal opens November 10, 2026/);
 const renewal=annualPurchaseOption('tier2',{paidTerm:term('premium',end),renewal:null},opening);
 assert.equal(renewal.available,true);assert.equal(renewal.kind,'renewal');assert.equal(renewal.startsAt,end);assert.equal(renewal.endsAt,'2028-01-10T00:00:00.000Z');
 const change=annualPurchaseOption('tier1',{paidTerm:term('premium',end),renewal:null},opening);
 assert.equal(change.available,false);assert.equal(change.reason,'plan_change');assert.equal(change.label,'Contact us to change plans');
 const queued=annualPurchaseOptions({paidTerm:term('premium',end),renewal:{id:'cs_next',tier:'premium',startsAt:end,endsAt:'2028-01-10T00:00:00.000Z'}},opening);
 assert.equal(queued.tier2.reason,'renewal_scheduled');assert.equal(queued.tier1.reason,'renewal_scheduled');
 const review=annualPurchaseOptions({paidTerm:null,renewal:null,reviewRequired:true},opening);
 assert.equal(review.tier1.reason,'billing_review');assert.equal(review.tier2.available,false);
});

test('the plan picker never offers a purchase checkout refuses',()=>{
 const {default:PricingTabs}=sourceModule('src/components/PricingTabs.tsx',{mocks:{
  'next/link':({children,href})=>React.createElement('a',{href},children),
  '@/components/Card':({children})=>React.createElement('section',null,children),
 }});
 const render=props=>renderToStaticMarkup(React.createElement(PricingTabs,{variant:'org',...props}));
 const end='2027-01-10T00:00:00.000Z';
 const blocked=render({annualPlans:annualPurchaseOptions({paidTerm:term('premium',end),renewal:null},new Date('2026-10-01T00:00:00Z'))});
 assert.match(blocked,/Current plan · ends January 9, 2027/);
 assert.match(blocked,/Contact us to change plans/);
 assert.doesNotMatch(blocked,/href="\/org\/checkout\?plan=tier[12]"/,'neither annual plan links to checkout');
 assert.match(blocked,/href="\/org\/checkout\?plan=standard-post"|Single Job Posts/);
 const renewing=render({annualPlans:annualPurchaseOptions({paidTerm:term('premium',end),renewal:null},new Date('2026-12-01T00:00:00Z'))});
 assert.match(renewing,/Renew for another year/);assert.match(renewing,/href="\/org\/checkout\?plan=tier2"/);
 assert.doesNotMatch(renewing,/href="\/org\/checkout\?plan=tier1"/);
 const member=render({annualPlans:annualPurchaseOptions({paidTerm:null,renewal:null},new Date()),canPurchase:false});
 assert.match(member,/Owner purchases only/);assert.doesNotMatch(member,/href="\/org\/checkout\?plan=tier/);
 const open=render({annualPlans:annualPurchaseOptions({paidTerm:null,renewal:null},new Date())});
 assert.match(open,/href="\/org\/checkout\?plan=tier1"/);assert.match(open,/href="\/org\/checkout\?plan=tier2"/);
 // The public page keeps its sign-up links.
 assert.match(renderToStaticMarkup(React.createElement(PricingTabs,{variant:'public'})),/Get Started/);
});

test('billing, checkout and admin pages show paid terms and complimentary access truthfully',()=>{
 const billing=readFileSync('src/app/org/dashboard/billing/page.tsx','utf8');
 assert.match(billing,/data\.billing as BillingOverview/);
 assert.match(billing,/COMPLIMENTARY_ACCESS_LABEL/);
 assert.match(billing,/billing\?\.annualPlans\[p\.key\]/,'annual plan buttons follow the server purchase options');
 assert.doesNotMatch(billing,/href=\{`\/org\/checkout\?plan=\$\{p\.key\}`\}>\s*<Button primary=\{p\.highlight\}/,'no unconditional annual checkout link');
 assert.match(billing,/formatBillingDate/);assert.doesNotMatch(billing,/toLocaleDateString/);
 const checkout=readFileSync('src/app/org/checkout/page.tsx','utf8');
 assert.match(checkout,/disabled=\{submitting \|\| Boolean\(blocked\)\}/);assert.match(checkout,/renewal term/);
 const admin=readFileSync('src/app/admin/employers/[orgId]/page.tsx','utf8');
 assert.match(admin,/isComplimentaryAccess\(employer\)/);assert.match(admin,/window\.confirm/);assert.match(admin,/COMPLIMENTARY_ACCESS_DETAIL/);
 assert.match(admin,/jobPostingUsed/);
 // Complimentary access never funds postings: the confirmation and help text point to the credit tool.
 assert.match(admin,/FREE_POSTINGS_HINT = "To let an organization post jobs for free, use “Grant credit” on the Employers list\."/);
 assert.match(admin,/window\.confirm\(\s*`[^`]*\$\{COMPLIMENTARY_ACCESS_DETAIL\}[^`]*\$\{FREE_POSTINGS_HINT\}`/);
 assert.match(admin,/Amount is set to \$0\.00\.[^`]*\$\{FREE_POSTINGS_HINT\}`/);
 const dashboard=readFileSync('src/app/org/dashboard/page.tsx','utf8');
 assert.match(dashboard,/setComplimentaryAccess\(Boolean\(dashData\.billing\?\.complimentary\)\)/,'the dashboard badge follows the server billing state');
 assert.match(dashboard,/complimentaryAccess \? `Complimentary \$\{org\.plan\} · no paid postings` : `\$\{org\.plan\} plan`/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';

// The dashboard used to answer 500 ("Dashboard unavailable") forever when publication state
// raised a PublicationError, e.g. "Employer account not found." for legacy-shaped accounts.
function dashboard({context,documents={},collections={}}){
 const doc=(id,data)=>({id,exists:data!==undefined,data:()=>data});
 const db={runTransaction:fn=>fn({get:ref=>ref.get()}),collection(name){
  const q={where(){return q;},orderBy(){return q;},limit(){return q;},
   doc(id){return {id,get:async()=>doc(id,documents[name+'/'+id])};},
   get:async()=>{const docs=(collections[name]||[]).map(([id,data])=>doc(id,data));return {docs,size:docs.length,empty:!docs.length};}};
  return q;}};
 const {GET}=sourceModule('src/app/api/employer/dashboard/route.ts',{mocks:{'next/server':{NextResponse:{json:Response.json}},'@/lib/firebase-admin':{getAdminDb:()=>db},
  '@/lib/server/employer-auth':{EmployerApiError:class extends Error{},requireEmployerContext:async()=>({uid:'owner',userData:{},employerData:{},organizationData:{name:'Fictional'},orgRole:'owner',...context})},
  '@/lib/organization-profile':{normalizeOrganizationRecord:x=>x},'@/lib/school-visibility':{isSchoolOrganization:()=>false}},
  // One Date realm for every module, as in the Next.js server (each sourceModule file gets its own VM context).
  globals:{Date}});
 return GET(new Request('http://localhost/api/employer/dashboard'));
}

test('organization-only legacy account gets its dashboard with real publishing and billing summaries',async()=>{
 const response=await dashboard({context:{employerId:'owner',orgId:'owner'},documents:{'organizations/owner':{name:'Fictional'}}});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.publishingUnavailable,null);
 assert.equal(body.publishingSummary.standard.reason,'payment_required');
 assert.equal(body.featuredSummary.plan,'free');
 assert.equal(body.billing.plan,'free');assert.equal(body.billing.canPurchase,true);assert.equal(body.billing.annualPlans.tier1.available,true);
});

test('payment evidence needing reconciliation degrades the publishing summary instead of failing the dashboard',async()=>{
 const response=await dashboard({context:{employerId:'owner',orgId:'owner'},documents:{'employers/owner':{name:'Fictional'}},
  collections:{jobs:[['foreign',{title:'Foreign',status:'active',employerId:'somebody-else'}]]}});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.publishingUnavailable.code,'ownership_conflict');
 assert.match(body.publishingUnavailable.message,/Drafts still save/);
 assert.equal(body.featuredSummary,null);assert.equal(body.publishingSummary,null);assert.equal(body.employer.featuredSummary,null);
 assert.equal(body.billing.plan,'free','billing is still read without job usage');
 assert.deepEqual(body.jobs.map(job=>job.id),['foreign']);
});

test('an invited member sees billing but cannot purchase',async()=>{
 const response=await dashboard({context:{uid:'member',employerId:'owner',orgId:'owner',orgRole:'member'},documents:{'employers/owner':{name:'Fictional'}}});
 const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.billing.canPurchase,false);
});

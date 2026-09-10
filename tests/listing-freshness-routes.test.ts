/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as expiration from '../src/lib/server/job-expiration.ts';
import * as visibility from '../src/lib/public-job-merge.ts';
import * as ownership from '../src/lib/server/public-ownership.ts';
import * as freshness from '../src/lib/listing-freshness.ts';
import * as publicJobs from '../src/lib/public-jobs.ts';
import * as jobSlugs from '../src/lib/server/job-slugs.ts';
import * as metadata from '../src/lib/job-metadata.ts';
const nativeRequire = createRequire(import.meta.url);
function loadRoute(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, any> = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source, {exports, require:(id: string) => mocks[id] || (id === '@/lib/server/job-expiration' ? expiration : id === '@/lib/public-job-merge' ? visibility : id === '@/lib/listing-freshness' ? freshness : id === '@/lib/job-metadata' ? metadata : nativeRequire(id)), Response, URL, console, process:{env:{CRON_SECRET:'test-only'}}, Date:class extends Date { constructor(value: any = '2026-09-08T12:00:00Z') { super(value); } } });
  return exports;
}
test('job detail rechecks fresh full data before hydration or any write', async () => {
  let writes = 0;
  let hydrations = 0;
  const doc = {exists:true,id:'past',data:()=>({active:true,status:'active',description:'Deadline is August 28, 2026'}),ref:{set:async()=>{writes++},update:async()=>{writes++}}};
  const route = loadRoute('src/app/api/jobs/[id]/route.ts', {
    'next/server':next,
    '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>doc})})})},
    '@/lib/server/public-job-routing':{findPublicJobDocument:async()=>({id:'past',source:'jobs',routeSlug:'past-job'})},
    '@/lib/server/imported-job-descriptions':{fetchImportedDescriptionPatch:async()=>{hydrations++;return null},normalizeImportedDescription:(s:string)=>s},
    '@/lib/server/public-detail-cache':{withPublicDetailCache:(r:Response)=>r},
    '@/lib/utils':{normalizeApplyUrlFields:(r:unknown)=>r},
  });
  const response = await route.GET(new Request('https://example.test/api/jobs/past'), {params:Promise.resolve({id:'past'})});
  assert.equal(response.status,404);
  assert.equal(writes,0);
  assert.equal(hydrations,0);
});

test('scholarship API marks closed intakes without deleting recurring programs', async () => {
  const rows = [{id:'annual',status:'active',deadline:'August 31, 2026'}, {id:'rolling',status:'active',deadline:'Rolling'}];
  const route = loadRoute('src/app/api/scholarships/route.ts', {
    'next/server':next,
    '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({where:()=>({get:async()=>({docs:rows.map(row=>({id:row.id,data:()=>row}))})}),get:async()=>({docs:[]})})})},
    '@/lib/server/public-ownership':ownership,
    '@/lib/server/partner-promotion':{withPartnerPromotion:(r:unknown)=>r},
    '@/lib/utils':{displayAmount:(v:unknown)=>String(v)},
  });
  const response = await route.GET(new Request('https://example.test/api/scholarships'));
  const body = await response.json();
  assert.equal(body.scholarships.length,2,'recurring program remains discoverable');
  assert.equal(body.scholarships.find((s:any)=>s.id==='annual').intakeClosed,true);
  assert.equal(body.scholarships.find((s:any)=>s.id==='rolling').intakeClosed,false);
});

test('job list removes expired records and emits inferred compensation without stale public caching', async () => {
  const rows=[{id:'past',active:true,description:'Deadline is August 28, 2026'}, {id:'open',active:true,description:'Salary: hourly range $25.00 - $30.00'}];
  const route=loadRoute('src/app/api/jobs/route.ts',{
    'next/server':next,
    '@/lib/firebase-admin':{getAdminDb:()=>({collection:(c:string)=>{const q={where:()=>q,get:async()=>({docs:c==='jobs'?rows.map(row=>({id:row.id,data:()=>row})):[]})};return q;}})},
    '@/lib/server/imported-job-descriptions':{normalizeImportedDescription:(s:string)=>s},
    '@/lib/server/job-slugs':jobSlugs,
    '@/lib/public-jobs':publicJobs,
  });
  const response=await route.GET(new Request('https://example.test/api/jobs'));
  const body=await response.json();
  assert.deepEqual(body.jobs.map((j:any)=>j.id),['open']);
  assert.ok(body.jobs[0].salaryRange,'read-time compensation inference wired');
  assert.equal(response.headers.get('cache-control'),'no-store');
});

test('detail checks newly hydrated deadlines and enriches eligible metadata without stale caching', async () => {
  for(const description of ['Deadline is August 28, 2026','Salary: hourly range $25.00 - $30.00']) {
    const route=loadRoute('src/app/api/jobs/[id]/route.ts',{
      'next/server':next,
      '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>({exists:true,id:'one',data:()=>({active:true,status:'active',slug:'one'}),ref:{update:async()=>{}}})})})})},
      '@/lib/server/public-job-routing':{findPublicJobDocument:async()=>({id:'one',source:'jobs',routeSlug:'one'})},
      '@/lib/server/imported-job-descriptions':{fetchImportedDescriptionPatch:async()=>({description}),normalizeImportedDescription:(s:string)=>s},
      '@/lib/server/public-detail-cache':{withPublicDetailCache:(r:Response)=>r},
      '@/lib/utils':{normalizeApplyUrlFields:(r:unknown)=>r},
    });
    const response=await route.GET(new Request('https://example.test/api/jobs/one'),{params:Promise.resolve({id:'one'})});
    if(description.startsWith('Deadline'))assert.equal(response.status,404);
    else {
      assert.ok((await response.json()).job.salaryRange);
      assert.equal(response.headers.get('cache-control'),'no-store');
    }
  }
});

test('slug resolver uses full deadline data and never falls back from an exact expired collision',async()=>{
 const rows=[{id:'expired',slug:'same',active:true,description:'Deadline is August 28, 2026'},{id:'open',slug:'same',active:true}];
 const db={collection:(c:string)=>{let fields:string[]=[];const q={where:()=>q,select:(...f:string[])=>{fields=f;return q},get:async()=>({docs:c==='jobs'?rows.map(row=>({id:row.id,data:()=>fields.length?Object.fromEntries(Object.entries(row).filter(([k])=>fields.includes(k))):row})):[]})};return q;}};
 const route=loadRoute('src/lib/server/public-job-routing.ts',{'@/lib/server/job-slugs':jobSlugs,'@/lib/public-jobs':publicJobs});
 assert.equal(await route.findPublicJobDocument(db,'expired'),null);
 assert.equal(await route.findPublicJobDocument(db,'same--expired'),null);
 assert.equal((await route.findPublicJobDocument(db,'same')).id,'open');
});

test('routing does not resurrect a closed authoritative job through a posts mirror',async()=>{
 const db={collection:(c:string)=>{let activeOnly=false;const q={where:(field:string)=>{if(field==='active')activeOnly=true;return q},get:async()=>({docs:c==='jobs'?(activeOnly?[]:[{id:'same',data:()=>({active:false,status:'closed',slug:'same'})}]):[{id:'same',data:()=>({active:true,status:'active',slug:'same'})}]})};return q;}};
 const route=loadRoute('src/lib/server/public-job-routing.ts',{'@/lib/server/job-slugs':jobSlugs,'@/lib/public-jobs':publicJobs});
 assert.equal(await route.findPublicJobDocument(db,'same'),null);
});
test('collision slugs remain stable after legacy suffix persistence and detail reads never persist route identity',async()=>{
 assert.equal(jobSlugs.buildJobRouteSlug({id:'a',slug:'nurse--a',title:'Nurse'}),'nurse');
 let writes=0;
 const route=loadRoute('src/app/api/jobs/[id]/route.ts',{
  'next/server':next,'@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>({exists:true,id:'a',data:()=>({active:true,title:'Nurse'}),ref:{set:async()=>{writes++}}})})})})},
  '@/lib/server/public-job-routing':{findPublicJobDocument:async()=>({id:'a',source:'posts',routeSlug:'nurse--a'})},
  '@/lib/server/imported-job-descriptions':{normalizeImportedDescription:(s:string)=>s},'@/lib/utils':{normalizeApplyUrlFields:(r:unknown)=>r},
 });
 assert.equal((await route.GET(new Request('http://localhost/api/jobs/nurse--a'),{params:Promise.resolve({id:'nurse--a'})})).status,200);
 assert.equal(writes,0);
});
test('job list retains closed source identities to suppress active mirrors',async()=>{
 const db={collection:(c:string)=>{let activeOnly=false;const q={where:(field:string)=>{if(field==='active')activeOnly=true;return q},get:async()=>({docs:c==='jobs'?(activeOnly?[]:[{id:'same',data:()=>({active:false,status:'closed',slug:'same'})}]):[{id:'same',data:()=>({active:true,status:'active',slug:'same'})}]})};return q;}};
 const route=loadRoute('src/app/api/jobs/route.ts',{'next/server':next,'@/lib/firebase-admin':{getAdminDb:()=>db},'@/lib/server/job-slugs':jobSlugs,'@/lib/public-jobs':publicJobs,'@/lib/server/imported-job-descriptions':{normalizeImportedDescription:(s:string)=>s}});
 assert.equal((await (await route.GET(new Request('http://localhost/api/jobs'))).json()).count,0);
 const landing=readFileSync('src/lib/server/landing-content.ts','utf8');
 assert.doesNotMatch(landing.slice(landing.indexOf('export async function getLatestJobs')),/collection\("jobs"\)\.where\("active"/);
});
test('employer filters run after authoritative merge and homepage stats retain closed identities',async()=>{
 const route=loadRoute('src/app/api/jobs/route.ts',{
  'next/server':next,
  '@/lib/firebase-admin':{getAdminDb:()=>({collection:(c:string)=>{let filtered=false;const q={where:(field:string)=>{if(field==='employerId')filtered=true;return q},get:async()=>({docs:filtered?[]:[{id:'same',data:()=>c==='jobs'?{active:false,orgId:'org-1',title:'Closed'}:{status:'active',type:'job',orgId:'org-1',title:'Closed'}}]})};return q}})},
  '@/lib/server/imported-job-descriptions':{normalizeImportedDescription:(s:string)=>s},
  '@/lib/server/job-slugs':jobSlugs,'@/lib/public-jobs':publicJobs,
 });
 const response=await route.GET(new Request('https://example.test/api/jobs?employerId=org-1'));
 assert.equal((await response.json()).count,0);
 const landing=readFileSync('src/lib/server/landing-content.ts','utf8');
 assert.doesNotMatch(landing,/collection\("jobs"\)\.where\("active"/);
});
const next = {NextResponse:{json:(body:unknown, init?:ResponseInit) => Response.json(body,init)}};

test('expiry cron uses full record cutoffs and keeps active/status mirrors aligned', async () => {
  const rows = [
    {id:'prose', active:true,status:'active',description:'Deadline is August 28, 2026'},
    {id:'expiry',active:true,status:'active',closingDate:'2026-10-01',expiresAt:'2026-09-01'},
    {id:'hidden',active:true,status:'archived'},
    {id:'inactive',active:false,status:'active'},
    {id:'unknown',active:true,status:'active'},
  ];
  const writes: Array<{id:string;patch:any}> = [];
  const db = {collection:(collection:string) => ({where:(_field:string,_op:string,value:unknown) => ({get:async()=>({docs:collection === 'jobs' ? rows.filter(r=>r[_field as keyof typeof r]===value).map(row=>({id:row.id,ref:row.id,data:()=>row})) : []})})}), runTransaction:async(callback:any)=>callback({get:async(id:string)=>({exists:true,ref:id,data:()=>rows.find(row=>row.id===id)}),update:(id:string,patch:unknown)=>writes.push({id,patch})})};
  const route = loadRoute('src/app/api/cron/expire-jobs/route.ts', {'next/server':next,'@/lib/firebase-admin':{getAdminDb:()=>db}});
  assert.equal((await route.GET({headers:new Headers()})).status,401);
  assert.equal(writes.length,0);
  assert.equal((await route.GET({headers:new Headers({authorization:'Bearer test-only'})})).status,200);
  assert.equal(writes.find(w=>w.id==='prose')?.patch.status,'expired');
  assert.equal(writes.find(w=>w.id==='expiry')?.patch.active,false);
  assert.equal(writes.find(w=>w.id==='hidden')?.patch.active,false);
  assert.equal(writes.find(w=>w.id==='hidden')?.patch.status,undefined,'do not replace archival status');
  assert.equal(writes.find(w=>w.id==='inactive')?.patch.status,'inactive');
  assert.equal(writes.some(w=>w.id==='unknown'),false);
});

/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import * as storage from '../src/lib/analytics/storage.ts';
import * as types from '../src/lib/analytics/types.ts';
function load(path:string,mocks:Record<string,unknown>,extra:Record<string,unknown>={}){const exports:any={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,console,...extra,require:(id:string)=>{if(mocks[id])return mocks[id];throw Error(id)}});return exports;}
test('collector stores no free text, query, contact URL or caller visitor identifier',async()=>{
 const writes:any[]=[];const ref=(p:string):any=>({collection:(c:string)=>ref(p+'/'+c),doc:(d:string)=>ref(p+'/'+d),path:p});
 const route=load('src/app/api/analytics/event/route.ts',{
  'node:crypto':{createHash},
  'next/server':{NextResponse:{json:(b:unknown,i?:ResponseInit)=>Response.json(b,i)}},
  'firebase-admin/firestore':{FieldValue:{increment:(n:number)=>n,serverTimestamp:()=>0}},
  '@/lib/firebase-admin':{adminDb:{collection:(c:string)=>ref(c),batch:()=>({set:(r:any,v:unknown)=>writes.push({path:r.path,value:v}),commit:async()=>{}})}},
  '@/lib/analytics/storage':storage,'@/lib/analytics/types':types,
  '@/lib/server/app-check':{verifyRequiredAppCheckFromRequest:async()=>true},
  '@/lib/analytics/privacy':privacy(),
 });
 const payload={eventName:'job_apply_click',path:'/jobs/private-email@example.test?token=SECRET',href:'mailto:private-email@example.test',label:'private-email@example.test',title:'Private Person',visitorId:'private-email-example-test'};
 assert.equal((await route.POST({json:async()=>payload})).status,200);
 assert.doesNotMatch(JSON.stringify(writes),/private-email|SECRET|Private Person|visitors/);
 writes.length=0;
 const anonymousId='12345678-1234-4234-8234-123456789abc';
 await route.POST({json:async()=>({eventName:'page_view',path:'/jobs?email=PRIVATE',visitorId:anonymousId})});
 assert.equal(writes.filter(w=>/visitors\/[a-f0-9]{64}$/.test(w.path)).length,1,'preserve aggregate visitors via a daily hash');
 assert.doesNotMatch(JSON.stringify(writes),/12345678-1234|PRIVATE/);
});
test('browser analytics never transmits visitor identity or private URL context',async()=>{
 const sent:any[]=[];
 const client=load('src/lib/analytics/client.ts',{'@/lib/firebase':{getAppCheckTokenValue:async()=> 'fictional-appcheck'},'@/lib/analytics/privacy':privacy(),'./privacy':privacy()}, {window:{location:{pathname:'/jobs/private',search:'?token=SECRET'},localStorage:{getItem:()=> 'private-identity'}},document:{title:'Private Person',referrer:'https://example.test/?email=private'},fetch:async(_u:unknown,o:any)=>{sent.push(JSON.parse(o.body))}});
 client.trackAnalyticsEvent('page_view',{visitorId:'private-identity',label:'Private Person'});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.doesNotMatch(JSON.stringify(sent),/private|SECRET|Private/);assert.equal(sent[0].path,'/jobs');
 const ga=readFileSync('src/components/GoogleAnalytics.tsx','utf8');
 assert.doesNotMatch(ga,/window\.location\.(href|search)|document\.title/);assert.match(ga,/send_page_view: false/);assert.match(ga,/analyticsPath/);
});
test('job funnel milestones are wired to result/detail/start and confirmed receipt only',()=>{
 const list=readFileSync('src/app/jobs/page.tsx','utf8');const detail=readFileSync('src/app/jobs/[slug]/page.tsx','utf8');const apply=readFileSync('src/app/jobs/[slug]/apply/page.tsx','utf8');
 assert.match(list,/trackJobFunnelEvent\("job_search_results"/);
 assert.match(detail,/trackJobFunnelEvent\("job_detail_view"/);assert.match(detail,/trackJobFunnelEvent\("external_application_click"/);
 assert.match(apply,/trackJobFunnelEvent\("application_start"/);
 assert.ok(apply.indexOf('trackJobFunnelEvent("application_submitted"')>apply.indexOf('if (!response.ok) throw'));
});
test('browser preserves random anonymous visitor counting but ignores caller visitor IDs',async()=>{
 const sent:any[]=[];const random='12345678-1234-4234-8234-123456789abc';
 const client=load('src/lib/analytics/client.ts',{'@/lib/firebase':{getAppCheckTokenValue:async()=> 'fictional'},'./privacy':privacy()},{window:{location:{pathname:'/jobs'},localStorage:{getItem:()=>random}},fetch:async(_u:unknown,o:any)=>{sent.push(JSON.parse(o.body))}});
 client.trackAnalyticsEvent('page_view',{visitorId:'personal-identity'});await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(sent[0].visitorId,random);assert.doesNotMatch(JSON.stringify(sent),/personal-identity/);
});
function privacy(){try{return load('src/lib/analytics/privacy.ts',{})}catch{return {}}}

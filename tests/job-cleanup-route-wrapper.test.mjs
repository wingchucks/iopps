import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { redirect } from 'next/navigation.js';
test('actual server page issues Next 307 before rendering moved client; rollback renders client',async()=>{
 let destination='/jobs/canonical-role--canonical';let calls=0;
 const Client=()=>null;
 const page=sourceModule('src/app/jobs/[slug]/page.tsx',{mocks:{
  '@/lib/firebase-admin':{getAdminDb:()=>({})},
  '@/lib/server/job-aliases':{readJobAliasRedirect:async(_db,slug)=>{calls++;assert.equal(slug,'historic-exact');return destination;}},
  'next/navigation':{redirect}, './JobDetailClient':{default:Client,__esModule:true},
 }});
 await assert.rejects(page.default({params:Promise.resolve({slug:'historic-exact'})}),error=>error.digest==='NEXT_REDIRECT;replace;/jobs/canonical-role--canonical;307;');
 destination=null;
 const rendered=await page.default({params:Promise.resolve({slug:'historic-exact'})});assert.equal(rendered.type,Client);assert.equal(calls,2);
});
test('a failed or hung alias lookup renders the job page instead of an error page or a held request',async()=>{
 const Client=()=>null;
 const load=(readJobAliasRedirect,globals={})=>sourceModule('src/app/jobs/[slug]/page.tsx',{globals,mocks:{
  '@/lib/firebase-admin':{getAdminDb:()=>({})},
  '@/lib/server/job-aliases':{readJobAliasRedirect},
  'next/navigation':{redirect}, './JobDetailClient':{default:Client,__esModule:true},
 }});
 const params=Promise.resolve({slug:'historic-exact'});
 // As in an emulator run without Google credentials on the REST transport.
 const failed=await load(async()=>{throw new Error('Could not load the default credentials');}).default({params});
 assert.equal(failed.type,Client);
 const timers=[];
 const hung=load(()=>new Promise(()=>{}),{setTimeout:fn=>timers.push(fn),clearTimeout(){}}).default({params});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(timers.length,1,'the alias lookup is bounded');
 timers[0]();
 assert.equal((await hung).type,Client);
});
test('actual POST route only invokes read-only alias handler, returns no private fields',async()=>{
 const db={runTransaction:async(fn)=>fn({get:async(ref)=>ref.query?{docs:[],size:0}:{exists:false}}),collection:()=>({doc:()=>({}),where:()=>({limit:()=>({query:true})})})};
 const route=sourceModule('src/app/api/jobs/aliases/route.ts',{mocks:{'@/lib/firebase-admin':{getAdminDb:()=>db}}});
 const result=await route.POST(new Request('http://local/api/jobs/aliases',{method:'POST',body:JSON.stringify({ids:['missing']})}));
 assert.equal(result.status,200);assert.deepEqual(await result.json(),{aliases:[]});
});

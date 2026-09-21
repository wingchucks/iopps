import test from 'node:test';
import assert from 'node:assert/strict';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
type MockData = Record<string,unknown>;
type MockRef = {path:string;id:string;parent:{id:string}};
type MockFilter = [field:string,operator:string,value:unknown];
interface MockQuery {
 collection:string;filters:MockFilter[];bound:number;
 doc(id:string):MockRef;
 where(...filter:MockFilter):MockQuery;
 limit(n:number):MockQuery;
}
import { handleJobAliases, readJobAliasRedirect } from '../src/lib/server/job-aliases.ts';
import { updateImportedJobWithEditorialGuard, cleanupWriteAllowed } from '../src/lib/server/job-cleanup-guards.ts';
import { createImportedJobOnce } from '../src/lib/server/feed-import-identity.ts';
import { cleanupSourceDocId } from '../src/lib/server/job-cleanup-contract.ts';
const url='https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=11111111-1111-1111-1111-111111111111&jobId=R';
const key='adp:11111111-1111-1111-1111-111111111111:R';
const alias={schemaVersion:1,active:true,kind:'duplicate',originalId:'old',canonicalId:'new',sourceKey:key,auditId:'a',slugs:['old-role'],redirectStatus:307};
const canonical={active:true,slug:'role',employerId:'tsRvNLiRWARbOoiBOiEVFDwFfZn2',externalUrl:url};
const source={schemaVersion:1,active:true,sourceKey:key,canonicalId:'new',blockedEmployerIds:['blocked'],auditId:'a'};
function store(initial:Record<string,MockData>={}) {
 const data=new Map(Object.entries(initial)),writes:[string,MockData][]=[];
 const snapshot=(path:string)=>({id:path.split('/').at(-1),exists:data.has(path),data:()=>data.get(path)});
 const query=(collection:string,filters:MockFilter[]=[],bound=Infinity):MockQuery=>({collection,filters,bound,
  doc:(id:string)=>({path:`${collection}/${id}`,id,parent:{id:collection}}),
  where:(...filter:MockFilter)=>query(collection,[...filters,filter],bound),limit:(n:number)=>query(collection,filters,n)});
 const tx={get:async(ref:MockRef|MockQuery)=>{
  if('path' in ref)return snapshot(ref.path);
  const docs=[...data.keys()].filter(path=>path.startsWith(ref.collection+'/')).filter(path=>ref.filters.every(([field,op,value])=>{const stored=data.get(path)![field];return op==='array-contains'?Array.isArray(stored)&&stored.includes(value):stored===value;})).slice(0,ref.bound).map(snapshot);
  return {docs,size:docs.length,empty:!docs.length};
 },update:(ref:MockRef,patch:MockData)=>writes.push([ref.path,patch]),create:(ref:MockRef,patch:MockData)=>writes.push([ref.path,patch])};
 const db={collection:query,runTransaction:async(fn:(tx:Transaction)=>Promise<unknown>)=>fn(tx as unknown as Transaction)};
 return {data,writes,tx:tx as unknown as Transaction,db:db as unknown as Firestore};
}
const request=(ids:unknown)=>new Request('http://local/api/jobs/aliases',{method:'POST',body:JSON.stringify({ids})});
test('actual read-only handler projects only public identity, supports reverse equivalence, never writes',async()=>{
 const s=store({'jobAliases/old':alias,'jobs/new':canonical});
 for(const ids of [['old'],['new'],['old','old','new']]) {
  const result=await handleJobAliases(request(ids),s.db);
  assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(await result.json(),{aliases:[{originalId:'old',canonicalId:'new',destination:'/jobs/role--new'}]});
 }
 assert.deepEqual(s.writes,[]);
});
test('alias rejects an unparseable conflicting destination and direct-ID collision',async()=>{
 const s=store({'jobAliases/old':alias,'jobs/new':{...canonical,applicationUrl:'https://example.com/other'}});
 assert.deepEqual((await (await handleJobAliases(request(['old']),s.db)).json()).aliases,[]);
 s.data.set('jobs/new',canonical);s.data.set('jobs/old-role',{slug:'different'});
 assert.equal(await readJobAliasRedirect(s.db,'old-role'),null);
});
test('handler rejects invalid IDs and oversized input before storage',async()=>{
 for(const ids of [['a/b'],[''],Array(51).fill('old'),null,[42]]) assert.equal((await handleJobAliases(request(ids),{} as unknown as Firestore)).status,400);
});
test('saturated reverse lookup refuses partial equivalence',async()=>{
 const records:Record<string,MockData>={'jobs/new':canonical};for(let i=0;i<51;i++) records['jobAliases/old'+i]={...alias,originalId:'old'+i};
 assert.equal((await handleJobAliases(request(['new']),store(records).db)).status,503);
});
test('exact historic redirect only, reject ambiguous slugs and chains, no title/suffix fallback',async()=>{
 const s=store({'jobAliases/old':alias,'jobs/new':canonical});
 assert.equal(await readJobAliasRedirect(s.db,'old-role'),'/jobs/role--new');
 for(const value of ['old','other--old','OLD-ROLE','role'])assert.equal(await readJobAliasRedirect(s.db,value),null);
 s.data.set('posts/collision',{slug:'old-role'});assert.equal(await readJobAliasRedirect(s.db,'old-role'),null);
 s.data.delete('posts/collision');s.data.set('jobAliases/new',{...alias,originalId:'new',canonicalId:'third'});
 assert.equal(await readJobAliasRedirect(s.db,'old-role'),null);
});
test('write-time cleanup suppression composes before normalization for jobs and mirrors',async()=>{
 for(const collection of ['jobs','posts']){
  const s=store({[collection+'/old']:{externalUrl:url,employerId:'blocked'},'jobCleanupGuards/old':{...alias,active:true}});
  await updateImportedJobWithEditorialGuard(s.db,s.db.collection(collection).doc('old'),{active:true},()=>{throw Error('must not normalize');});
  assert.deepEqual(s.writes,[]);
 }
});
test('source suppression survives title/date changes and only blocks original employer lane',async()=>{
 const s=store({['jobCleanupSources/'+cleanupSourceDocId(key)]:source});
 const base={feedId:'feed',externalId:'R',externalUrl:url,employerId:'blocked',title:'changed title',location:'changed location',publishedAt:'2026-01-01'};
 assert.equal(await createImportedJobOnce(s.db,base),false);assert.deepEqual(s.writes,[]);
 assert.equal(await createImportedJobOnce(s.db,{...base,employerId:'different'}),true);assert.equal(s.writes.length,2);
});
test('old URL and fallback URL remain guarded when incoming source changes',async()=>{
 const s=store({['jobCleanupSources/'+cleanupSourceDocId(key)]:source});
 for(const field of ['externalUrl','applicationUrl','externalApplyUrl','applyUrl','sourceUrl']){
  assert.equal(await cleanupWriteAllowed(s.db,s.tx,'x',{[field]:url,employerId:'blocked'},{externalUrl:'https://example.com'}),false);
 }
 assert.equal(await cleanupWriteAllowed(s.db,s.tx,'x',{externalUrl:url},{}),false);
 s.data.set('jobCleanupSources/'+cleanupSourceDocId(key),{...source,schemaVersion:99,active:false});
 assert.equal(await cleanupWriteAllowed(s.db,s.tx,'x',{externalUrl:url,employerId:'different'},{}),false);
});
test('transaction retry sees cleanup installed after first attempt and queues no second write',async()=>{
 const s=store({'jobs/old':{employerId:'blocked',externalUrl:url}});
 s.db.runTransaction=async(fn)=>{await fn(s.tx);assert.equal(s.writes.length,1);s.writes.length=0;s.data.set('jobCleanupGuards/old',{...alias,active:true});return fn(s.tx);};
 const result=await updateImportedJobWithEditorialGuard(s.db,s.db.collection('jobs').doc('old'),{active:true},text=>text);
 assert.deepEqual(result,{});assert.deepEqual(s.writes,[]);
});

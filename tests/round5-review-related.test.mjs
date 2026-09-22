import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceModule } from './helpers/security-fixtures.mjs';
const {mergePublicJobRecords}=sourceModule('src/lib/public-job-merge.ts');
const page=fs.readFileSync('src/app/jobs/[slug]/JobDetailClient.tsx','utf8');
const exports={};
vm.runInNewContext(ts.transpileModule('export '+page.slice(page.indexOf('function RelatedJobList(')),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,require:id=>{assert.equal(id,'react/jsx-runtime');return runtime;},mergePublicJobRecords,
 Link:({children,href})=>React.createElement('a',{href},children),Card:({children})=>React.createElement('div',{},children),resolveApplicationDestination:()=>({label:'Apply'}),
});
const shared={title:'Advisor',employerId:'org',employerName:'Example',location:'Town',description:'Full source description',closingDate:'2099-01-01',active:true,status:'active'};
async function related(records,section='employerJobs') {
 const query={limit(){return this;},async get(){return {docs:records.map(row=>({id:row.id,data:()=>row}))};}};
 const current=section==='employerJobs'?{employerId:'org'}:{category:'care'};
 const db={collection(){return {doc:id=>({get:async()=>({id,exists:true,data:()=>current})}),where:()=>query};}};
 const {GET}=sourceModule('src/app/api/jobs/[id]/related/route.ts',{mocks:{'next/server':{NextResponse:{json:Response.json}},'@/lib/firebase-admin':{getAdminDb:()=>db},'@/lib/server/public-job-routing':{findPublicJobDocument:async()=>({source:'jobs',id:'current'})},'@/lib/server/job-slugs':{buildJobRouteSlug:row=>row.id},'@/lib/public-jobs':{isPublicJobVisible:()=>true},'@/lib/server/public-detail-cache':{withPublicDetailCache:response=>response}}});
 const response=await GET(new Request('https://example.invalid'),{params:Promise.resolve({id:'current'})});assert.equal(response.status,200);
 return (await response.json())[section];
}
for(const section of ['employerJobs','similarJobs'])for(const [name,a,b] of [
 ['structured salary',{salary:{min:50000,max:60000}},{salary:{min:100000,max:120000}}],
 ['same salary display conflicting ranges',{salary:{display:'Competitive',min:50000}},{salary:{display:'Competitive',min:100000}}],
 ['location',{location:'Town A'},{location:'Town B'}],['intake',{intakeId:'Fall'},{intakeId:'Spring'}],
])test(`L2 actual related API to rendered ${section} preserves ${name}`,async()=>{
 const records=[{...shared,id:'a',...a},{...shared,id:'b',...b}];
 assert.equal(mergePublicJobRecords(records,[]).length,2);
 const rows=await related(records,section);assert.equal(rows.length,2);
 const html=renderToStaticMarkup(React.createElement(exports.RelatedJobList,{title:'Related',jobs:rows}));
 assert.equal((html.match(/href="\/jobs\//g)||[]).length,2);assert.match(html,/\/jobs\/a/);assert.match(html,/\/jobs\/b/);
});
for(const section of ['employerJobs','similarJobs'])test(`L2 ${section} dedupes proven identical raw records before display`,async()=>{
 const rows=await related([{...shared,id:'b',salary:'$50'},{...shared,id:'a',salary:'$50'}],section);
 assert.equal(rows.length,1);assert.equal(rows[0].id,'a');assert.equal(rows[0].salary,'$50');
 const html=renderToStaticMarkup(React.createElement(exports.RelatedJobList,{title:'Related',jobs:rows}));assert.equal((html.match(/href="\/jobs\//g)||[]).length,1);
});

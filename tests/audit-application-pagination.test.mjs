import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(count, role='owner') {
 const records=Array.from({length:count},(_,i)=>({id:String(i).padStart(5,'0'),userId:'member',jobId:'job',status:'submitted',...(i%3===0?{employerId:'employer'}:i%3===1?{orgId:'org'}:{employerId:'employer',orgId:'org'})}));
 records.push({id:'foreign',employerId:'other',userId:'secret'});
 const reads=[];
 function collection(name) { let field,owners,after='',cap=Infinity;const q={where(f,_op,v){field=f;owners=v;return q;},orderBy(){return q;},startAfter(v){after=v;return q;},limit(v){cap=v;return q;},async get(){reads.push({name,cap});return {docs:records.filter(r=>owners.includes(r[field])&&r.id>after).sort((a,b)=>a.id<b.id?-1:1).slice(0,cap).map(r=>({id:r.id,data:()=>r}))};},doc(){return {get:async()=>({exists:false})};}};return q;}
 class EmployerApiError extends Error {constructor(status,message){super(message);this.status=status;}}
 const exports={};const imports={'next/server':{NextResponse:{json:(body,init)=>({status:init?.status??200,json:async()=>JSON.parse(JSON.stringify(body))})}},'firebase-admin/firestore':{FieldPath:{documentId:()=> '__name__'}},'@/lib/firebase-admin':{getAdminDb:()=>({collection})},'@/lib/server/employer-auth':{EmployerApiError,requireEmployerContext:async()=>({employerId:'employer',orgId:'org',orgRole:role})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/employer/applications/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,console:{error(){}},require:id=>{assert.ok(imports[id],id);return imports[id];}});
 return {get:cursor=>exports.GET({url:'http://localhost/api/employer/applications'+(cursor===undefined?'':'?cursor='+encodeURIComponent(cursor)),nextUrl:new URL('http://localhost/api/employer/applications'+(cursor===undefined?'':'?cursor='+encodeURIComponent(cursor)))}),reads};
}
for(const count of [0,1,200,201,601])test(`all ${count} mixed-owner applications are reachable once through bounded pages`,async()=>{
 const h=harness(count),ids=[];let cursor;
 for(let i=0;i<10;i++){const response=await h.get(cursor);assert.equal(response.status,200);const data=await response.json();assert.ok(data.applications.length<=200);assert.equal(typeof data.hasMore,'boolean','response must expose truncation');ids.push(...data.applications.map(a=>a.id));if(!data.hasMore){assert.equal(data.nextCursor,null);break;}assert.ok(data.nextCursor&&data.nextCursor!==cursor);cursor=data.nextCursor;}
 assert.equal(ids.length,count);assert.equal(new Set(ids).size,count);assert.ok(!ids.includes('foreign'));assert.ok(h.reads.every(r=>r.cap<=201));
});
test('malformed cursor is rejected without reading application collections',async()=>{const h=harness(2);const response=await h.get('bad/path');assert.equal(response.status,400);assert.equal(h.reads.length,0);});
test('member role cannot paginate employer applications',async()=>{const h=harness(201,'member');assert.equal((await h.get()).status,403);assert.equal(h.reads.length,0);});

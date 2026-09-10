import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
for(const route of ['sync-feeds','expire-events']) test(`${route} rejects missing configuration before database or provider access`,async()=>{
 const source=readFileSync(`src/app/api/cron/${route}/route.ts`,'utf8');
 for(const secret of [undefined,'']) for(const header of [null,'Bearer undefined','Bearer ']) {
  const exports:Record<string,unknown>={};let accessed=false;
  const db=new Proxy({},{get(){accessed=true;throw Error('Unexpected DB access');}});
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env:{CRON_SECRET:secret}},console:{error(){}},Response,Date,require:(name:string)=>name==='next/server'?{NextResponse:Response}:name==='@/lib/firebase-admin'?{adminDb:db,getAdminDb(){accessed=true;throw Error('Unexpected DB access');}}:{} });
  const response=await (exports.GET as (r:Request)=>Promise<Response>)(new Request('https://example.invalid/api/cron/'+route,{headers:header?{authorization:header}:{}}));
  assert.equal(response.status,401);assert.equal(accessed,false);
 }
});

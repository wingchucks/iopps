import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule,offlineNetwork} from './helpers/security-fixtures.mjs';
function fixture(){
 const stored=new Map(),net=offlineNetwork();
 const db={collection:name=>({doc:id=>({id,path:name+'/'+id}),where:(field,op,value)=>{
   assert.equal(op,'==');
   let bound=Infinity;
   return {limit(n){bound=n;return this;},get:async()=>({docs:[...stored].filter(([path,data])=>path.startsWith(name+'/')&&data[field]===value).slice(0,bound).map(([path,data])=>({id:path.slice(name.length+1),data:()=>data}))})};
  }}),runTransaction:async callback=>callback({get:async ref=>({exists:stored.has(ref.path),data:()=>stored.get(ref.path)}),create:(ref,data)=>{assert.equal(stored.has(ref.path),false);stored.set(ref.path,data);}})};
 const {POST}=sourceModule('src/app/api/admin/import-jobs/route.ts',{...net,globals:{...net.globals,process:{env:{CRON_SECRET:'fictional'}}},mocks:{...net.mocks,'@/lib/firebase-admin':{getAdminDb:()=>db},'next/server':{NextResponse:{json:Response.json}}}});
 const job={title:'Accountant',company:'Fictional Employer',location:'Town',externalUrl:'https://fixture.invalid/job',externalId:'REQ-A',description:'Original approved copy.',descriptionFormat:'plain-text'};
 return {stored,net,job,call:jobs=>POST(new Request('https://fixture.invalid/import',{method:'POST',headers:{'content-type':'application/json','x-cron-secret':'fictional'},body:JSON.stringify({jobs})}))};
}
for(const [category,expected] of [['Social Services','Social Services'],['Nursing','Health & Wellness'],['Unreviewed provider label','Unreviewed provider label']])test(`B2 actual batch preserves explicit ${category}`,async()=>{
 const h=fixture(),input={...h.job,category};assert.equal((await h.call([input])).status,200);
 const [key,data]=[...h.stored].find(([key])=>key.startsWith('jobs/'));
 assert.equal(data.category,expected);assert.equal(data.description,h.job.description);assert.equal(data.externalId,'REQ-A');assert.equal(data.source,'google-alerts');
 const identity=sourceModule('src/lib/server/feed-import-identity.ts').feedImportIdentity(data);
 assert.equal(key,'jobs/import-'+identity);assert.equal(data.importIdentity,identity);
 const before=JSON.stringify([...h.stored]);const retry=await h.call([{...input,category:'Finance'}]);assert.equal((await retry.json()).skipped,1);assert.equal(JSON.stringify([...h.stored]),before);assert.deepEqual(h.net.connections,[]);
});
test('B2 actual batch infers only when category property is absent',async()=>{
 const h=fixture();assert.equal((await h.call([h.job])).status,200);assert.equal([...h.stored].find(([key])=>key.startsWith('jobs/'))[1].category,'Finance');
});
for(const category of [null,false,0,[],{},'', '   '])test(`B2 rejects malformed explicit ${JSON.stringify(category)} before any batch write`,async()=>{
 const h=fixture();const response=await h.call([h.job,{...h.job,externalId:'REQ-B',category}]);assert.equal(response.status,400);assert.equal(h.stored.size,0);assert.deepEqual(h.net.connections,[]);
});

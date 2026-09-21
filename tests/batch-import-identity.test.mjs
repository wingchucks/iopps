import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule,offlineNetwork} from './helpers/security-fixtures.mjs';

test('batch import is idempotent while distinct locations and source IDs survive',async()=>{
 const stored=new Map();let serial=0;
 const snapshot=ref=>({id:ref.id,exists:stored.has(ref.path),data:()=>stored.get(ref.path)});
 const db={collection:name=>({doc:(id=String(++serial))=>({id,path:name+'/'+id}),where:()=>({limit(){return this;},get:async()=>({empty:true,docs:[]})})}),batch:()=>({set:(ref,data)=>stored.set(ref.path,data),commit:async()=>{}}),runTransaction:async callback=>callback({get:async ref=>snapshot(ref),create:(ref,data)=>{assert.equal(stored.has(ref.path),false);stored.set(ref.path,data);}})};
 const net=offlineNetwork();const route=sourceModule('src/app/api/admin/import-jobs/route.ts',{...net,globals:{...net.globals,process:{env:{CRON_SECRET:'fictional'}}},mocks:{...net.mocks,'@/lib/firebase-admin':{getAdminDb:()=>db},'next/server':{NextResponse:{json:Response.json}}}});
 const job={title:'Fictional Trainee Advisor',company:'Fictional Employer',location:'OLeary, PE',externalUrl:'https://example.invalid/careers',externalId:'REQ-A'};
 async function call(value){return route.POST(new Request('https://fixture.invalid/import',{method:'POST',headers:{'content-type':'application/json','x-cron-secret':'fictional'},body:JSON.stringify({jobs:[value]})}));}
 for(const item of [job,job,{...job,location:'Kenora, ON'},{...job,externalId:'req-a'}])assert.equal((await call(item)).status,200);
 assert.equal([...stored.keys()].filter(key=>key.startsWith('jobs/')).length,3);
 assert.equal([...stored.keys()].filter(key=>key.startsWith('feedImportIdentities/')).length,3);
});

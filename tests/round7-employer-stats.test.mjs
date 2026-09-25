import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './helpers/security-fixtures.mjs';

test('employer statistics exclude deletion tombstones and their application counts',async()=>{
 const jobs=[{id:'active',data:()=>({status:'active',active:true})},{id:'draft',data:()=>({status:'draft',active:false})},{id:'closed',data:()=>({status:'closed',active:false})},{id:'deleted',data:()=>({status:'deleted',active:true})},{id:'marked',data:()=>({status:'active',deletedAt:'fictional'})}],applicationReads=[];
 const db={collection(name){return {doc(){return {get:async()=>({exists:true,data:()=>({orgId:'fictional-org',role:'employer'})}),collection:()=>({where:()=>({get:async()=>{throw Error('views must use an aggregate count');},count:()=>({get:async()=>({data:()=>({count:4})})})})})};},where(field,op,id){assert.equal(op,'==');return {get:async()=>{if(name==='jobs')return {docs:jobs,size:jobs.length};if(name==='applications'){applicationReads.push(id);return {size:1};}throw Error(name);}};}};}};
 const {GET}=sourceModule('src/app/api/employer/stats/route.ts',{mocks:{'next/server':{NextResponse:{json:Response.json}},'@/lib/firebase-admin':{adminAuth:{verifyIdToken:async()=>({uid:'fictional-owner'})},adminDb:db}}});
 const response=await GET(new Request('http://localhost/api/employer/stats',{headers:{Authorization:'Bearer fictional'}}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{totalPosts:3,activePosts:1,applications:3,profileViews:4});assert.deepEqual(applicationReads,['active','draft','closed']);
});

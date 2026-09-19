/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as salaryRange from '../src/lib/salary-range.ts';
import { personalProfileUpdates } from '../src/lib/profile-fields.ts';
test('profile API cannot bypass rules to forge organization ownership or admin flags',async()=>{
 let authorized = true;
 const writes:any[]=[];const exports:any={};const mocks:Record<string,unknown>={
 'next/server':{NextResponse:{json:(b:unknown,i?:ResponseInit)=>Response.json(b,i)}},
 '@/lib/account-labels':{ANONYMOUS_MEMBER_NAME:'Member'},
 '@/lib/api-auth':{verifyAuthToken:async()=>authorized?{success:true,decodedToken:{uid:'candidate'}}:{success:false,response:Response.json({error:'Unauthorized'},{status:401})}},
 '@/lib/profile-fields':{personalProfileUpdates},
 '@/lib/salary-range':salaryRange,
 '@/lib/firebase-admin':{getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>({data:()=>({})}),set:async(data:unknown)=>writes.push(data)})})})},
 'firebase-admin/auth':{getAuth:()=>({verifyIdToken:async()=>({uid:'candidate'})})},
 'firebase-admin/app':{getApps:()=>[{}]},'@/lib/email':{sendAdminNewSignup:async()=>{throw Error('No email expected')}}};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/profile/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console,require:(id:string)=>{if(Object.hasOwn(mocks,id))return mocks[id];throw Error(`Unexpected profile test dependency: ${id}`)}});
 const r=await exports.PATCH(new Request('http://localhost/api/profile',{method:'PATCH',headers:{authorization:'Bearer fictional'},body:JSON.stringify({displayName:'Fictional',role:'admin',admin:true,orgId:'victim',employerId:'victim',orgRole:'owner'})}));
 assert.equal(r.status,200);assert.equal(writes[0].displayName,'Fictional');
 for(const key of ['role','admin','orgId','employerId','orgRole'])assert.equal(writes[0][key],undefined,key);
 authorized = false;
 const denied = await exports.PATCH(new Request('http://localhost/api/profile',{method:'PATCH',body:JSON.stringify({displayName:'Must not persist'})}));
 assert.equal(denied.status,401);assert.equal(writes.length,1,'denied request cannot write profile data');
});

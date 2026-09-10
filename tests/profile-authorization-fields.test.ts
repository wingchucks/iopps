/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('profile API cannot bypass protected organization linkage fields',async()=>{
 let saved:Record<string,unknown>={};const exports:any={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/profile/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console,require:(id:string)=>{
  if(id==='next/server')return {NextResponse:{json:(body:unknown,init?:ResponseInit)=>Response.json(body,init)}};
  if(id==='@/lib/account-labels')return {ANONYMOUS_MEMBER_NAME:'Member'};
  if(id==='@/lib/firebase-admin')return {getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>({data:()=>({adminSignupNotifiedAt:'existing'})}),set:async(data:Record<string,unknown>)=>{saved=data}})})})};
  if(id==='firebase-admin/auth')return {getAuth:()=>({verifyIdToken:async()=>({uid:'candidate'})})};
  if(id==='firebase-admin/app')return {getApps:()=>[{}]};
  if(id==='@/lib/email')return {sendAdminNewSignup:()=>{throw Error('No email permitted')}};
  throw Error(id);
 }});
 const response=await exports.PATCH(new Request('http://localhost/api/profile',{method:'PATCH',headers:{authorization:'Bearer fictional'},body:JSON.stringify({displayName:'Fictional',orgId:'victim',employerId:'victim',orgRole:'owner',admin:true})}));
 assert.equal(response.status,200);
 for(const field of ['orgId','employerId','orgRole','admin'])assert.equal(saved[field],undefined,`${field} must not be profile-editable`);
 assert.equal(saved.displayName,'Fictional');
});

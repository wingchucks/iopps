/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated API dependencies; never contacts Firebase. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { accountDestination } from '../src/lib/sign-in-destination.ts';
import { normalizeOrganizationRecord, getBusinessProfileReadiness } from '../src/lib/organization-profile.ts';
import { isSchoolOrganization } from '../src/lib/school-visibility.ts';
class AccountAccessError extends Error { status=403; }
class EmployerApiError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status;} }
function load({member=false,organization=false,blocked=false,unavailable=false,setupComplete=false,signupIntent=""}={}) {
  const exports:any={}; let checks=0;
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/auth/account/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,URLSearchParams,console:{error(){}},require:(id:string)=>{
      if(id==='next/server')return {NextResponse:{json:Response.json}};
      if(id==='@/lib/firebase-admin')return {getAdminAuth:()=>({verifyIdToken:async(token:string)=>{checks++;assert.equal(token,'test-token');return {uid:'fictional'};}}),getAdminDb:()=>({collection:()=>({doc:()=>({get:async()=>{if(unavailable)throw new Error('offline');return {exists:member,data:()=>({})};}})})})};
      if(id==='@/lib/server/account-access')return {AccountAccessError,assertUserCanAccessApp:async()=>{if(blocked)throw new AccountAccessError('Account unavailable');return {userData:{setupComplete,signupIntent}};}};
      if(id==='@/lib/server/employer-auth')return {EmployerApiError,requireEmployerContext:async()=>{if(!organization)throw new EmployerApiError(403,'Not an employer');return {organizationData:{type:'employer',name:'Fictional',description:'A sample',logoUrl:'https://example.test/logo.png',contactEmail:'qa@example.test'},employerData:{}};}};
      if(id==='@/lib/organization-profile')return {normalizeOrganizationRecord,getBusinessProfileReadiness};
      if(id==='@/lib/school-visibility')return {isSchoolOrganization};
      if(id==='@/lib/sign-in-destination')return {accountDestination};
      throw new Error(id);
    },
  });
  return {run:(token=true)=>exports.GET(new Request('https://iopps.ca/api/auth/account',{headers:token?{authorization:'Bearer test-token'}:{}})),checks:()=>checks};
}
test('account routing requires verified credentials and resolves legacy organizations without a member profile',async()=>{
  const h=load({organization:true});
  assert.equal((await h.run(false)).status,401); assert.equal(h.checks(),0);
  const response=await h.run(); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{destination:'/org/dashboard'});
});
test('blocked or unavailable accounts never silently become a new-account setup',async()=>{
  assert.equal((await load({blocked:true}).run()).status,403);
  assert.equal((await load({unavailable:true}).run()).status,503);
  assert.deepEqual(await (await load({member:true}).run()).json(),{destination:'/feed'});
  assert.deepEqual(await (await load().run()).json(),{destination:'/setup'});
});

test('account API reads completion and organization intent from authenticated server records',async()=>{
 assert.deepEqual(await (await load({setupComplete:true}).run()).json(),{destination:'/feed'});
 assert.deepEqual(await (await load({member:true,signupIntent:'organization'}).run()).json(),{destination:'/signup?resume=organization&type=employer'});
 assert.deepEqual(await (await load({organization:true,signupIntent:'organization'}).run()).json(),{destination:'/org/dashboard'});
});

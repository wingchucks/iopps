/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately partial VM/SDK test doubles; real boundaries are exercised separately by emulator tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as pricing from '../src/lib/pricing.ts';
import * as intent from '../src/lib/auth-redirect.ts';
function load(context: any = {uid:'org',orgId:'org',orgRole:'owner'}, authStatus = 0) {
 const calls: any[]=[];
 class EmployerApiError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status} }
 const exports:any={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/stripe/checkout/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,URLSearchParams,console,process:{env:{STRIPE_SECRET_KEY:'sk_test_fictional'}},require:(id:string)=>{
  if(id==='next/server') return {NextResponse:{json:(b:unknown,i?:ResponseInit)=>Response.json(b,i)}};
  if(id==='stripe')return {default:class {checkout={sessions:{create:async(p:unknown)=>{calls.push(p);return {url:'https://checkout.stripe.com/fictional'}}}}}};
  if(id==='@/lib/pricing')return pricing;
  if(id==='@/lib/auth-redirect')return intent;
  if(id==='@/lib/server/employer-auth')return {EmployerApiError,requireEmployerContext:async(req:Request)=>{if(authStatus || !req.headers.has('authorization'))throw new EmployerApiError(authStatus||401,'Unauthorized');return context;}};
  throw Error(id);
 }});
 return {calls,post:(body:unknown,authorized=true)=>exports.POST(new Request('https://www.iopps.ca/api/stripe/checkout',{method:'POST',headers:{origin:'https://attacker.example',...(authorized?{authorization:'Bearer fictional'}:{})},body:JSON.stringify(body)}))};
}
test('checkout validates exact plans and constructs trusted safe continuation URLs',async()=>{
 for(const planId of [undefined,'constructor','toString','__proto__',[],123,'invalid']) {
  const a=load();assert.equal((await a.post({planId})).status,400);assert.equal(a.calls.length,0);
 }
 const a=load();assert.equal((await a.post({planId:'standard-post',redirect:'/org/dashboard/jobs/new'})).status,200);
 assert.equal(a.calls[0].metadata.orgId,'org');
 const success=new URL(a.calls[0].success_url);assert.equal(success.origin,'https://www.iopps.ca');assert.equal(success.searchParams.get('redirect'),'/org/dashboard/jobs/new');
 assert.equal(new URL(a.calls[0].cancel_url).searchParams.get('redirect'),'/org/dashboard/jobs/new');
 const b=load();await b.post({planId:'tier1',redirect:'//attacker.example'});assert.equal(new URL(b.calls[0].success_url).searchParams.has('redirect'),false);
 assert.equal(pricing.getPlanById('constructor'),null);
});
test('checkout UI wiring never defaults a plan and carries authenticated return intent',()=>{
 const checkout=readFileSync('src/app/org/checkout/page.tsx','utf8');
 assert.doesNotMatch(checkout,/params\.plan \|\| "tier1"|: plans\.tier1/);
 assert.match(checkout,/getIdToken/);assert.match(checkout,/Authorization/);assert.match(checkout,/redirect/);
 const success=readFileSync('src/app/org/checkout/success/page.tsx','utf8');
 assert.match(success,/safeAuthRedirect/);assert.doesNotMatch(success,/has been activated|has been added/);
 assert.match(readFileSync('src/app/org/checkout/cancel/page.tsx','utf8'),/authIntentHref/);
});
test('checkout rejects forged profile organization linkage even when role says owner',async()=>{
 const a=load({uid:'attacker',orgId:'org',orgRole:'owner'});
 assert.equal((await a.post({planId:'tier1'})).status,403);assert.equal(a.calls.length,0);
});
test('checkout denies unauthenticated and mismatched organization before Stripe',async()=>{
 const a=load();assert.equal((await a.post({planId:'tier1',orgId:'org'},false)).status,401);assert.equal(a.calls.length,0);
 const b=load();assert.equal((await b.post({planId:'tier1',orgId:'victim'})).status,403);assert.equal(b.calls.length,0);
});

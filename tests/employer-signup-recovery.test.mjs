import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
function load(){return sourceModule('src/lib/server/signup-protection.ts');}
function database(){const rows=new Map();return {collection(name){return {doc(id){return {key:name+'/'+id};},async add() {}};},async runTransaction(fn){return fn({async getAll(...refs){return refs.map(r=>({exists:rows.has(r.key),data:()=>rows.get(r.key)}));},set(ref,data){rows.set(ref.key,data);}});}};}
const base={kind:'employer_upgrade',name:'Fictional Northern Services',contactName:'Fictional Owner',contactEmail:'owner@example.invalid',formStartedAt:Date.now()-10000};
test('unavailable network address does not pool unrelated legitimate organizations into one permanent rejection bucket',async()=>{const db=database(),{evaluateEmployerSignupProtection:evaluate}=load();for(let i=0;i<7;i++){const result=await evaluate(db,{...base,uid:'fictional-'+i,name:base.name+i,contactEmail:`owner${i}@example.invalid`,clientIp:null});assert.equal(result.allow,true,JSON.stringify(result));}});
test('missing IP still rate limits a single authenticated identity across changed organization details',async()=>{const db=database(),{evaluateEmployerSignupProtection:evaluate}=load();let result;for(let i=0;i<7;i++)result=await evaluate(db,{...base,uid:'same-fictional',name:base.name+i,contactEmail:`owner${i}@example.invalid`,clientIp:null});assert.equal(result.status,429);assert.match(result.message,/wait|try again/i);assert.match(result.message,/support@iopps.ca/);});
test('real IP rate limit and high confidence fraud rejection remain enforced',async()=>{const {evaluateEmployerSignupProtection:evaluate}=load();const db=database();let result;for(let i=0;i<7;i++)result=await evaluate(db,{...base,uid:'fictional-'+i,name:base.name+i,contactEmail:`owner${i}@example.invalid`,clientIp:'192.0.2.5'});assert.equal(result.status,429);for(const extra of [{honeypot:'bot'}, {name:'take my exam'}, {contactEmail:'fake@mailinator.com'}]){const blocked=await evaluate(database(),{...base,uid:'fraud',...extra});assert.equal(blocked.allow,false);assert.equal(blocked.hardBlock,true);}});
test('signup client IP comes only from headers Vercel sets, never a caller-chosen cf-connecting-ip',()=>{
 const {getSignupClientIp}=load();
 const ip=headers=>getSignupClientIp(new Request('https://www.iopps.ca/api/employer/signup',{headers}));
 assert.equal(ip({'cf-connecting-ip':'203.0.113.9','x-real-ip':'192.0.2.10','x-forwarded-for':'192.0.2.10'}),'192.0.2.10');
 for(const spoofed of [{'cf-connecting-ip':'203.0.113.9'},{'true-client-ip':'203.0.113.9'},{forwarded:'for=203.0.113.9'}])assert.equal(ip(spoofed),null);
 assert.equal(ip({'x-vercel-forwarded-for':'192.0.2.11','x-real-ip':'192.0.2.12','x-forwarded-for':'192.0.2.12'}),'192.0.2.11');
 assert.equal(ip({'x-forwarded-for':'192.0.2.13, 10.0.0.1'}),'192.0.2.13');
 assert.equal(ip({'x-real-ip':'not-an-address','x-forwarded-for':'2001:db8::1'}),'2001:db8::1');
});
test('rotating cf-connecting-ip neither escapes the network limit nor poisons another network bucket',async()=>{
 const db=database(),{evaluateEmployerSignupProtection:evaluate,getSignupClientIp}=load();
 const attempt=(i,headers)=>evaluate(db,{...base,uid:'rotating-'+i,name:base.name+i,contactEmail:`rotating${i}@example.invalid`,clientIp:getSignupClientIp(new Request('https://www.iopps.ca/api/employer/signup',{headers}))});
 const results=[];for(let i=0;i<6;i++)results.push(await attempt(i,{'x-real-ip':'192.0.2.20','cf-connecting-ip':'198.51.100.'+i}));
 assert.deepEqual(results.map(r=>r.status),[200,200,200,200,200,429]);
 // The spoofed addresses were never charged, so a shared office network keeps its own budget.
 assert.equal((await attempt(6,{'x-real-ip':'198.51.100.1','cf-connecting-ip':'192.0.2.20'})).allow,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/server/signup-protection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,require});return exports;}
function database(){const rows=new Map();return {collection(name){return {doc(id){return {key:name+'/'+id};},async add() {}};},async runTransaction(fn){return fn({async getAll(...refs){return refs.map(r=>({exists:rows.has(r.key),data:()=>rows.get(r.key)}));},set(ref,data){rows.set(ref.key,data);}});}};}
const base={kind:'employer_upgrade',name:'Fictional Northern Services',contactName:'Fictional Owner',contactEmail:'owner@example.invalid',formStartedAt:Date.now()-10000};
test('unavailable network address does not pool unrelated legitimate organizations into one permanent rejection bucket',async()=>{const db=database(),{evaluateEmployerSignupProtection:evaluate}=load();for(let i=0;i<7;i++){const result=await evaluate(db,{...base,uid:'fictional-'+i,name:base.name+i,contactEmail:`owner${i}@example.invalid`,clientIp:null});assert.equal(result.allow,true,JSON.stringify(result));}});
test('missing IP still rate limits a single authenticated identity across changed organization details',async()=>{const db=database(),{evaluateEmployerSignupProtection:evaluate}=load();let result;for(let i=0;i<7;i++)result=await evaluate(db,{...base,uid:'same-fictional',name:base.name+i,contactEmail:`owner${i}@example.invalid`,clientIp:null});assert.equal(result.status,429);assert.match(result.message,/wait|try again/i);assert.match(result.message,/support@iopps.ca/);});
test('real IP rate limit and high confidence fraud rejection remain enforced',async()=>{const {evaluateEmployerSignupProtection:evaluate}=load();const db=database();let result;for(let i=0;i<7;i++)result=await evaluate(db,{...base,uid:'fictional-'+i,name:base.name+i,contactEmail:`owner${i}@example.invalid`,clientIp:'192.0.2.5'});assert.equal(result.status,429);for(const extra of [{honeypot:'bot'}, {name:'take my exam'}, {contactEmail:'fake@mailinator.com'}]){const blocked=await evaluate(database(),{...base,uid:'fraud',...extra});assert.equal(blocked.allow,false);assert.equal(blocked.hardBlock,true);}});

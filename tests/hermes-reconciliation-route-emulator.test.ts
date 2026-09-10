/* eslint-disable @typescript-eslint/no-explicit-any -- VM swaps only public-key configuration and demo database wiring. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,randomBytes,sign } from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import * as api from '../src/lib/server/hermes-reconciliation-api.ts';
import * as adapter from '../src/lib/server/hermes-reconciliation-firestore.ts';
import * as nonce from '../src/lib/server/hermes-firestore-adapter.ts';
import {buildHermesCanonicalRequest} from '../src/lib/server/hermes-machine-auth.ts';
const enabled=process.env.IOPPS_TEST_EMULATORS==='true';
test('actual report route verifies real signatures/nonces, rate limits, and leaves business data unchanged',{skip:!enabled},async t=>{
 process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
 const projectId=`demo-recon-${randomBytes(5).toString('hex')}`;
 const app=initializeApp({projectId},projectId);const db=getFirestore(app);t.after(async()=>{await db.terminate();await deleteApp(app);});
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const exports:any={};
 const source=readFileSync('src/app/api/hermes/v1/reports/billing-publishing/route.ts','utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Response,Request,console:{error(){}},require:(id:string)=>{
  if(id==='@/lib/firebase-admin')return {getAdminDb:()=>db};
  if(id.endsWith('hermes-admin-public-key'))return {IOPPS_HERMES_ADMIN_PUBLIC_KEYS:{fixture:publicKey.export({type:'spki',format:'pem'}).toString(),'fixture-client':publicKey.export({type:'spki',format:'pem'}).toString()}};
  if(id.endsWith('hermes-reconciliation-api'))return api;
  if(id.endsWith('hermes-reconciliation-firestore'))return adapter;
  if(id.endsWith('hermes-firestore-adapter'))return nonce;
  throw Error(`Unexpected route import ${id}`);
 }});
 await db.doc('employers/fixture-owner').set({plan:'free',featuredPostCredits:-1,email:'hidden@example.invalid'});
 const before=await db.doc('employers/fixture-owner').get();
 function request(){const url='http://127.0.0.1'+api.RECONCILIATION_PATH,body='{"report":"billing-publishing-v1"}',timestamp=String(Math.floor(Date.now()/1000)),n=randomBytes(20).toString('base64url'),idempotencyKey='qa';
  return new Request(url,{method:'POST',headers:{'content-type':'application/json','content-length':String(Buffer.byteLength(body)),'x-hermes-key-id':'fixture','x-hermes-timestamp':timestamp,'x-hermes-nonce':n,'x-hermes-idempotency-key':idempotencyKey,'x-hermes-signature':sign(null,Buffer.from(buildHermesCanonicalRequest({method:'POST',url,body,timestamp,nonce:n,idempotencyKey})),privateKey).toString('base64url')},body});
 }
 const first=request(),copy=first.clone();const response=await exports.POST(first);assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.report.potentialIssues.invalidEmployerCreditRecords,1);
 assert.ok(!JSON.stringify(data).includes('hidden@example.invalid'));
 assert.equal((await exports.POST(copy)).status,409);
 assert.equal((await exports.POST(request())).status,429);
 const bad=request();bad.headers.set('x-hermes-signature','A'.repeat(86));assert.equal((await exports.POST(bad)).status,401);
 const after=await db.doc('employers/fixture-owner').get();assert.equal(after.updateTime?.toMillis(),before.updateTime?.toMillis());assert.deepEqual(after.data(),before.data());
 assert.equal((await db.collection('hermesAdminNonces').get()).size,2);
 assert.equal((await db.collection('hermesReconciliationRateLimits').get()).size,1);
 const server=http.createServer(async(req,res)=>{
  try {
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
   const request=new Request(`http://127.0.0.1${req.url}`,{method:'POST',headers:req.headers as Record<string,string>,body:Buffer.concat(chunks)});
   const response=await exports.POST(request);res.writeHead(response.status,Object.fromEntries(response.headers.entries()));res.end(await response.text());
  }catch{res.writeHead(500).end();}
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'iopps-report-client-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
 const bodyFile=path.join(folder,'body.json');await fs.writeFile(bodyFile,'{"report":"billing-publishing-v1"}');
 const env:Record<string,string>={};for(const key of ['SYSTEMROOT','WINDIR','PATH','TEMP','TMP'])if(process.env[key])env[key]=process.env[key]!;
 Object.assign(env,{HERMES_ADMIN_PRIVATE_KEY_PEM:privateKey.export({type:'pkcs8',format:'pem'}).toString(),HERMES_ADMIN_KEY_ID:'fixture-client',HERMES_ADMIN_IDEMPOTENCY_KEY:'report-client-test',HERMES_ADMIN_ALLOW_HTTP_LOCALHOST:'true',HERMES_ADMIN_BASE_URL:`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`});
 const child=spawn(process.execPath,['scripts/hermes-admin-client.mjs','reconciliation-report',bodyFile],{env,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
 const exit=await new Promise<number|null>(resolve=>child.on('exit',resolve));assert.equal(exit,0,output);assert.match(output,/200 OK/);assert.match(output,/"invalidEmployerCreditRecords":1/);
});

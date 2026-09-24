import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {handleImportInventoryRequest} from '../src/lib/server/hermes-import-inventory-api.ts';
test('actual inventory CLI signs exact request and exits nonzero on rejection',async()=>{
 const tmp=await mkdtemp(path.join(process.env.TMPDIR||os.tmpdir(),'inventory-client-'));
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');let calls=0,reads=0,reject=false;
 const body='{"report":"import-inventory-v1"}';const file=path.join(tmp,'request.json');await writeFile(file,body);
 const server=createServer(async(req,res)=>{try{calls++;assert.equal(req.url,'/api/hermes/v1/reports/import-inventory');assert.equal(req.method,'POST');assert.equal(req.headers['content-length'],String(Buffer.byteLength(body)));const chunks=[];for await(const c of req)chunks.push(c);const raw=Buffer.concat(chunks).toString();assert.equal(raw,body);const response=await handleImportInventoryRequest(new Request(origin+req.url,{method:'POST',headers:req.headers,body:raw}),{publicKeys:{fixture:publicKey.export({type:'spki',format:'pem'})},reportKeyIds:reject?[]:['fixture'],consumeNonce:async()=>true,readInventory:async()=>{reads++;return {snapshotComplete:true};}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch{res.writeHead(500);res.end('fixture failure');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const env=Object.fromEntries(['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));Object.assign(env,{HERMES_ADMIN_BASE_URL:origin,HERMES_ADMIN_ALLOW_HTTP_LOCALHOST:'true',HERMES_ADMIN_KEY_ID:'fixture',HERMES_ADMIN_IDEMPOTENCY_KEY:randomUUID(),HERMES_ADMIN_PRIVATE_KEY_PEM:privateKey.export({type:'pkcs8',format:'pem'})});
 async function run(){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/hermes-admin-client.mjs','import-inventory',file],{env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);child.once('error',reject);child.once('exit',code=>resolve({code,output}));});}
 try{const good=await run();assert.equal(good.code,0,good.output);assert.equal(reads,1);reject=true;const bad=await run();assert.notEqual(bad.code,0);assert.equal(calls,2);assert.equal(reads,1);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(tmp,{recursive:true,force:true});}
});

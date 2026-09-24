import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {buildHermesCanonicalRequest} from '../src/lib/server/hermes-machine-auth.ts';
const moduleUrl=new URL('../src/lib/server/hermes-import-inventory-api.ts',import.meta.url);
const path='/api/hermes/v1/reports/import-inventory',body='{"report":"import-inventory-v1"}';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const pem=publicKey.export({type:'spki',format:'pem'});
function signed(payload=body,changes={}){
 const url='https://iopps.ca'+path,timestamp=String(Math.floor(Date.now()/1000)),nonce=randomUUID(),idempotencyKey=randomUUID();
 const signature=sign(null,Buffer.from(buildHermesCanonicalRequest({method:'POST',url,timestamp,nonce,idempotencyKey,body:payload})),privateKey).toString('base64url');
 return new Request(url,{method:'POST',body:payload,headers:{'content-type':'application/json','content-length':String(Buffer.byteLength(payload)),'x-hermes-key-id':'test-key','x-hermes-timestamp':timestamp,'x-hermes-nonce':nonce,'x-hermes-idempotency-key':idempotencyKey,'x-hermes-signature':signature,...changes}});
}
async function handler(){const mod=await import(moduleUrl.href).catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});assert.equal(typeof mod.handleImportInventoryRequest,'function','signed import inventory handler must exist');return mod.handleImportInventoryRequest;}
function deps(){let reads=0;const nonces=new Set();return {get reads(){return reads;},publicKeys:{'test-key':pem},reportKeyIds:['test-key'],consumeNonce:async({nonceHash})=>{if(nonces.has(nonceHash))return false;nonces.add(nonceHash);return true;},readInventory:async()=>{reads++;return {snapshotComplete:true,coverage:'fixed-import-membership-projected-snapshot-v1',historicalCoverage:'not-established',providerVerified:false,records:{}};}};}
test('signed fixed inventory request reads once and returns explicit coverage without caching',async()=>{const h=await handler(),d=deps();const r=await h(signed(),d);assert.equal(r.status,200);assert.equal(d.reads,1);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal((await r.json()).report.historicalCoverage,'not-established');});
test('replay, bad signature and unauthorized report key never read inventory',async()=>{const h=await handler(),d=deps(),r=signed(),copy=r.clone();assert.equal((await h(r,d)).status,200);assert.equal((await h(copy,d)).status,409);assert.equal(d.reads,1);const denied=deps();denied.reportKeyIds=[];assert.equal((await h(signed(),denied)).status,403);assert.equal(denied.reads,0);assert.equal((await h(signed(body,{'x-hermes-signature':'A'.repeat(86)}),deps())).status,401);});
test('noncanonical contracts and oversized body never read inventory',async()=>{const h=await handler();for(const value of ['{"report":"import-inventory-v1","report":"import-inventory-v1"}','{"report":"import-inventory-v1","path":"users"}','\ufeff'+body,' '.repeat(129)]){const d=deps();const r=await h(signed(value),d);assert.ok(r.status>=400);assert.equal(d.reads,0);}});
test('datastore failure has no partial inventory or upstream error details',async()=>{const h=await handler(),d=deps();d.readInventory=async()=>{throw new Error('secret upstream URL token');};const r=await h(signed(),d);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret|token|records/);});

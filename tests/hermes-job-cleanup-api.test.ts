import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign} from 'node:crypto';
import {handleJobCleanupRequest} from '../src/lib/server/hermes-job-cleanup-api.ts';
import {buildHermesCanonicalRequest} from '../src/lib/server/hermes-machine-auth.ts';
import {createAdpCleanupProvider} from '../src/lib/server/hermes-job-cleanup-provider.ts';
const keys=generateKeyPairSync('ed25519');
function signed(body:string,path='/api/hermes/v1/jobs/cleanup/review'){const timestamp='1000',nonce='a'.repeat(24),idempotencyKey='one';const url='https://example.test'+path;const signature=sign(null,Buffer.from(buildHermesCanonicalRequest({method:'POST',url,timestamp,nonce,body,idempotencyKey})),keys.privateKey).toString('base64url');return new Request(url,{method:'POST',headers:{'content-type':'application/json','content-length':String(Buffer.byteLength(body)),'x-hermes-key-id':'cleanup','x-hermes-timestamp':timestamp,'x-hermes-nonce':nonce,'x-hermes-idempotency-key':idempotencyKey,'x-hermes-signature':signature},body});}
test('cleanup-only key opt-in, raw duplicate rejection and typed dispatch',async()=>{let calls=0;const deps={now:()=>1_000_000,publicKeys:{cleanup:keys.publicKey.export({type:'spki',format:'pem'}).toString()},consumeNonce:async()=>true,cleanupKeys:['cleanup'],service:{review:async()=>{calls++;return {ok:true};},apply:async()=>({}),rollbackReview:async()=>({}),rollback:async()=>({})}};
 for(const raw of ['{"manifestId":"x","manifestId":"x"}','{"manifestId":"x","manifest\\u0049d":"x"}','{"x":{"y":1}}'])assert.equal((await handleJobCleanupRequest(signed(raw),'review',deps)).status,400);
 assert.equal(calls,0);assert.equal((await handleJobCleanupRequest(signed('{"manifestId":"x"}'),'review',{...deps,cleanupKeys:[]})).status,403);assert.equal(calls,0);
 assert.equal((await handleJobCleanupRequest(signed('{ "manifestId" : "x" }'),'review',deps)).status,200);assert.equal(calls,1);
 assert.equal((await handleJobCleanupRequest(signed('{"manifestId":"x"}','/api/hermes/v1/jobs/cleanup/apply'),'review',deps)).status,400);
});
test('ADP reconfirmation is allowlisted, bounded, exact and never treats 404/empty as closure',async()=>{
 const key='adp:12345678-1234-1234-1234-123456789abc:123';let seen='';const provider=createAdpCleanupProvider({now:()=>10,fetch:async (url,init)=>{seen=String(url);assert.equal(init?.redirect,'error');return Response.json({itemID:'123',requisitionTitle:'Job',requisitionStatusCode:{codeValue:'OPEN'}});}});
 assert.equal((await provider(key)).status,'active');assert.ok(seen.startsWith('https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions/123?'));
 await assert.rejects(provider('https://evil.test'));
 for(const response of [new Response('',{status:404}),Response.json({}),Response.json({itemID:'other',requisitionStatusCode:{codeValue:'CLOSED'}}),Response.json({itemID:'123',requisitionStatusCode:{codeValue:'UNKNOWN'}})]){const p=createAdpCleanupProvider({fetch:async()=>response});await assert.rejects(p(key));}
 const p=createAdpCleanupProvider({fetch:async()=>Response.json({itemID:'123',requisitionStatusCode:{codeValue:'CLOSED'}})});assert.equal((await p(key)).status,'closed');
});

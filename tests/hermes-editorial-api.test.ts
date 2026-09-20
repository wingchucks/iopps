import assert from "node:assert/strict";
import { generateKeyPairSync, sign, randomBytes } from "node:crypto";
import test from "node:test";
import { handleEditorialRequest } from "../src/lib/server/hermes-editorial-api.ts";
import { buildHermesCanonicalRequest } from "../src/lib/server/hermes-machine-auth.ts";
import { REPAIR } from "../src/lib/server/hermes-editorial-repair.ts";
const keys = generateKeyPairSync("ed25519");
const url = "https://fictional.example/api/hermes/v1/jobs/editorial/review";
function request(body: string, nonce = randomBytes(24).toString("base64url")) {
 const timestamp = "1800000000";
 const signature = sign(null, Buffer.from(buildHermesCanonicalRequest({method:"POST",url,timestamp,nonce,body,idempotencyKey:"fixture-review"})),keys.privateKey).toString("base64url");
 return new Request(url,{method:"POST",headers:{"content-type":"application/json","content-length":String(Buffer.byteLength(body)),"x-hermes-key-id":"fixture-key","x-hermes-timestamp":timestamp,"x-hermes-nonce":nonce,"x-hermes-idempotency-key":"fixture-review","x-hermes-signature":signature},body});
}
test("signed endpoint requires an explicit repair/key grant and rejects duplicate JSON before reads",async()=>{
 let reads=0; const seen=new Set<string>();
 const deps={publicKeys:{"fixture-key":keys.publicKey.export({format:"pem",type:"spki"}).toString()},now:()=>1800000000000,
  consumeNonce:async({nonceHash}:{nonceHash:string})=>{if(seen.has(nonceHash))return false;seen.add(nonceHash);return true;},
  repairKeys:[] as string[], service:{review:async()=>{reads++;return {ok:true};},apply:async()=>{reads++;return {ok:true};}}};
 const body=JSON.stringify({repairId:REPAIR.id});
 assert.equal((await handleEditorialRequest(request(body),"review",deps)).status,403); assert.equal(reads,0);
 deps.repairKeys=["fixture-key"];
 for(const raw of [`{"repairId":"${REPAIR.id}","repairId":"${REPAIR.id}"}`,`{"repairId":"${REPAIR.id}","repair\\u0049d":"${REPAIR.id}"}`]){
  assert.equal((await handleEditorialRequest(request(raw),"review",deps)).status,400);
 }
 assert.equal(reads,0);
 const nonce=randomBytes(24).toString("base64url");
 assert.equal((await handleEditorialRequest(request(body,nonce),"review",deps)).status,200);
 assert.equal((await handleEditorialRequest(request(body,nonce),"review",deps)).status,409); assert.equal(reads,1);
});

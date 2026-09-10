import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { buildHermesCanonicalRequest } from '../src/lib/server/hermes-machine-auth.ts';
import { handleReconciliationRequest, type ReportSnapshot } from '../src/lib/server/hermes-reconciliation-api.ts';
const path='/api/hermes/v1/reports/billing-publishing';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const now=Date.parse('2026-09-09T12:00:00Z');
function request(body='{"report":"billing-publishing-v1"}',url='https://example.invalid'+path) {
 const timestamp=String(now/1000),nonce=randomBytes(18).toString('base64url'),idempotencyKey='report-test';
 const signature=sign(null,Buffer.from(buildHermesCanonicalRequest({method:'POST',url,timestamp,nonce,body,idempotencyKey})),privateKey).toString('base64url');
 return new Request(url,{method:'POST',headers:{'content-type':'application/json','content-length':String(Buffer.byteLength(body)),'x-hermes-key-id':'test','x-hermes-timestamp':timestamp,'x-hermes-nonce':nonce,'x-hermes-signature':signature,'x-hermes-idempotency-key':idempotencyKey},body});
}
function deps(){const nonces=new Set<string>();let reads=0;return {
 now:()=>now,publicKeys:{test:publicKey.export({type:'spki',format:'pem'}).toString()},
 consumeNonce:async({nonceHash}:{nonceHash:string})=>{if(nonces.has(nonceHash))return false;nonces.add(nonceHash);return true;},
 consumeReportBudget:async()=>true,
 readSnapshot:async():Promise<ReportSnapshot>=>{reads++;return {subscriptions:[],employers:[],organizations:[],jobs:[],posts:[],stripeWebhookEvents:[]};},
 reads:()=>reads,
};}
test('signed fixed report returns aggregate-only evidence with explicit no-provider-certification',async()=>{
 const d=deps();const response=await handleReconciliationRequest(request(),d);
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();assert.equal(data.ok,true);assert.equal(data.report.providerVerified,false);
 assert.equal(data.report.coverage,'complete-six-collection-projected-snapshot');
 assert.deepEqual(data.report.scanned,{subscriptions:0,employers:0,organizations:0,jobs:0,posts:0,stripeWebhookEvents:0});
 assert.equal(d.reads(),1);
});


test('rejects arbitrary fields, duplicate keys, noncanonical JSON and query targets without scans',async()=>{
 for(const body of ['{}','{"report":"billing-publishing-v1","collection":"users"}','{"report":"bad","report":"billing-publishing-v1"}','{"\\u0072eport":"billing-publishing-v1"}',' {"report":"billing-publishing-v1"}']){
  const d=deps();assert.equal((await handleReconciliationRequest(request(body),d)).status,400);assert.equal(d.reads(),0);
 }
 const d=deps();assert.equal((await handleReconciliationRequest(request(undefined,'https://example.invalid'+path+'?collection=users'),d)).status,404);assert.equal(d.reads(),0);
});
test('rejects unsigned, tampered, stale and replayed requests before scans',async()=>{
 for(const alteration of ['signature','stale','missing']){
  const d=deps();const r=request();if(alteration==='signature')r.headers.set('x-hermes-signature','A'.repeat(86));
  if(alteration==='stale')r.headers.set('x-hermes-timestamp','1');if(alteration==='missing')r.headers.delete('x-hermes-key-id');
  assert.equal((await handleReconciliationRequest(r,d)).status,401);assert.equal(d.reads(),0);
 }
 const d=deps();const r=request(),copy=r.clone();assert.equal((await handleReconciliationRequest(r,d)).status,200);
 assert.equal((await handleReconciliationRequest(copy,d)).status,409);assert.equal(d.reads(),1);
});
test('streaming body bound cancels oversized input even with a lying length',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(129));},cancel(){cancelled=true;}});
 const r=new Request('https://example.invalid'+path,{method:'POST',headers:{'content-type':'application/json','content-length':'1'},body:stream,duplex:'half'} as RequestInit);
 const d=deps();assert.equal((await handleReconciliationRequest(r,d)).status,413);assert.equal(cancelled,true);assert.equal(d.reads(),0);
});
test('rate-limited authenticated requests do not scan and backend errors are redacted',async()=>{
 const d=deps();d.consumeReportBudget=async()=>false;assert.equal((await handleReconciliationRequest(request(),d)).status,429);assert.equal(d.reads(),0);
 const e=deps();e.readSnapshot=async()=>{throw Error('secret@example.invalid private-record');};const response=await handleReconciliationRequest(request(),e);
 assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private-record'));
});


test('reports ambiguous billing evidence without leaking records or treating spent credits as debt',async()=>{
 const d=deps();d.readSnapshot=async()=>({
  subscriptions:[{id:'old-receipt',data:{stripeSessionId:'cs_paid',orgId:'owner',plan:'featured-post',amount:200,gstAmount:10,totalAmount:210}},
   {id:'cs_paid',data:{stripeSessionId:'cs_paid',orgId:'owner',plan:'featured-post',amount:200,gstAmount:10,totalAmount:999}},
   {id:'complimentary',data:{orgId:'owner',amount:0,gstAmount:0,totalAmount:0,source:'complimentary'}}],
  employers:[{id:'owner',data:{featuredPostCredits:0,plan:'free',email:'private@example.invalid'}},{id:'bad-balance',data:{featuredPostCredits:-1}}],
  organizations:[],jobs:[{id:'job',data:{employerId:'owner',status:'active',featured:true,featuredCreditConsumed:true}}],posts:[],
  stripeWebhookEvents:[{id:'evt_pending',data:{status:'processing',stripeSessionId:'cs_unknown'}},{id:'evt_orphan',data:{status:'completed',stripeSessionId:'cs_missing'}}],
 });
 const response=await handleReconciliationRequest(request(),d);assert.equal(response.status,200);const text=await response.text();const report=JSON.parse(text).report;
 assert.equal(report.potentialIssues.duplicateReceiptSessionGroups,1);
 assert.equal(report.potentialIssues.receiptMoneyShapeOrTotalMismatch,1);
 assert.equal(report.potentialIssues.invalidEmployerCreditRecords,1);
 assert.equal(report.potentialIssues.incompleteWebhookRecords,1);
 assert.equal(report.potentialIssues.completedWebhookWithoutReceipt,1);
 assert.equal(report.potentialIssues.featuredListingsBeyondRecordedCoverage,0);
 assert.equal(report.inventory.nonStripeOrUnlinkedReceipts,1);
 assert.equal(report.inventory.legacyReceiptIds,1);
 for(const value of ['private@example.invalid','owner','cs_paid','evt_orphan','old-receipt'])assert.ok(!text.includes(value));
});


test('publishing coverage honors consumed credits, included slots, canonical mirrors and organization links',async()=>{
 const d=deps();d.readSnapshot=async()=>({subscriptions:[{id:'cs_lost',data:{stripeSessionId:'cs_lost',orgId:'missing',amount:1,gstAmount:0,totalAmount:1}}],
 employers:[{id:'free',data:{plan:'free',featuredPostCredits:0}},{id:'premium',data:{plan:'premium',featuredPostCredits:0}}],
 organizations:[{id:'org',data:{employerId:'premium',plan:'standard'}}],
 jobs:[{id:'paid',data:{employerId:'free',status:'active',featured:true,featuredCreditConsumed:true}},
 {id:'uncovered',data:{employerId:'free',status:'active',featured:true}},
 {id:'closed',data:{employerId:'free',status:'closed',active:false,featured:true}},
 ...Array.from({length:5},(_,i)=>({id:`premium-${i}`,data:{orgId:'org',status:'active',featured:true}}))],
 posts:[{id:'paid',data:{type:'job',employerId:'free',active:true,featured:true}},
 {id:'closed',data:{type:'job',employerId:'free',active:true,featured:true}},
 {id:'unknown',data:{type:'job',employerId:'absent',active:true,featured:true}},
 {id:'community',data:{type:'story',active:true,featured:true}}],stripeWebhookEvents:[]});
 const data=await (await handleReconciliationRequest(request(),d)).json();
 assert.equal(data.report.potentialIssues.featuredListingsBeyondRecordedCoverage,2);
 assert.equal(data.report.potentialIssues.featuredListingsWithUnresolvedEmployer,1);
 assert.equal(data.report.potentialIssues.receiptsWithUnresolvedEmployer,1);
 assert.equal(data.report.potentialIssues.organizationPlanMirrorDifferences,1);
 assert.equal(data.report.inventory.canonicalJobMirrorsSuppressed,2);
 assert.equal(data.report.inventory.markedActiveFeaturedListings,8);
 assert.ok(data.report.limitations.includes('Recorded credit-consumption flags are not proof of payment.'));
});
test('invalid snapshot envelopes, duplicate document IDs and caps fail closed without partial aggregates',async()=>{
 for(const kind of ['oversized','duplicate','invalid-data']){
  const d=deps();const empty=await d.readSnapshot();
  empty.jobs=kind==='oversized'?Array.from({length:1001},(_,i)=>({id:String(i),data:{}})):kind==='duplicate'?[{id:'same',data:{}},{id:'same',data:{}}]:[{id:'invalid',data:null as unknown as Record<string,unknown>}];
  d.readSnapshot=async()=>empty;
  const response=await handleReconciliationRequest(request(),d);assert.equal(response.status,503);assert.ok(!(await response.text()).includes('potentialIssues'));
 }
});

test('signature verification cannot normalize away a BOM added to signed bytes',async()=>{
 const signed=request();const original=await signed.text();const bytes=Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),Buffer.from(original)]);
 const headers=new Headers(signed.headers);headers.set('content-length',String(bytes.length));
 const changed=new Request(signed.url,{method:'POST',headers,body:bytes});const d=deps();
 assert.equal((await handleReconciliationRequest(changed,d)).status,400);assert.equal(d.reads(),0);
});

test('malformed classification fields fail closed rather than disappearing from issue counts',async()=>{
 for(const [collection,data] of [['jobs',{status:null,active:true,featured:true}],['jobs',{status:'active',featured:'true'}],['organizations',{plan:{private:'value'}}],['jobs',{employerId:55,status:'active',featured:true}],['organizations',{plan:'unrecognized-tier'}]] as const){
  const d=deps();const snapshot=await d.readSnapshot();snapshot[collection]=[{id:'malformed',data}];d.readSnapshot=async()=>snapshot;
  assert.equal((await handleReconciliationRequest(request(),d)).status,503);
 }
});
test('manual receipt integrity is independent of missing or malformed Stripe linkage',async()=>{
 const d=deps();const snapshot=await d.readSnapshot();snapshot.employers=[{id:'owner',data:{plan:'premium'}}];
 snapshot.subscriptions=[{id:'manual-valid',data:{orgId:'owner',amount:0,gstAmount:0,totalAmount:0}},
 {id:'manual-bad',data:{orgId:'missing',amount:20,gstAmount:1,totalAmount:30}},
 {id:'bad-provider-link',data:{stripeSessionId:'not-a-session',orgId:'owner',amount:10,gstAmount:1,totalAmount:99}}];d.readSnapshot=async()=>snapshot;
 const report=(await (await handleReconciliationRequest(request(),d)).json()).report;
 assert.equal(report.inventory.nonStripeOrUnlinkedReceipts,3);
 assert.equal(report.potentialIssues.receiptMoneyShapeOrTotalMismatch,2);
 assert.equal(report.potentialIssues.receiptsWithUnresolvedEmployer,1);
});

test('a stalled body reaches its read deadline before authentication or scanning',async()=>{
 let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true;}});
 const r=new Request('https://example.invalid'+path,{method:'POST',headers:{'content-type':'application/json','content-length':'1'},body:stream,duplex:'half'} as RequestInit);
 const d=deps();assert.equal((await handleReconciliationRequest(r,d)).status,408);assert.equal(cancelled,true);assert.equal(d.reads(),0);
});

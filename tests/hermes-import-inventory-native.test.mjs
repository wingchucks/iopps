import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,generateKeyPairSync,sign,createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdirSync,writeFileSync} from 'node:fs';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createImportInventoryAdapter} from '../src/lib/server/hermes-import-inventory-firestore.ts';
import {handleImportInventoryRequest} from '../src/lib/server/hermes-import-inventory-api.ts';
import {buildHermesCanonicalRequest} from '../src/lib/server/hermes-machine-auth.ts';
import {createFirebaseHermesFirestorePort,createHermesFirestoreAdapter} from '../src/lib/server/hermes-firestore-adapter.ts';

test('native projected snapshot and signed loopback HTTP with exact fixture cleanup', {skip:process.env.IOPPS_TEST_EMULATORS!=='true',timeout:90000},async()=>{
 assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
 const projectId='demo-inventory-'+randomUUID().replaceAll('-','').slice(0,12);
 const app=initializeApp({projectId},'inventory-'+randomUUID()),db=getFirestore(app);
 const tag='inventory-'+randomUUID(),feed=tag+'-feed',owner=tag+'-owner',identity=createHash('sha256').update(tag).digest('hex');
 const rows=[
  ['rssFeeds',feed,{employerId:owner,active:false,feedType:'rss'}],
  ['feedImportIdentities',identity,{version:1,feedId:feed,employerId:owner,jobId:tag+'-job'}],
  ['feedImportIdentities',tag+'-orphan',{version:1,jobId:tag+'-unseen',employerId:owner}],
  ['jobs',tag+'-job',{source:'feed',feedId:feed,importIdentity:identity,employerId:owner,status:'deleted',active:false,title:'MUST-NOT-LEAK',description:'MUST-NOT-LEAK'}],
  ['jobs',tag+'-legacy',{importedFrom:feed,active:false}],
  ['jobs',tag+'-ordinary',{source:'employer',externalUrl:'https://fictional.invalid/MUST-NOT-LEAK'}],
  ['posts',tag+'-mirror',{type:'job',feedId:feed,status:'closed',active:false}],
  ['posts',tag+'-event',{type:'event',source:'feed',feedId:feed}],
  ['jobCleanupGuards',tag+'-guard',{schemaVersion:1,kind:'duplicate',active:false,originalId:tag+'-unseen',canonicalId:tag+'-ordinary'}],
  ['jobCleanupSources',tag+'-source',{schemaVersion:1,active:false,sourceKey:tag+'-source',canonicalId:tag+'-unseen',blockedEmployerIds:[owner]}],
 ];
 const sharedApp=initializeApp({projectId:'demo-iopps-preview'},'shared-sentinel-'+randomUUID()),sharedDb=getFirestore(sharedApp);
 const sentinel=sharedDb.collection('feedImportIdentities').doc(tag+'-concurrent-sentinel');
 const sentinelData={version:1,jobId:tag+'-other-job',employerId:owner};
 let sentinelCreated=false;
 const owned=rows.map(([c,id])=>db.collection(c).doc(id)),nonceRefs=[];
 let server,created=false;
 const out='reports/import-inventory/native';mkdirSync(out,{recursive:true});
 try {
  await sentinel.create(sentinelData);sentinelCreated=true;
  const initial=await db.getAll(...owned);assert.ok(initial.every(s=>!s.exists),'refuse existing fixture paths');
  const batch=db.batch();rows.forEach(([, ,data],i)=>batch.create(owned[i],data));await batch.commit();created=true;
  const before=(await db.getAll(...owned)).map(s=>s.data());
  const adapter=createImportInventoryAdapter(db,{pageSize:1});
  const report=await adapter.readInventory();
  const exactCap=await createImportInventoryAdapter(db,{pageSize:1,maxRecords:2}).readInventory();
  assert.equal(exactCap.counts.jobs,2);assert.equal(exactCap.counts.feedImportIdentities,2);
  await assert.rejects(createImportInventoryAdapter(db,{pageSize:1,maxRecords:1}).readInventory(),/capacity/);
  assert.equal(report.snapshotComplete,true);assert.equal(report.historicalCoverage,'not-established');
  assert.ok(report.records.jobs.some(r=>r.id===tag+'-job'&&r.data.status==='deleted'));
  assert.ok(report.records.jobs.some(r=>r.id===tag+'-legacy'));
  assert.ok(!report.records.jobs.some(r=>r.id===tag+'-ordinary'));
  assert.ok(report.records.posts.some(r=>r.id===tag+'-mirror'));
  assert.ok(!report.records.posts.some(r=>r.id===tag+'-event'));
  assert.ok(report.records.feedImportIdentities.some(r=>r.id===tag+'-orphan'));
  assert.doesNotMatch(JSON.stringify(report),/MUST-NOT-LEAK/);
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const nonce=createHermesFirestoreAdapter(createFirebaseHermesFirestorePort(db));
  let reads=0,origin;
  const deps={publicKeys:{'native-fixture':publicKey.export({type:'spki',format:'pem'})},reportKeyIds:['native-fixture'],consumeNonce:async input=>{nonceRefs.push(db.collection('hermesAdminNonces').doc(createHash('sha256').update(`iopps-hermes-admin-nonce-v1\0${input.keyId}\0${input.nonceHash}`).digest('hex')));return nonce.consumeNonce(input);},readInventory:async()=>{reads++;return adapter.readInventory();}};
  server=createServer(async(req,res)=>{try{const request=new Request(origin+req.url,{method:req.method,headers:req.headers,body:req,duplex:'half'});const response=await handleImportInventoryRequest(request,deps);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch{res.writeHead(500);res.end('fixture failure');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  const route='/api/hermes/v1/reports/import-inventory',body='{"report":"import-inventory-v1"}',url=origin+route;
  function headers(){const timestamp=String(Math.floor(Date.now()/1000)),n=randomUUID(),idempotencyKey=randomUUID();return {'content-type':'application/json','x-hermes-key-id':'native-fixture','x-hermes-timestamp':timestamp,'x-hermes-nonce':n,'x-hermes-idempotency-key':idempotencyKey,'x-hermes-signature':sign(null,Buffer.from(buildHermesCanonicalRequest({method:'POST',url,timestamp,nonce:n,idempotencyKey,body})),privateKey).toString('base64url')};}
  const signed=headers(),response=await fetch(url,{method:'POST',headers:signed,body,redirect:'error'});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).report.snapshotComplete,true);
  const replay=await fetch(url,{method:'POST',headers:signed,body});assert.equal(replay.status,409);await replay.text();assert.equal(reads,1);
  const invalid=await fetch(url,{method:'POST',headers:{...headers(),'x-hermes-signature':'A'.repeat(86)},body});assert.equal(invalid.status,401);await invalid.text();assert.equal(reads,1);
  const forbidden=await fetch(url+'?collection=users',{method:'POST',headers:headers(),body});assert.ok(forbidden.status>=400);await forbidden.text();assert.equal(reads,1);
  assert.deepEqual((await db.getAll(...owned)).map(s=>s.data()),before,'report must not mutate business fixtures');
  assert.ok((await db.getAll(...nonceRefs)).some(s=>s.exists),'real replay metadata persisted');
  writeFileSync(out+'/result.json',JSON.stringify({passed:true,nativeSdk:true,signedLoopbackHttp:true,nextRouteRuntime:false,providerVerified:false,fixturePaths:owned.map(r=>r.path),businessUnchanged:true},null,2));
 }finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  const refs=[...(created?owned:[]),...new Map(nonceRefs.map(r=>[r.path,r])).values()];
  try{if(refs.length){const batch=db.batch();refs.forEach(r=>batch.delete(r));await batch.commit();const after=await db.getAll(...refs);assert.ok(after.every(s=>!s.exists));writeFileSync(out+'/cleanup.json',JSON.stringify({absent:true,paths:refs.map(r=>r.path)},null,2));}}finally{try{if(sentinelCreated){assert.deepEqual((await sentinel.get()).data(),sentinelData);await sentinel.delete();assert.equal((await sentinel.get()).exists,false);writeFileSync(out+'/shared-sentinel-cleanup.json',JSON.stringify({preservedUntilCleanup:true,absent:true,path:sentinel.path}));}}finally{await sharedDb.terminate();await deleteApp(sharedApp);await db.terminate();await deleteApp(app);}}
 }
});

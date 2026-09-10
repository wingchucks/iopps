// Explicitly authorized sandbox-only provider QA. No stored API keys.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
const reports='C:/Users/natha/AppData/Local/hermes/reports';
const runtime=JSON.parse(await fs.readFile(`${reports}/iopps-sandbox-runtime.json`,'utf8'));
assert.equal(runtime.status,'ready'); assert.equal(runtime.mode,'test');
assert.equal(runtime.accountId,'acct_1CAqIYDez5DCYMsc');
assert.match(runtime.base,/^http:\/\/127\.0\.0\.1:\d+$/);
assert.equal((await fetch(runtime.base,{redirect:'error'})).status,200);
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
const app=initializeApp({projectId:'demo-iopps-preview'},'stripe-provider-qa');
const auth=getAuth(app), db=getFirestore(app);
const uid=`qa-stripe-${crypto.randomUUID()}`;
let sessionId, listener, received;
const evidence={accountId:runtime.accountId,mode:'test',base:runtime.base,uid,checks:[],status:'starting'};
const save=()=>fs.writeFile(`${reports}/iopps-stripe-provider-result.json`,JSON.stringify(evidence,null,2));
const proxy=http.createServer(async(req,res)=>{
 try {
  if(req.method!=='POST'||req.url!=='/stripe'){res.writeHead(404).end();return;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1048576)throw Error('oversized');chunks.push(chunk);}
  const raw=Buffer.concat(chunks);const event=JSON.parse(raw);
  if(event.data?.object?.metadata?.orgId!==uid){res.writeHead(200).end('{}');return;}
  assert.equal(event.livemode,false);assert.ok(event.data.object.id.startsWith('cs_test_'));
  const headers={'content-type':'application/json','stripe-signature':req.headers['stripe-signature']};
  const response=await fetch(runtime.base+'/api/stripe/webhook',{method:'POST',headers,body:raw,redirect:'error'});
  const answer=await response.json(); assert.equal(response.status,200,JSON.stringify(answer));
  if(event.data.object.payment_status==='paid'){
   assert.equal(event.data.object.status,'complete');
   const replay=await fetch(runtime.base+'/api/stripe/webhook',{method:'POST',headers,body:raw,redirect:'error'});
   const repeated=await replay.json(); assert.equal(replay.status,200);assert.equal(repeated.duplicate,true);
   received={eventId:event.id,sessionId:event.data.object.id,firstResponse:answer,replayResponse:repeated};
  }
  res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(answer));
 }catch(error){evidence.webhookError=error.message;await save();res.writeHead(500).end('{}');}
});
try{
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const target=`http://127.0.0.1:${proxy.address().port}/stripe`;
 listener=spawn(process.env.COMSPEC||'cmd.exe',['/d','/c','npx','--yes','@stripe/cli','--project-name','iopps-sandbox-verification','listen','--events','checkout.session.completed,checkout.session.async_payment_succeeded','--forward-to',target],{stdio:['ignore','pipe','pipe']});
 let ready=false;
 for(const stream of [listener.stdout,listener.stderr])stream.on('data',chunk=>{if(chunk.toString().includes('whsec_'))ready=true;}); // discard secret-bearing CLI output
 const deadline=Date.now()+60000;
 while(!ready){assert.equal(listener.exitCode,null,'Listener exited');assert.ok(Date.now()<deadline,'Listener timeout');await new Promise(r=>setTimeout(r,200));}
 await auth.createUser({uid,email:`${uid}@example.invalid`,emailVerified:true});
 for(const [collection,data]of Object.entries({users:{role:'employer',orgId:uid,employerId:uid,onboardingComplete:true},members:{role:'employer',orgId:uid,orgRole:'owner',onboardingComplete:true},employers:{name:'Fictional Stripe Sandbox QA',status:'approved',onboardingComplete:true,plan:'free',featuredPostCredits:0},organizations:{name:'Fictional Stripe Sandbox QA',status:'approved',onboardingComplete:true}}))await db.doc(`${collection}/${uid}`).set(data);
 const tokenRes=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key',{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({token:await auth.createCustomToken(uid),returnSecureToken:true})});
 assert.equal(tokenRes.status,200); const {idToken}=await tokenRes.json();
 const created=await fetch(runtime.base+'/api/stripe/checkout',{method:'POST',redirect:'error',headers:{'content-type':'application/json',Authorization:`Bearer ${idToken}`},body:JSON.stringify({planId:'featured-post',orgId:uid})});
 const checkout=await created.json();assert.equal(created.status,200,JSON.stringify(checkout));
 const url=new URL(checkout.url);assert.equal(url.hostname,'checkout.stripe.com');assert.ok(url.pathname.includes('cs_test_'));
 sessionId=url.pathname.match(/cs_test_[A-Za-z0-9]+/)?.[0];assert.ok(sessionId);
 evidence.sessionId=sessionId;evidence.checkoutUrl=checkout.url;evidence.status='awaiting_test_payment';
 evidence.checks.push('Checkout created by actual local authenticated app route; test-only Stripe URL');await save();
 const paymentDeadline=Date.now()+20*60*1000;
 while(!received){assert.ok(Date.now()<paymentDeadline,'Payment/webhook timeout');assert.equal(listener.exitCode,null,'Listener exited');await new Promise(r=>setTimeout(r,500));}
 assert.equal(received.sessionId,sessionId);
 const purchases=await db.collection('subscriptions').where('stripeSessionId','==',sessionId).get();
 assert.equal(purchases.size,1);assert.equal(purchases.docs[0].id,sessionId);
 assert.equal(purchases.docs[0].data().plan,'featured-post');
 assert.equal((await db.doc(`employers/${uid}`).get()).data().featuredPostCredits,1);
 assert.equal((await db.doc(`stripeWebhookEvents/${received.eventId}`).get()).data().status,'completed');
 evidence.checks.push('Actual Stripe paid completed event accepted by built webhook route','Exact signed provider event replay returns duplicate=true','Exactly one emulator purchase and one featured credit after replay');
 evidence.delivery=received;evidence.purchaseCount=purchases.size;evidence.featuredPostCredits=1;evidence.status='passed';delete evidence.checkoutUrl;await save();
}catch(error){evidence.status='failed';evidence.error=error.message;delete evidence.checkoutUrl;await save();process.exitCode=1;}
finally{
 if(listener?.pid)await new Promise(resolve=>{const killer=spawn('taskkill.exe',['/PID',String(listener.pid),'/T','/F'],{stdio:'ignore'});killer.on('exit',resolve);killer.on('error',resolve);});
 proxy.closeAllConnections();await new Promise(resolve=>proxy.close(resolve));
 // Preserve emulator-only evidence for readback; cleanup is a separate explicit step.
 await db.terminate();await deleteApp(app);
 console.log(JSON.stringify({status:evidence.status,sessionId,checks:evidence.checks,report:`${reports}/iopps-stripe-provider-result.json`}));
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const root='C:/Users/natha/AppData/Local/hermes/reports';
const result=JSON.parse(await fs.readFile(`${root}/iopps-stripe-provider-result.json`,'utf8'));
assert.equal(result.status,'passed');assert.match(result.uid,/^qa-stripe-/);assert.match(result.sessionId,/^cs_test_/);
function stripe(path){const r=spawnSync(process.env.COMSPEC||'cmd.exe',['/d','/c','npx','--yes','@stripe/cli','--project-name','iopps-sandbox-verification','get',path],{encoding:'utf8'});assert.equal(r.status,0,'Stripe readback failed');return JSON.parse(r.stdout);}
const session=stripe(`/v1/checkout/sessions/${result.sessionId}`);
const event=stripe(`/v1/events/${result.delivery.eventId}`);
assert.equal(session.livemode,false);assert.equal(session.payment_status,'paid');assert.equal(session.status,'complete');
assert.equal(event.livemode,false);assert.equal(event.data.object.id,session.id);assert.equal(event.type,'checkout.session.completed');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
const app=initializeApp({projectId:'demo-iopps-preview'},'stripe-provider-readback');const db=getFirestore(app);
try{
 const receipts=await db.collection('subscriptions').where('stripeSessionId','==',session.id).get();assert.equal(receipts.size,1);
 assert.equal((await db.doc(`employers/${result.uid}`).get()).data().featuredPostCredits,1);
 assert.equal((await db.doc(`stripeWebhookEvents/${event.id}`).get()).data().status,'completed');
 const verified={status:'passed',sessionId:session.id,eventId:event.id,paymentIntentId:session.payment_intent,livemode:session.livemode,paymentStatus:session.payment_status,checkoutStatus:session.status,currency:session.currency,amountTotalMinorUnits:session.amount_total,emulatorPurchaseCount:receipts.size,emulatorFeaturedCredits:1,verifiedAt:new Date().toISOString(),productionNavigationBlocked:JSON.parse(await fs.readFile(`${root}/iopps-stripe-browser-blocks.json`,'utf8'))};
 await fs.writeFile(`${root}/iopps-stripe-provider-readback.json`,JSON.stringify(verified,null,2));
 console.log(JSON.stringify(verified));
}finally{await db.terminate();await deleteApp(app);}

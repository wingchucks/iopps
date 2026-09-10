/* eslint-disable @typescript-eslint/no-explicit-any -- Real Stripe verifier and Firestore emulator; VM only replaces credential/email boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import Stripe from 'stripe';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as pricing from '../src/lib/pricing.ts';
import { expireSubscriptionAtomically } from '../src/lib/server/subscription-expiration.ts';
import { buildSubscriptionState } from '../src/lib/server/subscription-state.ts';

const enabled = process.env.IOPPS_TEST_EMULATORS === 'true';
const secret = 'whsec_fictional_local_regression_only';
async function harness(t: any) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  const app = initializeApp({ projectId: 'demo-iopps-payment-transactions' }, crypto.randomUUID());
  const db = getFirestore(app);
  const orgId = `billing-${crypto.randomUUID()}`;
  const employer = db.doc(`employers/${orgId}`);
  await employer.set({ name: 'Fictional organization', contactEmail: 'fixture@example.invalid', standardPostCredits: 0 });
  await db.doc(`organizations/${orgId}`).set({ name: 'Fictional organization' });
  const events: string[] = [];
  const sends: any[] = [];
  let failNextPath = '';
  let rejectEmails = false;
  const failWrite = (ref: any) => {
    if (failNextPath && ref.path === failNextPath) { failNextPath = ''; throw new Error('Injected write failure'); }
  };
  // Inject the same write failure into old direct writes and new transactions.
  const port = new Proxy(db, { get(target, key) {
    if (key === 'runTransaction') return (fn: any) => target.runTransaction(async tx => await fn(new Proxy(tx, { get(transaction, method) {
      if (method === 'set' || method === 'update') return (ref: any, ...args: any[]) => { failWrite(ref); return (transaction[method] as any)(ref, ...args); };
      const value = (transaction as any)[method]; return typeof value === 'function' ? value.bind(transaction) : value;
    } })));
    if (key === 'collection') return (name: string) => {
      const col = target.collection(name);
      if (name !== 'employers') return col;
      return new Proxy(col, { get(collection, method) {
        if (method === 'doc') return (id: string) => {
          const ref = collection.doc(id);
          return new Proxy(ref, { get(document, property) {
            if (property === 'set') return (...args: any[]) => { failWrite(document); return (document.set as any)(...args); };
            const value = (document as any)[property]; return typeof value === 'function' ? value.bind(document) : value;
          } });
        };
        const value = (collection as any)[method]; return typeof value === 'function' ? value.bind(collection) : value;
      } });
    };
    const value = (target as any)[key]; return typeof value === 'function' ? value.bind(target) : value;
  } });
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, Promise, console: { log() {}, error() {} },
    process: { env: { STRIPE_SECRET_KEY: ['sk', 'test', 'fictional'].join('_'), STRIPE_WEBHOOK_SECRET: secret } },
    require: (id: string) => {
      if (id === 'stripe') return { default: Stripe };
      if (id === 'next/server') return { NextResponse: { json: Response.json } };
      if (id === '@/lib/firebase-admin') return { getAdminDb: () => port };
      if (id === '@/lib/pricing') return pricing;
      if (id === '@/lib/email') {
        const send = async (p: any) => { sends.push(p); if (rejectEmails) throw new Error('Fictional email failure'); };
        return { sendAdminPaymentNotification: send, sendSubscriptionConfirmation: send };
      }
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  function event(overrides: any = {}, type = 'checkout.session.completed', sessionId = `cs_test_${crypto.randomUUID()}`) {
    const e = { id: `evt_${crypto.randomUUID()}`, object: 'event', created: Math.floor(Date.now() / 1000), type, livemode: false,
      data: { object: { id: sessionId, object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'cad', payment_intent: 'pi_fictional', amount_total: 13125,
        metadata: { orgId, planId: 'standard-post', amount: '12500', gstAmount: '625' }, ...overrides } } };
    events.push(e.id); return e;
  }
  async function send(e: any, bad = false) {
    const payload = JSON.stringify(e);
    const signature = bad ? 'invalid' : Stripe.webhooks.generateTestHeaderString({ payload, secret });
    return exports.POST(new Request('http://127.0.0.1/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: payload }));
  }
  const purchases = () => db.collection('subscriptions').where('orgId', '==', orgId).get();
  t.after(async () => {
    for (const receipt of (await purchases()).docs) await receipt.ref.delete();
    for (const id of events) await db.doc(`stripeWebhookEvents/${id}`).delete();
    await employer.delete(); await db.doc(`organizations/${orgId}`).delete();
    await db.doc(`organizations/legacy-${orgId}`).delete(); await db.terminate(); await deleteApp(app);
  });
  return { db, orgId, employer, sends, event, send, purchases,
    failOnce: (path = employer.path) => { failNextPath = path; },
    rejectEmails: () => { rejectEmails = true; } };
}

test('failed fulfillment rolls back receipt and event, then retry succeeds exactly once', { skip: !enabled }, async t => {
  const h = await harness(t); const e = h.event(); h.failOnce();
  assert.equal((await h.send(e)).status, 500);
  assert.equal((await h.purchases()).size, 0, 'failed transaction must leave no receipt');
  assert.equal((await h.db.doc(`stripeWebhookEvents/${e.id}`).get()).exists, false);
  assert.equal(h.sends.length, 0);
  assert.equal((await h.send(e)).status, 200);
  assert.equal((await h.send(e)).status, 200);
  assert.equal((await h.purchases()).size, 1);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 1);
  assert.equal(h.sends.length, 1);
});

test('concurrent distinct paid sessions grant two credits without lost updates', { skip: !enabled }, async t => {
  const h = await harness(t);
  const results = await Promise.all([h.send(h.event()), h.send(h.event())]);
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  assert.equal((await h.purchases()).size, 2);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 2);
});

test('different event IDs for the same session grant once, including concurrent replay', { skip: !enabled }, async t => {
  const h = await harness(t); const a = h.event();
  const b = h.event({}, 'checkout.session.async_payment_succeeded', a.data.object.id);
  const results = await Promise.all([h.send(a), h.send(b), h.send(a)]);
  assert.deepEqual(results.map(r => r.status), [200, 200, 200]);
  assert.equal((await h.purchases()).size, 1);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 1);
  assert.equal(h.sends.length, 1);
});

test('paid fulfillment rejects malformed or mismatched payment metadata', { skip: !enabled }, async t => {
  const h = await harness(t);
  for (const change of [
    { metadata: { orgId: h.orgId, planId: 'constructor', amount: '12500', gstAmount: '625' } },
    { metadata: { orgId: h.orgId, planId: 'unknown', amount: '12500', gstAmount: '625' } },
    { metadata: { orgId: h.orgId, planId: 'tier2', amount: 'NaN', gstAmount: '625' } },
    { metadata: { orgId: h.orgId, planId: 'standard-post', amount: '-1', gstAmount: '625' } },
    { currency: 'usd' }, { amount_total: 1 }, { mode: 'setup' }, { status: 'open' },
    { metadata: null },
  ]) {
    assert.equal((await h.send(h.event(change))).status, 400, JSON.stringify(change));
    assert.equal((await h.purchases()).size, 0);
  }
  assert.equal(h.sends.length, 0);
});

test('legacy completed receipt prevents a second grant under a new event ID', { skip: !enabled }, async t => {
  const h = await harness(t); const e = h.event();
  await h.db.collection('subscriptions').add({ orgId: h.orgId, stripeSessionId: e.data.object.id, status: 'active', plan: 'standard-post' });
  await h.employer.update({ standardPostCredits: 1 });
  // Legacy receipts alone cannot prove whether the old non-atomic grant finished.
  assert.equal((await h.send(e)).status, 500, 'ambiguous old receipt must require reconciliation, not grant again');
  assert.equal((await h.purchases()).size, 1);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 1);
});

test('legacy processing claims are not silently acknowledged as fulfilled', { skip: !enabled }, async t => {
  const h = await harness(t); const e = h.event();
  await h.db.doc(`stripeWebhookEvents/${e.id}`).set({ status: 'processing' });
  assert.equal((await h.send(e)).status, 500);
  assert.equal((await h.purchases()).size, 0);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 0);
});

test('each supported plan fulfills and annual organization mirrors update atomically', { skip: !enabled }, async t => {
  const h = await harness(t);
  for (const plan of [...Object.values(pricing.SUBSCRIPTION_PLANS), ...Object.values(pricing.ONE_TIME_PLANS)]) {
    const amount = plan.amount * 100; const gst = Math.round(amount * 0.05);
    const e = h.event({ amount_total: amount + gst, metadata: { orgId: h.orgId, planId: plan.id, amount: String(amount), gstAmount: String(gst) } });
    assert.equal((await h.send(e)).status, 200, plan.id);
    const receipt = await h.db.doc(`subscriptions/${e.data.object.id}`).get();
    assert.equal(receipt.data()?.amount, plan.amount);
    if ('tier' in plan) {
      assert.equal((await h.employer.get()).data()?.subscriptionTier, plan.tier);
      assert.equal((await h.db.doc(`organizations/${h.orgId}`).get()).data()?.plan, plan.tier);
      assert.ok(receipt.data()?.expiresAt.toDate() > new Date());
    }
    await h.send(e);
  }
  const data = (await h.employer.get()).data();
  for (const field of ['standardPostCredits', 'featuredPostCredits', 'programPostCredits']) assert.equal(data?.[field], 1);
  assert.equal((await h.purchases()).size, 6);
});

test('corrupt existing credit values fail closed rather than concatenate or erase balances', { skip: !enabled }, async t => {
  const h = await harness(t);
  await h.employer.update({ standardPostCredits: '2' });
  assert.equal((await h.send(h.event())).status, 500);
  assert.equal((await h.purchases()).size, 0);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, '2');
});

test('annual organization write failure rolls back all billing artifacts', { skip: !enabled }, async t => {
  const h = await harness(t);
  const plan = pricing.SUBSCRIPTION_PLANS.tier1; const amount = plan.amount * 100; const gst = Math.round(amount * 0.05);
  const e = h.event({ amount_total: amount + gst, metadata: { orgId: h.orgId, planId: plan.id, amount: String(amount), gstAmount: String(gst) } });
  h.failOnce(`organizations/${h.orgId}`);
  assert.equal((await h.send(e)).status, 500);
  assert.equal((await h.purchases()).size, 0);
  assert.equal((await h.employer.get()).data()?.plan, undefined);
  assert.equal(h.sends.length, 0);
  assert.equal((await h.send(e)).status, 200);
  assert.equal((await h.purchases()).size, 1);
});

test('annual fulfillment preserves legacy employerId organization lookup', { skip: !enabled }, async t => {
  const h = await harness(t); const legacy = h.db.doc(`organizations/legacy-${h.orgId}`);

  await h.db.doc(`organizations/${h.orgId}`).delete();
  await legacy.set({ employerId: h.orgId, name: 'Legacy organization' });
  const plan = pricing.SUBSCRIPTION_PLANS.tier2; const amount = plan.amount * 100; const gst = Math.round(amount * 0.05);
  assert.equal((await h.send(h.event({ amount_total: amount + gst, metadata: { orgId: h.orgId, planId: plan.id, amount: String(amount), gstAmount: String(gst) } }))).status, 200);
  assert.equal((await legacy.get()).data()?.plan, 'premium');
  assert.equal((await h.purchases()).docs[0].data().organizationId, legacy.id);
  await legacy.delete();
});

test('completed legacy event replay does not grant another credit', { skip: !enabled }, async t => {
  const h = await harness(t); const e = h.event();
  await h.db.doc(`stripeWebhookEvents/${e.id}`).set({ status: 'completed' });
  assert.equal((await h.send(e)).status, 200);
  assert.equal((await h.purchases()).size, 0);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 0);
});

test('rejected email does not fail or repeat committed payment fulfillment', { skip: !enabled }, async t => {
  const h = await harness(t); const e = h.event(); h.rejectEmails();
  assert.equal((await h.send(e)).status, 200);
  assert.equal((await h.send(e)).status, 200);
  assert.equal((await h.purchases()).size, 1);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 1);
  assert.equal(h.sends.length, 1);
});

test('webhook rejects invalid signatures without writes', { skip: !enabled }, async t => {
  const h = await harness(t);
  assert.equal((await h.send(h.event(), true)).status, 400);
  assert.equal((await h.purchases()).size, 0);
  assert.equal(h.sends.length, 0);
});

test('unpaid completion is deferred, async success fulfills once, late unpaid replay is harmless', { skip: !enabled }, async t => {
  const h = await harness(t);
  const unpaid = h.event({ payment_status: 'unpaid' });
  assert.equal((await h.send(unpaid)).status, 200);
  assert.equal((await h.purchases()).size, 0, 'unpaid checkout must not create active purchase');
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 0);
  assert.equal(h.sends.length, 0);
  const paid = h.event({}, 'checkout.session.async_payment_succeeded', unpaid.data.object.id);
  assert.equal((await h.send(paid)).status, 200);
  assert.equal((await h.purchases()).size, 1);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 1);
  await h.send(unpaid);
  assert.equal((await h.employer.get()).data()?.standardPostCredits, 1);
});

test('actual paid renewal after expiry restores normalized employer and organization access', {skip:!enabled}, async t=>{
 const h=await harness(t); const old=h.db.doc('subscriptions/old-'+h.orgId);
 await old.set({employerId:h.orgId,orgId:h.orgId,organizationId:h.orgId,plan:'tier1',status:'active',expiresAt:new Date('2000-01-01')});
 assert.equal(await expireSubscriptionAtomically(h.db,old.id,new Date()),true);
 assert.equal(buildSubscriptionState((await h.employer.get()).data()!).tier,'free');
 const plan=pricing.SUBSCRIPTION_PLANS.tier2;const amount=plan.amount*100;const gst=Math.round(amount*0.05);
 assert.equal((await h.send(h.event({amount_total:amount+gst,metadata:{orgId:h.orgId,planId:plan.id,amount:String(amount),gstAmount:String(gst)}}))).status,200);
 for(const ref of [h.employer,h.db.doc('organizations/'+h.orgId)]){
  const state=buildSubscriptionState((await ref.get()).data()!);assert.equal(state.tier,'premium');assert.equal(state.status,'active');assert.ok(Date.parse(String(state.subscriptionEnd))>Date.now());
 }
});

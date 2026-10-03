/* eslint-disable @typescript-eslint/no-explicit-any -- VM route doubles replace only the database, credentials and email; Stripe verification and billing modules are real. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import * as pricing from '../src/lib/pricing.ts';
import * as publication from '../src/lib/server/paid-job-publication.ts';
import * as term from '../src/lib/server/paid-job-term.ts';
import * as expiration from '../src/lib/server/subscription-expiration.ts';
import { memoryFirestore } from './helpers/memory-firestore.mjs';

const secret = 'whsec_fictional_lifecycle_only';
function harness(seed: Record<string, unknown> = {}) {
  const memory = memoryFirestore({ 'employers/org1': { name: 'Fictional org', contactEmail: 'fixture@example.invalid' }, 'organizations/org1': { name: 'Fictional org' }, ...seed });
  const sends: any[] = [];
  const failingEmails = new Set<string>();
  const email = (kind: string) => async (p: any) => { sends.push([kind, p]); if (failingEmails.has(kind)) throw new Error('Fictional email failure'); };
  const refreshes = { partners: 0 };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, Promise, console: { log() {}, error() {} },
    process: { env: { STRIPE_SECRET_KEY: ['sk', 'test', 'fictional'].join('_'), STRIPE_WEBHOOK_SECRET: secret } },
    require: (id: string) => {
      const modules: Record<string, unknown> = {
        stripe: { default: Stripe }, 'firebase-admin/firestore': { FieldValue }, 'next/server': { NextResponse: { json: Response.json } },
        '@/lib/firebase-admin': { getAdminDb: () => memory.db }, '@/lib/pricing': pricing,
        '@/lib/server/paid-job-publication': publication, '@/lib/server/paid-job-term': term, '@/lib/server/subscription-expiration': expiration,
        '@/lib/email': { sendAdminPaymentNotification: email('admin'), sendSubscriptionConfirmation: email('customer'), sendSubscriptionRenewalConfirmation: email('renewal') },
        '@/lib/public-partner-cache': { refreshPublicPartners: () => { refreshes.partners++; } },
      };
      if (!Object.hasOwn(modules, id)) throw new Error(`Unexpected import: ${id}`);
      return modules[id];
    },
  });
  let counter = 0;
  const id = (prefix: string) => `${prefix}_${++counter}${Math.random().toString(36).slice(2, 8)}`;
  function checkout(planId: string, overrides: any = {}) {
    const plan = (pricing.getPlanById(planId) as any);
    const amount = plan.amount * 100, gst = Math.round(amount * 0.05);
    const sessionId = overrides.id ?? id('cs_test');
    return { id: id('evt'), object: 'event', created: Math.floor(Date.now() / 1000), type: overrides.type ?? 'checkout.session.completed', livemode: false,
      data: { object: { id: sessionId, object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'cad',
        payment_intent: overrides.paymentIntent ?? id('pi'), amount_total: amount + gst, metadata: { orgId: 'org1', planId, amount: String(amount), gstAmount: String(gst) } } } };
  }
  function charge(type: 'charge.refunded' | 'charge.dispute.created', paymentIntent: string, extra: any = {}) {
    const object = type === 'charge.refunded'
      ? { id: id('ch'), object: 'charge', payment_intent: paymentIntent, amount: 131250, amount_refunded: 131250, refunded: true, ...extra }
      : { id: id('dp'), object: 'dispute', payment_intent: paymentIntent, charge: id('ch'), amount: 131250, status: 'needs_response', ...extra };
    return { id: id('evt'), object: 'event', created: Math.floor(Date.now() / 1000), type, livemode: false, data: { object } };
  }
  async function send(event: any) {
    const payload = JSON.stringify(event);
    return exports.POST(new Request('http://127.0.0.1/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': Stripe.webhooks.generateTestHeaderString({ payload, secret }) }, body: payload }));
  }
  const receipts = () => memory.paths('subscriptions/').map(path => ({ id: path.split('/')[1], data: memory.read(path) as any }));
  const resolveAt = (at: Date) => term.resolvePaidPublicationTerm({ employerId: 'org1', employer: memory.read('employers/org1') as any, receipts: receipts(), now: at });
  return { memory, sends, refreshes, checkout, charge, send, receipts, resolveAt, failEmail: (kind: string) => failingEmails.add(kind),
    employer: () => memory.read('employers/org1') as any, organization: () => memory.read('organizations/org1') as any };
}
const paidTerm = (startsAt: Date, overrides: any = {}) => ({
  plan: 'premium', subscriptionTier: 'premium', subscriptionStatus: 'active', subscriptionStart: startsAt, billingStartAt: startsAt, subscriptionEnd: pricing.addOneCalendarYear(startsAt),
  subscription: { tier: 'premium', status: 'active', billingStartAt: startsAt, subscriptionEnd: pricing.addOneCalendarYear(startsAt), termId: 'cs_current' }, ...overrides,
});
const currentReceipt = (startsAt: Date, overrides: any = {}) => ({ orgId: 'org1', employerId: 'org1', organizationId: 'org1', plan: 'tier2', status: 'active', amount: 2500, gstAmount: 125, totalAmount: 2625,
  billingCycle: 'annual', kind: 'subscription', stripeSessionId: 'cs_current', stripePaymentIntent: 'pi_current', startsAt, createdAt: startsAt, expiresAt: pricing.addOneCalendarYear(startsAt), ...overrides });

test('a first annual purchase runs exactly one calendar year from payment, in Saskatchewan time', async () => {
  const h = harness();
  const before = Date.now();
  assert.equal((await h.send(h.checkout('tier2'))).status, 200);
  const [receipt] = h.receipts();
  const startsAt = receipt.data.startsAt as Date;
  assert.ok(startsAt.getTime() >= before && startsAt.getTime() <= Date.now());
  assert.equal(receipt.data.expiresAt.getTime(), pricing.addOneCalendarYear(startsAt).getTime());
  assert.equal(h.employer().subscriptionEnd.getTime(), receipt.data.expiresAt.getTime());
  assert.equal(h.employer().subscription.termId, receipt.id);
  assert.equal(h.resolveAt(new Date())?.id, receipt.id);
  assert.deepEqual(h.sends.map(([kind]) => kind).sort(), ['admin', 'customer']);
  assert.equal(h.refreshes.partners, 1, 'a new paid term refreshes the partner cards');
  assert.equal((await h.send({ ...h.checkout('tier2', { id: receipt.id }) })).status, 200);
  assert.equal(h.refreshes.partners, 1, 'a replayed session changes nothing');
});

test('renewing during the current paid term starts the new year when the current term ends', async () => {
  const startsAt = new Date(Date.now() - 330 * 86400000);
  const h = harness({ 'employers/org1': { name: 'Fictional org', contactEmail: 'fixture@example.invalid', ...paidTerm(startsAt) }, 'organizations/org1': { name: 'Fictional org', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt) });
  const before = h.employer();
  assert.equal((await h.send(h.checkout('tier2'))).status, 200);
  const renewal = h.receipts().find(r => r.id !== 'cs_current')!;
  const currentEnd = pricing.addOneCalendarYear(startsAt);
  assert.equal(renewal.data.startsAt.getTime(), currentEnd.getTime(), 'the current term is not shortened');
  assert.equal(renewal.data.expiresAt.getTime(), pricing.addOneCalendarYear(currentEnd).getTime());
  assert.equal(renewal.data.renewalOf, 'cs_current');
  assert.deepEqual(h.employer(), before, 'the projection keeps describing the current term');
  assert.equal(h.resolveAt(new Date())?.id, 'cs_current');
  assert.equal(h.resolveAt(currentEnd)?.id, renewal.id, 'the renewal takes over at the boundary');
  assert.deepEqual(h.sends.map(([kind]) => kind), ['admin', 'renewal'], 'a renewal confirmation, never the "now active" one, for a term that starts later');
  assert.equal(h.refreshes.partners, 0, 'a queued renewal changes nothing public yet');
  assert.match(h.sends[0][1].planName, /renewal starting/);
  // A second paid renewal (race) chains after the first rather than overlapping it.
  assert.equal((await h.send(h.checkout('tier2'))).status, 200);
  const second = h.receipts().find(r => r.data.renewalOf === renewal.id)!;
  assert.equal(second.data.startsAt.getTime(), renewal.data.expiresAt.getTime());
  // The daily check promotes the renewal into the projection once the current term has ended.
  assert.equal(await expiration.expireSubscriptionAtomically(h.memory.db as any, 'cs_current', new Date(currentEnd.getTime() + 1000)), true);
  assert.equal(h.employer().subscription.termId, renewal.id);
  assert.equal(h.employer().subscriptionEnd.getTime(), renewal.data.expiresAt.getTime());
  assert.equal(h.organization().subscription.termId, renewal.id);
  assert.equal(h.employer().plan, 'premium');
  assert.equal((h.memory.read('subscriptions/cs_current') as any).status, 'expired');
});

test('a paid renewal is confirmed to the customer once, with the new term, by the delivery that fulfilled it', async () => {
  const startsAt = new Date(Date.now() - 330 * 86400000);
  const h = harness({ 'employers/org1': { name: 'Fictional org', contactName: 'Fictional owner', contactEmail: 'owner@example.invalid', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt) });
  const purchase = h.checkout('tier2');
  assert.equal((await h.send(purchase)).status, 200);
  const currentEnd = pricing.addOneCalendarYear(startsAt);
  const confirmations = () => h.sends.filter(([kind]) => kind === 'renewal').map(([, payload]) => payload);
  assert.equal(confirmations().length, 1);
  const [confirmation] = confirmations();
  assert.deepEqual({ ...confirmation, startsAt: confirmation.startsAt.getTime(), endsAt: confirmation.endsAt.getTime() }, {
    email: 'owner@example.invalid', contactName: 'Fictional owner', orgName: 'Fictional org', planName: 'Premium', amount: 2500, gst: 125,
    startsAt: currentEnd.getTime(), endsAt: pricing.addOneCalendarYear(currentEnd).getTime(),
  });
  assert.ok(!h.sends.some(([kind]) => kind === 'customer'), 'never the "now active" confirmation');
  // Stripe redelivers the event, or sends async success for the same session: neither repeats the email.
  assert.equal((await (await h.send(purchase)).json()).duplicate, true);
  const asyncSuccess = h.checkout('tier2', { id: purchase.data.object.id, type: 'checkout.session.async_payment_succeeded', paymentIntent: purchase.data.object.payment_intent });
  assert.equal((await (await h.send(asyncSuccess)).json()).duplicate, true);
  assert.equal(confirmations().length, 1);
  assert.equal(h.sends.length, 2);
});

test('a failed renewal confirmation neither fails nor repeats the committed renewal', async () => {
  const startsAt = new Date(Date.now() - 330 * 86400000);
  const h = harness({ 'employers/org1': { name: 'Fictional org', contactEmail: 'owner@example.invalid', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt) });
  h.failEmail('renewal');
  const purchase = h.checkout('tier2');
  assert.equal((await h.send(purchase)).status, 200);
  assert.equal(h.receipts().find(r => r.id === purchase.data.object.id)?.data.renewalOf, 'cs_current');
  assert.equal((h.memory.read(`stripeWebhookEvents/${purchase.id}`) as any).outcome, 'renewal_scheduled');
  assert.equal((await h.send(purchase)).status, 200);
  assert.deepEqual(h.sends.map(([kind]) => kind), ['admin', 'renewal'], 'attempted once; a redelivery never retries it');
});

test('a plan change queued for review and a renewal refunded before fulfillment get no customer confirmation', async () => {
  const startsAt = new Date(Date.now() - 330 * 86400000);
  const seed = { 'employers/org1': { name: 'Fictional org', contactEmail: 'owner@example.invalid', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt) };
  const change = harness(seed);
  assert.equal((await change.send(change.checkout('tier1'))).status, 200);
  assert.equal(change.receipts().find(r => r.id !== 'cs_current')!.data.reviewRequired, 'plan_change_during_term');
  assert.deepEqual(change.sends.map(([kind]) => kind), ['admin']);
  assert.match(change.sends[0][1].planName, /plan change needs review/);
  const refunded = harness(seed);
  assert.equal((await (await refunded.send(refunded.charge('charge.refunded', 'pi_early_renewal'))).json()).outcome, 'unmatched');
  assert.equal((await refunded.send(refunded.checkout('tier2', { paymentIntent: 'pi_early_renewal' }))).status, 200);
  const early = refunded.receipts().find(r => r.id !== 'cs_current')!.data;
  assert.deepEqual([early.renewalOf, early.status], ['cs_current', 'refunded']);
  assert.deepEqual(refunded.sends.map(([kind]) => kind), ['admin']);
  assert.match(refunded.sends[0][1].planName, /nothing granted/);
});

test('a different-tier payment that slips past checkout is queued and flagged, never downgrading mid-term', async () => {
  const startsAt = new Date(Date.now() - 30 * 86400000);
  const h = harness({ 'employers/org1': { name: 'Fictional org', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt) });
  assert.equal((await h.send(h.checkout('tier1'))).status, 200);
  const queued = h.receipts().find(r => r.id !== 'cs_current')!;
  assert.equal(queued.data.startsAt.getTime(), pricing.addOneCalendarYear(startsAt).getTime());
  assert.equal(queued.data.planChange, true);
  assert.equal(queued.data.reviewRequired, 'plan_change_during_term');
  assert.equal(h.employer().plan, 'premium');
  assert.equal(h.resolveAt(new Date())?.tier, 'premium');
});

test('complimentary access is not a paid term: a paid plan starts at payment and replaces it', async () => {
  const grant = { plan: 'premium', subscriptionTier: 'premium', subscriptionStatus: 'active', subscriptionStart: '2026-08-19T00:00:00.000Z', billingStartAt: '2026-08-19T00:00:00.000Z', subscriptionEnd: '2027-08-19T00:00:00.000Z',
    subscription: { tier: 'premium', status: 'active', billingStartAt: '2026-08-19T00:00:00.000Z', subscriptionEnd: '2027-08-19T00:00:00.000Z', paymentId: 'admin-grant-tier2', amountPaid: 0 } };
  const h = harness({ 'employers/org1': { name: 'Fictional org', ...grant } });
  assert.equal((await h.send(h.checkout('tier2'))).status, 200);
  const [receipt] = h.receipts();
  assert.equal(receipt.data.renewalOf, undefined);
  assert.equal(h.employer().subscription.paymentId, undefined);
  assert.equal(h.resolveAt(new Date())?.id, receipt.id);
});

test('a full refund removes an unused purchased credit once, and replays are idempotent', async () => {
  const h = harness();
  const purchase = h.checkout('standard-post', { paymentIntent: 'pi_refund_me' });
  assert.equal((await h.send(purchase)).status, 200);
  assert.equal(h.employer().standardPostCredits, 1);
  const refund = h.charge('charge.refunded', 'pi_refund_me');
  const response = await h.send(refund);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).outcome, 'revoked');
  assert.equal(h.employer().standardPostCredits, 0);
  const [receipt] = h.receipts();
  assert.equal(receipt.data.status, 'refunded');
  assert.deepEqual({ ...receipt.data.revocation, stripeEventId: undefined }, { kind: 'refunded', stripeEventId: undefined, stripeEventType: 'charge.refunded', creditsRemoved: 1, termEnded: false });
  assert.equal((await (await h.send(refund)).json()).outcome, 'duplicate');
  assert.equal((await (await h.send(h.charge('charge.dispute.created', 'pi_refund_me'))).json()).outcome, 'already_revoked');
  assert.equal(h.employer().standardPostCredits, 0, 'never below zero, never removed twice');
  assert.equal(h.refreshes.partners, 0, 'credits are not public');
  assert.equal((h.memory.read(`stripeWebhookEvents/${refund.id}`) as any).outcome, 'revoked');
});

test('a refund after the credit was spent leaves the published job and an empty balance alone', async () => {
  const h = harness({ 'jobs/published': { employerId: 'org1', status: 'active', standardCreditConsumed: true } });
  assert.equal((await h.send(h.checkout('featured-post', { paymentIntent: 'pi_spent' }))).status, 200);
  await h.memory.db.doc('employers/org1').update({ featuredPostCredits: 0 });
  assert.equal((await (await h.send(h.charge('charge.refunded', 'pi_spent'))).json()).outcome, 'revoked');
  assert.equal(h.employer().featuredPostCredits, 0);
  assert.equal(h.receipts()[0].data.revocation.creditsRemoved, 0);
  assert.deepEqual(h.memory.read('jobs/published'), { employerId: 'org1', status: 'active', standardCreditConsumed: true });
});

test('a refunded or disputed annual payment ends the term it currently funds', async () => {
  for (const type of ['charge.refunded', 'charge.dispute.created'] as const) {
    const startsAt = new Date(Date.now() - 30 * 86400000);
    const h = harness({ 'employers/org1': { name: 'Fictional org', ...paidTerm(startsAt) }, 'organizations/org1': { name: 'Fictional org', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt),
      'jobs/live': { employerId: 'org1', status: 'active', publication: { version: 1, funding: 'premium_subscription', termId: 'cs_current' } } });
    assert.equal(h.resolveAt(new Date())?.id, 'cs_current');
    assert.equal((await (await h.send(h.charge(type, 'pi_current'))).json()).outcome, 'revoked');
    const kind = type === 'charge.refunded' ? 'refunded' : 'disputed';
    assert.equal((h.memory.read('subscriptions/cs_current') as any).status, kind);
    assert.equal(h.employer().plan, 'free');
    assert.equal(h.employer().subscriptionStatus, 'expired');
    assert.equal(h.employer().subscription.endedReason, kind);
    assert.equal(h.organization().plan, null);
    assert.equal(h.resolveAt(new Date()), null);
    assert.deepEqual(h.memory.read('jobs/live'), { employerId: 'org1', status: 'active', publication: { version: 1, funding: 'premium_subscription', termId: 'cs_current' } }, 'published jobs are untouched');
    assert.equal(h.refreshes.partners, 1, 'the ended term refreshes the partner cards');
  }
});

test('refunding a queued renewal leaves the current term and flags nothing else; refunding the current term flags its renewal', async () => {
  const startsAt = new Date(Date.now() - 330 * 86400000);
  const seed = { 'employers/org1': { name: 'Fictional org', ...paidTerm(startsAt) }, 'subscriptions/cs_current': currentReceipt(startsAt) };
  const a = harness(seed);
  assert.equal((await a.send(a.checkout('tier2', { paymentIntent: 'pi_renewal' }))).status, 200);
  const before = a.employer();
  assert.equal((await (await a.send(a.charge('charge.refunded', 'pi_renewal'))).json()).outcome, 'revoked');
  assert.deepEqual(a.employer(), before);
  assert.equal(a.resolveAt(pricing.addOneCalendarYear(startsAt)), null, 'a refunded renewal never takes over');
  const b = harness(seed);
  assert.equal((await b.send(b.checkout('tier2', { paymentIntent: 'pi_renewal' }))).status, 200);
  assert.equal((await (await b.send(b.charge('charge.refunded', 'pi_current'))).json()).outcome, 'revoked');
  assert.equal(b.receipts().find(r => r.data.renewalOf === 'cs_current')!.data.reviewRequired, 'predecessor_revoked');
});

test('a refund that arrives before fulfillment is remembered and the later fulfillment grants nothing', async () => {
  const h = harness();
  assert.equal((await (await h.send(h.charge('charge.refunded', 'pi_early'))).json()).outcome, 'unmatched');
  assert.equal((h.memory.read('stripeRevocations/pi_early') as any).kind, 'refunded');
  assert.equal((await h.send(h.checkout('standard-post', { paymentIntent: 'pi_early' }))).status, 200);
  assert.equal(h.employer().standardPostCredits, undefined);
  assert.equal(h.receipts()[0].data.status, 'refunded');
  assert.match(h.sends.find(([kind]) => kind === 'admin')[1].planName, /nothing granted/);
});

test('partial refunds and charges without a payment intent are acknowledged without changes', async () => {
  const h = harness();
  assert.equal((await h.send(h.checkout('standard-post', { paymentIntent: 'pi_partial' }))).status, 200);
  assert.equal((await (await h.send(h.charge('charge.refunded', 'pi_partial', { refunded: false, amount_refunded: 1000 }))).json()).ignored, 'partial_refund');
  assert.equal((await (await h.send(h.charge('charge.dispute.created', null as any))).json()).ignored, 'no_payment_intent');
  assert.equal(h.employer().standardPostCredits, 1);
  assert.equal(h.receipts()[0].data.status, 'active');
});

test('refunding a term that already lapsed records the refund without rewriting account history', async () => {
  const startsAt = new Date(Date.now() - 400 * 86400000);
  const endedAt = pricing.addOneCalendarYear(startsAt);
  const lapsed = { plan: 'free', subscriptionTier: 'free', subscriptionStatus: 'expired', subscriptionStart: startsAt, subscriptionEnd: endedAt,
    subscription: { tier: 'free', status: 'expired', billingStartAt: startsAt, subscriptionEnd: endedAt, termId: 'cs_current' } };
  const h = harness({ 'employers/org1': { name: 'Fictional org', ...lapsed }, 'subscriptions/cs_current': currentReceipt(startsAt, { status: 'expired' }) });
  const before = h.employer();
  assert.equal((await (await h.send(h.charge('charge.refunded', 'pi_current'))).json()).outcome, 'revoked');
  assert.equal((h.memory.read('subscriptions/cs_current') as any).status, 'refunded');
  assert.equal((h.memory.read('subscriptions/cs_current') as any).revocation.termEnded, false);
  assert.deepEqual(h.employer(), before);
});

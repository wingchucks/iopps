/* eslint-disable @typescript-eslint/no-explicit-any -- real cron route and expiry module over the in-memory transaction double */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as expiration from '../src/lib/server/subscription-expiration.ts';
import { memoryFirestore } from './helpers/memory-firestore.mjs';

function cron(seed: Record<string, unknown>, expirationModule: Record<string, unknown> = expiration) {
  const memory = memoryFirestore(seed);
  const exports: any = {};
  const logged: string[] = [];
  let refreshes = 0;
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/cron/check-subscriptions/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Promise, Error, Date, console: { log() {}, error: (message: string) => logged.push(message) }, process: { env: { CRON_SECRET: 'fictional-cron' } },
    require: (name: string) => {
      if (name === 'next/server') return { NextResponse: { json: Response.json } };
      if (name === '@/lib/firebase-admin') return { getAdminDb: () => memory.db };
      if (name === '@/lib/server/subscription-expiration') return expirationModule;
      if (name === '@/lib/public-partner-cache') return { refreshPublicPartners: () => { refreshes++; } };
      throw new Error(name);
    },
  });
  return { memory, logged, get refreshes() { return refreshes; }, run: () => exports.GET(new Request('http://127.0.0.1/api/cron/check-subscriptions', { headers: { authorization: 'Bearer fictional-cron' } })) };
}

test('one receipt needing reconciliation is reported without stopping the rest of the run', async () => {
  const h = cron({
    // Ambiguous legacy organization mapping: this receipt cannot be expired safely.
    'subscriptions/a-bad': { orgId: 'owner-a', plan: 'tier2', status: 'active', expiresAt: new Date('2000-01-01') },
    'employers/owner-a': { plan: 'premium' }, 'organizations/x': { employerId: 'owner-a' }, 'organizations/y': { employerId: 'owner-a' },
    'subscriptions/b-good': { orgId: 'owner-b', plan: 'tier1', status: 'active', expiresAt: new Date('2000-01-01') },
    'employers/owner-b': { plan: 'standard' }, 'organizations/owner-b': { plan: 'standard' },
    'subscriptions/c-current': { orgId: 'owner-c', plan: 'tier1', status: 'active', expiresAt: new Date('2999-01-01') },
  });
  const response = await h.run();
  assert.equal(response.status, 500, 'failures stay visible to cron monitoring');
  const body = await response.json();
  assert.deepEqual({ checked: body.checked, expired: body.expired, failed: body.failed }, { checked: 3, expired: 1, failed: 1 });
  assert.equal(body.failures[0].id, 'a-bad');
  assert.match(body.failures[0].error, /Ambiguous organization mapping/);
  assert.equal((h.memory.read('subscriptions/b-good') as any).status, 'expired');
  assert.equal((h.memory.read('employers/owner-b') as any).plan, 'free');
  assert.equal((h.memory.read('subscriptions/a-bad') as any).status, 'active', 'the bad receipt is untouched, not partially expired');
  assert.equal((h.memory.read('employers/owner-a') as any).plan, 'premium');
  assert.ok(h.logged.some(line => line.includes('a-bad')));
  assert.equal(h.refreshes, 1, 'the expired term refreshes the partner cards even though another receipt failed');
});

test('a clean run answers 200 with an empty failure list', async () => {
  const h = cron({ 'subscriptions/b-good': { orgId: 'owner-b', plan: 'tier1', status: 'active', expiresAt: new Date('2000-01-01') }, 'employers/owner-b': { plan: 'standard' } });
  const response = await h.run();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).failures, []);
  assert.equal(h.refreshes, 1);
  const quiet = cron({ 'subscriptions/c-current': { orgId: 'owner-c', plan: 'tier1', status: 'active', expiresAt: new Date('2999-01-01') } });
  assert.equal((await quiet.run()).status, 200);
  assert.equal(quiet.refreshes, 0, 'nothing expired, nothing to refresh');
});

test('one-time purchases and receipts not yet due never start an expiry transaction', async () => {
  const transactions: string[] = [];
  const counted = {
    ...expiration,
    expireSubscriptionAtomically: (db: any, id: string, now: Date) => {
      transactions.push(id);
      return expiration.expireSubscriptionAtomically(db, id, now);
    },
  };
  const h = cron({
    'subscriptions/one-time-1': { orgId: 'owner-b', plan: 'standard-post', status: 'active', billingCycle: 'one-time', kind: 'purchase', expiresAt: null },
    'subscriptions/one-time-2': { orgId: 'owner-b', plan: 'featured-post', status: 'active', billingCycle: 'one-time', kind: 'purchase' },
    'subscriptions/c-current': { orgId: 'owner-c', plan: 'tier1', status: 'active', expiresAt: new Date('2999-01-01') },
    'subscriptions/b-good': { orgId: 'owner-b', plan: 'tier1', status: 'active', expiresAt: new Date('2000-01-01') },
    'employers/owner-b': { plan: 'standard' }, 'organizations/owner-b': { plan: 'standard' },
  }, counted);
  const response = await h.run();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual({ checked: body.checked, due: body.due, expired: body.expired }, { checked: 4, due: 1, expired: 1 });
  assert.deepEqual(transactions, ['b-good']);
  assert.equal((h.memory.read('subscriptions/one-time-1') as any).status, 'active', 'one-time purchases are left alone');
});

test('the due check matches the transaction for Timestamps, dates and missing expiries', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  assert.equal(expiration.isSubscriptionExpiryDue({ toDate: () => new Date('2026-10-03T11:59:59Z') }, now), true);
  assert.equal(expiration.isSubscriptionExpiryDue(new Date('2026-10-03T12:00:00Z'), now), true);
  assert.equal(expiration.isSubscriptionExpiryDue('2027-01-01T00:00:00Z', now), false);
  for (const missing of [null, undefined, '', 'not a date']) assert.equal(expiration.isSubscriptionExpiryDue(missing, now), false);
});

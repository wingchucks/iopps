import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as pricing from '../src/lib/pricing.ts';

// The actual email module with a fictional provider transport. No network or credentials.
function loadEmail({ provider = async () => ({ data: { id: 'fictional-id' } }), key = 'fictional-unit-key' } = {}) {
  const sent = [], logged = [];
  const loaded = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/email.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module: loaded, exports: loaded.exports, console: { error: (...args) => logged.push(args) },
    process: { env: key ? { RESEND_API_KEY: key } : {} },
    require: id => {
      if (id === 'resend') return { Resend: class { emails = { send: async message => { sent.push(message); return provider(message); } }; } };
      if (id === '@/lib/auth-verification-email') return { buildAccountVerificationEmailContent: () => '' };
      if (id === '@/lib/pricing') return pricing;
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { email: loaded.exports, sent, logged };
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/ ([.,!?])/g, '$1');
const plain = value => JSON.parse(JSON.stringify(value)); // results come from the VM realm

// 03:00 UTC on October 3 is still the evening of October 2 in Saskatchewan (UTC-6 all year).
const startsAt = new Date('2027-10-03T03:00:00.000Z');
const renewal = { email: 'owner@example.invalid', contactName: 'Fictional Owner', orgName: 'Fictional Org', planName: 'Premium', amount: 2500, gst: 125,
  startsAt, endsAt: pricing.addOneCalendarYear(startsAt) };

test('renewal confirmation states the plan, the new term on the Saskatchewan calendar and the amount paid', async () => {
  const { email, sent, logged } = loadEmail();
  assert.deepEqual(plain(await email.sendSubscriptionRenewalConfirmation(renewal)), { success: true });
  assert.equal(sent.length, 1);
  const [message] = sent;
  assert.deepEqual([message.from, message.to], ['IOPPS <notifications@iopps.ca>', 'owner@example.invalid']);
  assert.equal(message.subject, 'IOPPS Renewal Confirmed — Premium Plan from October 2, 2027');
  const body = text(message.html);
  assert.ok(body.includes('Your Premium plan for Fictional Org is renewed for another year, from October 2, 2027 to October 2, 2028.'), body);
  for (const row of ['Plan Premium', 'New term starts October 2, 2027', 'New term ends October 2, 2028', 'Amount $2500.00 CAD', 'GST (5%) $125.00 CAD', 'Total paid $2625.00 CAD']) {
    assert.ok(body.includes(row), row);
  }
  assert.doesNotMatch(body, /October 3|now active/, 'UTC dates and the "now active" wording never reach a renewal');
  assert.match(body, /Saskatchewan time/);
  assert.deepEqual(logged, []);
});

test('a rejected or failed renewal confirmation is logged and reported, never thrown', async () => {
  for (const [provider, reason] of [
    [async () => ({ error: { message: 'Fictional provider rejection' } }), /Fictional provider rejection/],
    [async () => ({ data: {} }), /did not confirm acceptance/],
    [async () => { throw new Error('Fictional network failure'); }, /Fictional network failure/],
  ]) {
    const { email, sent, logged } = loadEmail({ provider });
    const result = await email.sendSubscriptionRenewalConfirmation(renewal);
    assert.equal(result.success, false);
    assert.match(result.error, reason);
    assert.equal(sent.length, 1);
    assert.equal(logged.length, 1);
    assert.equal(logged[0][0], '[email] Subscription renewal confirmation failed:');
  }
  const unconfigured = loadEmail({ key: '' });
  assert.deepEqual(plain(await unconfigured.email.sendSubscriptionRenewalConfirmation(renewal)), { success: false, error: 'Email not configured' });
  assert.equal(unconfigured.sent.length, 0);
});

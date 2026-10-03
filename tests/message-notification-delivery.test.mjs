import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

// The actual escaping template: the route passes raw names and never pre-escapes them.
function templates() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/email-templates.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports });
  return exports;
}

function harness() {
  let now = 1_800_000_000_000, providerError = false, receiptWriteError = false;
  const documents = new Map([
    ['messages/msg', { senderId: 'sender', conversationId: 'conv', createdAt: { toMillis: () => now }, text: 'PRIVATE BODY NEVER IN EMAIL' }],
    ['conversations/conv', { participants: ['sender', 'recipient'] }],
    ['members/sender', { displayName: '<b>Sender</b>' }],
    ['members/recipient', { displayName: '<i>Recipient</i>', email: 'untrusted@example.test' }],
  ]);
  const identity = { email: 'verified@example.test', emailVerified: true, disabled: false };
  const calls = [], accepted = new Map();
  let user = 'sender', unauthorized = false, wait, authFailure;
  const snapshot = ref => ({ exists: documents.has(ref), data: () => documents.get(ref) });
  // Serial transactions model Firestore's contention retry boundary.
  let queue = Promise.resolve();
  const db = { doc: path => path, runTransaction(fn) {
    const task = queue.then(async () => {
      const writes = [];
      const result = await fn({ get: async ref => snapshot(ref), getAll: async (...refs) => refs.map(snapshot), create: (ref, data) => writes.push([ref, data]), set: (ref, data) => writes.push([ref, data]), update: (ref, data) => writes.push([ref, { ...documents.get(ref), ...data }]) });
      if (receiptWriteError && writes.some(([, data]) => data.status === 'accepted')) throw Error('receipt unavailable');
      for (const [ref, data] of writes) documents.set(ref, data);
      return result;
    });
    queue = task.catch(() => {});
    return task;
  } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/messages/notify/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date: { now: () => now }, require(id) {
      if (id === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } };
      if (id === '@/lib/api-auth') return { verifyAuthToken: async () => unauthorized ? { success: false, response: { status: 401 } } : { success: true, decodedToken: { uid: user } } };
      if (id === '@/lib/firebase-admin') return { getAdminDb: () => db, getAdminAuth: () => ({ getUser: async uid => { assert.equal(uid, 'recipient'); if (authFailure) throw authFailure; return identity; } }) };
      if (id === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => now } };
      if (id === '@/lib/email-templates') return templates();
      if (id === 'node:crypto') return crypto;
      if (id === '@/lib/email') return { sendMessageNotification: async (payload, key) => {
        calls.push({ payload, key });
        if (wait) await wait;
        if (providerError) throw Error('provider unavailable');
        if (!accepted.has(key)) accepted.set(key, { id: `provider-${accepted.size}` });
        return accepted.get(key);
      } };
      throw Error(`Unexpected import ${id}`);
    },
  });
  // A further message saved now by the sender, in an existing or new conversation with the recipient.
  const message = (id, conversationId = 'conv') => {
    if (!documents.has(`conversations/${conversationId}`)) documents.set(`conversations/${conversationId}`, { participants: ['sender', 'recipient'] });
    documents.set(`messages/${id}`, { senderId: 'sender', conversationId, createdAt: { toMillis: () => now }, text: 'PRIVATE BODY NEVER IN EMAIL' });
    return id;
  };
  return { documents, identity, calls, accepted, message, request: (id = 'msg') => exports.POST({ json: async () => ({ messageId: id }) }), advance: ms => { now += ms; }, providerFails: value => { providerError = value; }, receiptFails: value => { receiptWriteError = value; }, as: uid => { user = uid; }, unauthorized: () => { unauthorized = true; }, waitFor: promise => { wait = promise; }, authFails: error => { authFailure = error; } };
}

test('message notification uses verified Auth address, escaped identity, private payload and one accepted receipt', async () => {
  const h = harness();
  assert.equal((await h.request()).body.notification, 'accepted');
  const { payload, key } = h.calls[0];
  assert.equal(payload.to, 'verified@example.test');
  assert.match(payload.html, /&lt;b&gt;Sender&lt;\/b&gt;/);
  assert.match(payload.html, /Hi &lt;i&gt;Recipient&lt;\/i&gt;,/);
  assert.doesNotMatch(payload.html, /<b>Sender|<i>Recipient|&amp;lt;/, 'names are escaped exactly once');
  assert.match(payload.html, /href="https:\/\/www\.iopps\.ca\/messages"/);
  assert.doesNotMatch(payload.html, /PRIVATE BODY/);
  assert.ok(key.length < 256);
  assert.equal(h.documents.get('mail/message-msg').status, 'accepted');
  assert.equal((await h.request()).body.notification, 'accepted');
  assert.equal(h.calls.length, 1);
});

test('message notification refuses unauthenticated, foreign sender, malformed IDs and invalid participants', async () => {
  for (const scenario of ['unauthenticated', 'foreign', 'malformed', 'participants']) {
    const h = harness();
    if (scenario === 'unauthenticated') h.unauthorized();
    if (scenario === 'foreign') h.as('stranger');
    if (scenario === 'participants') h.documents.set('conversations/conv', { participants: ['sender', 'recipient', 'stranger'] });
    const result = await h.request(scenario === 'malformed' ? '../private' : 'msg');
    assert.ok(result.status >= 400);
    assert.equal(h.calls.length, 0);
    assert.equal(h.documents.has('mail/message-msg'), false);
  }
});

test('message notification respects disabled/unverified/missing identity and email opt-out', async () => {
  for (const scenario of ['disabled', 'unverified', 'missing', 'optout']) {
    const h = harness();
    if (scenario === 'disabled') h.identity.disabled = true;
    if (scenario === 'unverified') h.identity.emailVerified = false;
    if (scenario === 'missing') delete h.identity.email;
    if (scenario === 'optout') h.documents.set('notification_preferences/recipient', { categories: { messages: { email: false } } });
    assert.equal((await h.request()).body.notification, 'skipped');
    assert.equal(h.calls.length, 0);
  }
});

test('legacy queued mail is untouched and historical unqueued messages are not replayed', async () => {
  const h = harness(), legacy = { status: 'pending', to: 'old@example.test', createdAt: 123 };
  h.documents.set('mail/message-msg', legacy);
  assert.equal((await h.request()).body.notification, 'legacy_queued');
  assert.equal(h.documents.get('mail/message-msg'), legacy);
  h.documents.delete('mail/message-msg');
  h.documents.get('messages/msg').createdAt = { toMillis: () => 1 };
  assert.equal((await h.request()).body.notification, 'expired');
  assert.equal(h.calls.length, 0);
});

test('concurrent calls acquire one send lease', async () => {
  const h = harness();
  let release;
  h.waitFor(new Promise(resolve => { release = resolve; }));
  const first = h.request();
  while (!h.calls.length) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.request()).body.notification, 'busy');
  release();
  assert.equal((await first).body.notification, 'accepted');
  assert.equal(h.calls.length, 1);
});

test('provider failures are truthful and retries preserve payload/key despite changed names', async () => {
  const h = harness(); h.providerFails(true);
  assert.equal((await h.request()).status, 503);
  assert.equal(h.documents.get('mail/message-msg').status, 'failed');
  h.providerFails(false); h.documents.get('members/sender').displayName = 'Changed';
  assert.equal((await h.request()).body.notification, 'accepted');
  assert.deepEqual(h.calls[1], h.calls[0]);
});

test('acceptance followed by receipt failure retries with one provider delivery after lease expires', async () => {
  const h = harness(); h.receiptFails(true);
  assert.equal((await h.request()).status, 503);
  assert.equal((await h.request()).body.notification, 'busy');
  h.receiptFails(false); h.advance(120_001);
  assert.equal((await h.request()).body.notification, 'accepted');
  assert.equal(h.accepted.size, 1);
  assert.deepEqual(h.calls[1], h.calls[0]);
});

test('changed recipient address, later opt-out and expired provider retry window prevent another send', async () => {
  for (const scenario of ['address', 'optout', 'expiry']) {
    const h = harness(); h.providerFails(true); await h.request(); h.providerFails(false);
    if (scenario === 'address') h.identity.email = 'changed@example.test';
    if (scenario === 'optout') h.documents.set('notification_preferences/recipient', { categories: { messages: { email: false } } });
    if (scenario === 'expiry') h.advance(23 * 60 * 60 * 1000);
    assert.equal((await h.request()).body.notification, scenario === 'expiry' ? 'expired' : 'skipped');
    assert.equal(h.calls.length, 1);
  }
});

test('recipients who turned off direct messages are skipped on first attempts and retries', async () => {
  const h = harness();
  h.documents.set('member_settings/recipient', { allowDirectMessages: false });
  assert.deepEqual({ ...(await h.request()).body }, { success: true, notification: 'skipped' });
  assert.equal(h.calls.length, 0);
  assert.equal(h.documents.has('mail/message-msg'), false);
  const retry = harness(); retry.providerFails(true); await retry.request(); retry.providerFails(false);
  retry.documents.set('member_settings/recipient', { allowDirectMessages: false });
  assert.equal((await retry.request()).body.notification, 'skipped');
  assert.equal(retry.calls.length, 1);
  const allowed = harness(); allowed.documents.set('member_settings/recipient', { allowDirectMessages: true });
  assert.equal((await allowed.request()).body.notification, 'accepted');
});

test('quiet hours skip email using their start and end times in America/Regina', async () => {
  // The fixture clock is 2027-01-15 08:00 UTC, which is 02:00 in Regina (no daylight saving).
  for (const [quietHours, expected] of [
    [{ enabled: true, start: '22:00', end: '08:00' }, 'skipped'],
    [{ enabled: true, start: '02:00', end: '02:30' }, 'skipped'],
    [{ enabled: true, start: '01:30', end: '02:00' }, 'accepted'],
    [{ enabled: true, start: '07:30', end: '08:30' }, 'accepted'],
    [{ enabled: true, start: '09:00', end: '17:00' }, 'accepted'],
    [{ enabled: false, start: '22:00', end: '08:00' }, 'accepted'],
    [{ enabled: true, start: 'late', end: '08:00' }, 'accepted'],
    [{ enabled: true, start: '02:00', end: '02:00' }, 'accepted'],
  ]) {
    const h = harness();
    h.documents.set('notification_preferences/recipient', { categories: { messages: { email: true } }, quietHours });
    assert.equal((await h.request()).body.notification, expected, JSON.stringify(quietHours));
    assert.equal(h.calls.length, expected === 'accepted' ? 1 : 0);
  }
});

test('a closed recipient account is skipped instead of failing for client retries', async () => {
  const h = harness();
  h.authFails(Object.assign(new Error('There is no user record'), { code: 'auth/user-not-found' }));
  const result = await h.request();
  assert.equal(result.status, 200);
  assert.deepEqual({ ...result.body }, { success: true, notification: 'skipped' });
  assert.equal(h.calls.length, 0);
  assert.equal(h.documents.has('mail/message-msg'), false);
  const outage = harness();
  outage.authFails(Object.assign(new Error('Auth unavailable'), { code: 'auth/internal-error' }));
  assert.equal((await outage.request()).status, 503, 'only a missing account is final');
});

test('a burst in one conversation sends one email per window while retries keep their message idempotency', async () => {
  const h = harness();
  assert.equal((await h.request()).body.notification, 'accepted');
  for (let index = 0; index < 50; index++) {
    assert.equal((await h.request(h.message(`burst-${index}`))).body.notification, 'skipped');
    h.advance(1000);
  }
  assert.equal(h.calls.length, 1);
  assert.equal([...h.documents.keys()].filter(key => key.startsWith('mail/')).length, 1);
  assert.equal((await h.request()).body.notification, 'accepted', 'the claimant stays idempotent');
  assert.equal(h.calls.length, 1);
  h.advance(15 * 60 * 1000);
  assert.equal((await h.request(h.message('after-window'))).body.notification, 'accepted');
  assert.equal(h.calls.length, 2);
  assert.equal((await h.request(h.message('other-conversation', 'conv-2'))).body.notification, 'accepted', 'windows are per conversation');
  assert.equal(h.calls.length, 3);
});

test('concurrent new messages in one conversation claim a single email', async () => {
  const h = harness();
  const results = await Promise.all([h.request(), h.request(h.message('concurrent-a')), h.request(h.message('concurrent-b'))]);
  assert.deepEqual(results.map(result => result.body.notification), ['accepted', 'skipped', 'skipped']);
  assert.equal(h.calls.length, 1);
});

test('a provider failure keeps its own retry and lets the next message in the window take over', async () => {
  const h = harness(); h.providerFails(true);
  assert.equal((await h.request()).status, 503);
  h.providerFails(false);
  assert.equal((await h.request(h.message('takeover'))).body.notification, 'accepted');
  assert.equal((await h.request(h.message('after-takeover'))).body.notification, 'skipped');
  assert.equal((await h.request()).body.notification, 'accepted', 'the failed message retries with its own key');
  assert.deepEqual(h.calls.map(call => call.key), [h.calls[0].key, h.calls[1].key, h.calls[0].key]);
});

test('each sender has an hourly and daily email quota; counted retries are never re-counted', async () => {
  const h = harness(); h.providerFails(true);
  assert.equal((await h.request()).status, 503);
  h.providerFails(false);
  for (let index = 1; index < 10; index++) assert.equal((await h.request(h.message(`quota-${index}`, `quota-conv-${index}`))).body.notification, 'accepted');
  assert.equal((await h.request(h.message('quota-over', 'quota-conv-over'))).body.notification, 'skipped');
  assert.equal((await h.request()).body.notification, 'accepted', 'the first counted message can still retry');
  assert.equal(h.calls.length, 11);
  let sent = 10;
  for (let hour = 1; hour <= 3; hour++) {
    h.advance(60 * 60 * 1000 + 1);
    for (let index = 0; index < 10; index++) {
      const result = (await h.request(h.message(`day-${hour}-${index}`, `day-conv-${hour}-${index}`))).body.notification;
      if (result === 'accepted') sent++;
    }
  }
  assert.equal(sent, 30, 'thirty new message emails per sender per day');
  h.advance(24 * 60 * 60 * 1000);
  assert.equal((await h.request(h.message('next-day', 'next-day-conv'))).body.notification, 'accepted');
});

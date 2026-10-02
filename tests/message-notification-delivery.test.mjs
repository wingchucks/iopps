import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

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
  let user = 'sender', unauthorized = false, wait;
  const snapshot = ref => ({ exists: documents.has(ref), data: () => documents.get(ref) });
  // Serial transactions model Firestore's contention retry boundary.
  let queue = Promise.resolve();
  const db = { doc: path => path, runTransaction(fn) {
    const task = queue.then(async () => {
      const writes = [];
      const result = await fn({ get: async ref => snapshot(ref), getAll: async (...refs) => refs.map(snapshot), create: (ref, data) => writes.push([ref, data]), update: (ref, data) => writes.push([ref, { ...documents.get(ref), ...data }]) });
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
      if (id === '@/lib/firebase-admin') return { getAdminDb: () => db, getAdminAuth: () => ({ getUser: async uid => { assert.equal(uid, 'recipient'); return identity; } }) };
      if (id === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => now } };
      if (id === '@/lib/email-templates') return { newMessageEmail: (recipient, sender) => `${recipient} received a message from ${sender}: https://www.iopps.ca/messages` };
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
  return { documents, identity, calls, accepted, request: (id = 'msg') => exports.POST({ json: async () => ({ messageId: id }) }), advance: ms => { now += ms; }, providerFails: value => { providerError = value; }, receiptFails: value => { receiptWriteError = value; }, as: uid => { user = uid; }, unauthorized: () => { unauthorized = true; }, waitFor: promise => { wait = promise; } };
}

test('message notification uses verified Auth address, escaped identity, private payload and one accepted receipt', async () => {
  const h = harness();
  assert.equal((await h.request()).body.notification, 'accepted');
  const { payload, key } = h.calls[0];
  assert.equal(payload.to, 'verified@example.test');
  assert.match(payload.html, /&lt;b&gt;Sender&lt;\/b&gt;/);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { notifyNewMessage } from '../src/lib/message-notification-retry.ts';

function harness(responses = [{ notification: 'accepted' }]) {
  const sender = { uid: 'sender', getIdToken: async () => 'fictional-token' };
  let user = sender, listener, unsubscribed = 0;
  const requests = [], delays = [];
  const h = { sender, requests, delays,
    change(value) { user = value; listener?.(value); },
    get unsubscribed() { return unsubscribed; },
    dependencies: {
      currentUser: () => user,
      subscribe: callback => { listener = callback; return () => { unsubscribed++; listener = undefined; }; },
      wait: async (milliseconds, signal) => { delays.push(milliseconds); if (signal.aborted) throw Error('cancelled'); },
      fetch: async (url, options) => {
        requests.push({ url, options });
        const next = responses[Math.min(requests.length - 1, responses.length - 1)];
        if (next instanceof Error) throw next;
        return new Response(JSON.stringify(next), { status: next.status || 200 });
      },
    },
    run: () => notifyNewMessage('just-saved-message', 'sender', h.dependencies),
  };
  return h;
}

test('transient provider/network failure retries the same sender/message and confirms acceptance', async () => {
  const h = harness([{ status: 503 }, new Error('Network failed'), { notification: 'accepted' }]);
  assert.equal((await h.run()).state, 'accepted');
  assert.deepEqual(h.delays, [1000, 3000]);
  assert.equal(h.requests.length, 3);
  for (const { url, options } of h.requests) {
    assert.equal(url, '/api/messages/notify');
    assert.deepEqual(JSON.parse(options.body), { messageId: 'just-saved-message' });
    assert.equal(options.headers.Authorization, 'Bearer fictional-token');
  }
  assert.equal(h.unsubscribed, 1);
});

test('permanent authorization/input errors stop without another request', async () => {
  for (const status of [400, 401, 403, 404]) {
    const h = harness([{ status }]);
    assert.equal((await h.run()).state, 'failed');
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.delays, []);
    assert.equal(h.unsubscribed, 1);
  }
});

test('persistent provider failures exhaust four bounded attempts and surface failure', async () => {
  const h = harness([{ status: 503 }]);
  assert.equal((await h.run()).state, 'failed');
  assert.equal(h.requests.length, 4);
  assert.deepEqual(h.delays, [1000, 3000, 10000]);
  assert.equal(h.unsubscribed, 1);
});

test('busy lease and rate limit retry; skipped preferences stop; legacy/expired never claim acceptance', async () => {
  const h = harness([{ notification: 'busy' }, { status: 429 }, { notification: 'accepted' }]);
  assert.equal((await h.run()).state, 'accepted');
  for (const [notification, state] of [['skipped', 'skipped'], ['legacy_queued', 'failed'], ['expired', 'failed'], ['unknown', 'failed']]) {
    const h = harness([{ notification }]);
    assert.equal((await h.run()).state, state);
    assert.equal(h.requests.length, 1);
  }
});

test('logout/account switch during backoff cancels all later requests, including same-UID relogin', async () => {
  for (const next of [null, { uid: 'different' }, { uid: 'sender' }]) {
    const h = harness([{ status: 503 }]);
    h.dependencies.wait = async () => { h.change(next); };
    assert.equal((await h.run()).state, 'cancelled');
    assert.equal(h.requests.length, 1);
    assert.equal(h.unsubscribed, 1);
  }
});

test('account change during token acquisition cannot send either captured or new account token', async () => {
  const h = harness();
  h.sender.getIdToken = () => new Promise(() => {});
  const pending = h.run();
  h.change({ uid: 'different', getIdToken: async () => 'different-token' });
  assert.equal((await pending).state, 'cancelled');
  assert.equal(h.requests.length, 0);
  assert.equal(h.unsubscribed, 1);
});

test('logout aborts an in-flight request without retrying under the next account', async () => {
  const h = harness(); let started;
  const requestStarted = new Promise(resolve => { started = resolve; });
  h.dependencies.fetch = async (_url, options) => { started(); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })); };
  const pending = h.run(); await requestStarted; h.change(null);
  assert.equal((await pending).state, 'cancelled');
  assert.deepEqual(h.delays, []);
  assert.equal(h.unsubscribed, 1);
});

// Safari < 17.4, Chrome < 116 and Firefox < 124 ship AbortController but not AbortSignal.any.
async function withoutAbortSignalAny(run, replacement) {
  const descriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'any');
  if (replacement) Object.defineProperty(AbortSignal, 'any', { ...descriptor, value: replacement });
  else delete AbortSignal.any;
  try { return await run(); } finally { Object.defineProperty(AbortSignal, 'any', descriptor); }
}

test('browsers without AbortSignal.any still send one notification request', async () => {
  await withoutAbortSignalAny(async () => {
    assert.equal(typeof AbortSignal.any, 'undefined');
    const h = harness([{ notification: 'accepted' }]);
    assert.equal((await h.run()).state, 'accepted');
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].url, '/api/messages/notify');
    assert.deepEqual(JSON.parse(h.requests[0].options.body), { messageId: 'just-saved-message' });
    assert.ok(h.requests[0].options.signal instanceof AbortSignal);
    assert.equal(h.requests[0].options.signal.aborted, false);
    assert.deepEqual(h.delays, []);
    assert.equal(h.unsubscribed, 1);
  });
});

test('without AbortSignal.any, logout still aborts the in-flight request', async () => {
  await withoutAbortSignalAny(async () => {
    const h = harness(); let started;
    const requestStarted = new Promise(resolve => { started = resolve; });
    h.dependencies.fetch = async (_url, options) => { started(); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true })); };
    const pending = h.run(); await requestStarted; h.change(null);
    assert.equal((await pending).state, 'cancelled');
    assert.deepEqual(h.delays, []);
    assert.equal(h.unsubscribed, 1);
  });
});

test('without AbortSignal.any, a hung attempt times out and the same message retries', async t => {
  await withoutAbortSignalAny(async () => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = harness([{ notification: 'accepted' }]);
    const respond = h.dependencies.fetch;
    let hung = 0, started;
    const requestStarted = new Promise(resolve => { started = resolve; });
    h.dependencies.fetch = async (url, options) => {
      if (hung++) return respond(url, options);
      started();
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('timed out')), { once: true }));
    };
    const pending = h.run(); await requestStarted;
    t.mock.timers.tick(10000);
    assert.equal((await pending).state, 'accepted');
    assert.equal(hung, 2);
    assert.deepEqual(h.delays, [1000]);
  });
});

test('a synchronous attempt setup failure is not retried as a transient error', async () => {
  await withoutAbortSignalAny(async () => {
    const h = harness([{ notification: 'accepted' }]);
    assert.equal((await h.run()).state, 'failed');
    assert.equal(h.requests.length, 0);
    assert.deepEqual(h.delays, []);
    assert.equal(h.unsubscribed, 1);
  }, () => { throw new TypeError('Broken AbortSignal.any'); });
});

test('foreign sender and absent current user never enter notification flow', async () => {
  const h = harness();
  assert.equal((await notifyNewMessage('just-saved-message', 'stranger', h.dependencies)).state, 'cancelled');
  h.change(null);
  assert.equal((await h.run()).state, 'cancelled');
  assert.equal(h.requests.length, 0);
});

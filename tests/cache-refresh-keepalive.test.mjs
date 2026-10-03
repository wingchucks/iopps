import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// Next.js waits only for cache refreshes registered before a full page starts streaming,
// and for none on client navigations. Each request must wait for all of its own.
function harness({ store, after } = {}) {
  const tasks = [];
  const keepalive = sourceModule('src/lib/server/cache-refresh-keepalive.ts', { mocks: {
    'next/server': { after: after || (task => { tasks.push(task); }) },
    'next/dist/server/app-render/work-async-storage.external': { workAsyncStorage: { getStore: () => store } },
  } });
  return { tasks, keepCacheRefreshesAlive: keepalive.keepCacheRefreshesAlive };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('a request waits after its response for every cache refresh it started', async () => {
  const store = { pendingRevalidates: {} };
  const { tasks, keepCacheRefreshesAlive } = harness({ store });
  keepCacheRefreshesAlive();
  keepCacheRefreshesAlive();
  assert.equal(tasks.length, 1, 'one wait per request, however many cached reads it makes');

  // Refreshes registered later in the request, as streamed metadata does, are included.
  const metadata = deferred();
  store.pendingRevalidates['job-detail-metadata'] = metadata.promise;
  let finished = false;
  const waiting = tasks[0]().then(() => { finished = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false, 'the request stays open while the refresh runs');

  // A refresh can register its own cache write while it runs; that is waited for too.
  const write = deferred();
  store.pendingRevalidates['public-job-route-index'] = write.promise;
  metadata.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false, 'a write registered during the wait is also waited for');
  write.resolve();
  await waiting;
  assert.equal(finished, true);
});

test('a failed refresh never fails the request and the wait still ends', async () => {
  const store = { pendingRevalidates: { failed: Promise.reject(new Error('UNAVAILABLE')) } };
  const { tasks, keepCacheRefreshesAlive } = harness({ store });
  keepCacheRefreshesAlive();
  await tasks[0]();
});

test('separate requests each wait for their own refreshes', () => {
  const first = { pendingRevalidates: {} };
  const second = { pendingRevalidates: {} };
  let store = first;
  const tasks = [];
  const keepalive = sourceModule('src/lib/server/cache-refresh-keepalive.ts', { mocks: {
    'next/server': { after: task => { tasks.push(task); } },
    'next/dist/server/app-render/work-async-storage.external': { workAsyncStorage: { getStore: () => store } },
  } });
  keepalive.keepCacheRefreshesAlive();
  store = second;
  keepalive.keepCacheRefreshesAlive();
  assert.equal(tasks.length, 2);
});

test('outside a request, or where the platform cannot wait, it does nothing', () => {
  const outside = harness({ store: undefined });
  outside.keepCacheRefreshesAlive();
  assert.equal(outside.tasks.length, 0);
  const unsupported = harness({ store: { pendingRevalidates: {} }, after: () => { throw new Error('waitUntil is not available'); } });
  assert.doesNotThrow(() => unsupported.keepCacheRefreshesAlive());
});

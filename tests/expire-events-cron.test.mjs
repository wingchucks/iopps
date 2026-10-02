process.env.TZ = 'UTC';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// 2026-10-02 19:00 in Saskatchewan.
const NOW = '2026-10-03T01:00:00.000Z';

function harness(collections) {
  const commits = [];
  const docs = name => (collections[name] ?? []).map(row => ({ id: row.id, ref: { path: `${name}/${row.id}` }, data: () => ({ ...row }) }));
  const db = {
    collection: name => ({ get: async () => ({ docs: docs(name) }) }),
    batch: () => {
      const updates = [];
      return {
        update: (ref, patch) => { updates.push({ path: ref.path, patch }); },
        commit: async () => { assert.ok(updates.length <= 400, 'batches stay under the Firestore write limit'); commits.push(updates); },
      };
    },
  };
  const fixed = class extends Date { constructor(...args) { super(...(args.length ? args : [NOW])); } };
  const route = sourceModule('src/app/api/cron/expire-events/route.ts', {
    globals: { Date: fixed, process: { env: { CRON_SECRET: 'test-only' } } },
    mocks: { 'next/server': { NextResponse: { json: Response.json } }, '@/lib/firebase-admin': { getAdminDb: () => db } },
  });
  const run = (authorization = 'Bearer test-only') => route.GET(new Request('https://example.test/api/cron/expire-events', { headers: { authorization } }));
  return { run, commits, written: () => commits.flat().map(update => update.path) };
}

test('only published events whose end has passed are completed; drafts, reviews and hidden records keep their state', async () => {
  const past = '2026-09-30';
  const future = '2026-12-01';
  const h = harness({
    events: [
      { id: 'draft-future', status: 'draft', active: false, startDate: future },
      { id: 'pending-future', status: 'pending', active: false, startDate: future },
      { id: 'rejected-future', status: 'rejected', startDate: future },
      { id: 'deleted', status: 'deleted', active: false, deletedAt: past },
      { id: 'archived', status: 'archived', startDate: future },
      { id: 'hidden-active-flag', status: 'active', active: false, startDate: past },
      { id: 'draft-past', status: 'draft', startDate: past },
      { id: 'completed', status: 'completed', active: false, startDate: past },
      { id: 'active-future', status: 'active', active: true, startDate: future },
      { id: 'active-tonight', status: 'active', active: true, startDate: '2026-10-02', startTime: '19:00', endTime: '22:00', timeZone: 'America/Regina' },
      { id: 'active-past', status: 'active', active: true, startDate: past },
      { id: 'published-past', status: 'published', startDate: past, endDate: '2026-10-01' },
      { id: 'legacy-past', dates: 'September 28-29, 2026' },
    ],
    posts: [
      { id: 'post-event-past', type: 'event', status: 'active', startDate: past },
      { id: 'post-event-draft', type: 'event', status: 'draft', startDate: past },
      { id: 'post-job', type: 'job', status: 'active', closingDate: past, startDate: past },
    ],
  });
  assert.equal((await h.run('Bearer wrong')).status, 401);
  assert.equal(h.commits.length, 0);
  const response = await h.run();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(h.written().sort(), ['events/active-past', 'events/legacy-past', 'events/published-past', 'posts/post-event-past']);
  assert.equal(body.expiredEvents, 3);
  assert.equal(body.expiredPosts, 1);
  for (const update of h.commits.flat()) assert.deepEqual({ ...update.patch }, { status: 'completed', active: false, updatedAt: NOW });
});

test('large runs are committed in chunks of at most 400 writes', async () => {
  const events = Array.from({ length: 850 }, (_, index) => ({ id: `past-${index}`, status: 'active', startDate: '2026-09-01' }));
  const h = harness({ events, posts: [] });
  const response = await h.run();
  assert.equal(response.status, 200);
  assert.deepEqual(h.commits.map(batch => batch.length), [400, 400, 50]);
  assert.equal((await response.json()).expiredEvents, 850);
});

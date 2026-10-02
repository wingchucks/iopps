import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { memoryFirestore } from './helpers/public-memory-firestore.mjs';

const json = { NextResponse: { json: (body, init) => Response.json(body, init) } };

test('/api/jobs honours a bounded ?limit with the newest jobs and keeps the full directory without one', async () => {
  const jobs = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`job-${index}`, { title: `Role ${index}`, active: true, status: 'active', createdAt: `2026-09-0${index + 1}T00:00:00.000Z` }]));
  const db = memoryFirestore({ jobs, posts: {} });
  const route = sourceModule('src/app/api/jobs/route.ts', { mocks: { 'next/server': json, '@/lib/firebase-admin': { getAdminDb: () => db }, '@/lib/server/imported-job-descriptions': { normalizeImportedDescription: text => text } } });
  const list = async query => (await route.GET(new Request(`https://example.invalid/api/jobs${query}`))).json();
  const limited = await list('?limit=2');
  assert.deepEqual(limited.jobs.map(job => job.id), ['job-4', 'job-3']);
  assert.equal(limited.count, 2);
  assert.equal(limited.total, 5);
  assert.equal((await list('?limit=0')).jobs.length, 1);
  for (const query of ['', '?limit=abc', '?limit=100000']) assert.equal((await list(query)).jobs.length, 5, query);
});

function postsRoute(db) {
  return sourceModule('src/app/api/posts/route.ts', { mocks: {
    'next/server': json, '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/api-auth': {}, '@/lib/email': {}, 'firebase-admin/firestore': { FieldValue: {} },
  } });
}

test('/api/posts reads one type with a bound, skipping unpublished posts, instead of the whole feed', async () => {
  const db = memoryFirestore({ posts: {
    'story-1': { type: 'story', title: 'First story', status: 'active', order: 1 },
    'story-2': { type: 'story', title: 'Pending story', status: 'pending', order: 2 },
    'story-3': { type: 'story', title: 'Third story', status: 'active', order: 3 },
    'story-4': { type: 'story', title: 'Fourth story', status: 'active', order: 4 },
    'spotlight-1': { type: 'spotlight', title: 'Spotlight', status: 'active', order: 0 },
  } });
  const route = postsRoute(db);
  const get = async query => route.GET({ nextUrl: new URL(`https://example.invalid/api/posts${query}`) });
  const stories = await (await get('?type=story&limit=2')).json();
  assert.deepEqual(stories.posts.map(post => post.id), ['story-1', 'story-3']);
  assert.ok(db.reads.queries.every(query => query.filters.some(([field, , value]) => field === 'type' && value === 'story') && query.limit === 2));
  assert.equal((await get('?type=unknown')).status, 400);
  assert.deepEqual((await (await get('')).json()).posts.map(post => post.id), ['spotlight-1', 'story-1', 'story-3', 'story-4']);
});

function viewRoute(db, firestore = { FieldValue: { increment: amount => ({ increment: amount }) } }) {
  const routing = sourceModule('src/lib/server/public-job-routing.ts');
  return sourceModule('src/app/api/jobs/[id]/view/route.ts', { mocks: {
    'next/server': json, 'firebase-admin/firestore': firestore,
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/public-job-route-cache': { loadCachedPublicJobRouteIndex: () => routing.buildPublicJobRouteIndex(db) },
  } });
}

const view = (route, slug, ip) => route.POST(new Request(`https://example.invalid/api/jobs/${slug}/view`, { method: 'POST', headers: ip ? { 'x-real-ip': ip } : {} }), { params: Promise.resolve({ id: slug }) });

test('job views count once per visitor network and hour, through a targeted job lookup', async () => {
  const db = memoryFirestore({ jobs: { role: { title: 'Registered Nurse', active: true, status: 'active' }, closed: { title: 'Closed role', active: false } }, posts: {} });
  const route = viewRoute(db);
  const count = () => db.store.get('jobs').get('role').viewCount || 0;
  for (const ip of ['203.0.113.5', '203.0.113.5', '::ffff:203.0.113.5']) assert.equal((await view(route, 'registered-nurse', ip)).status, 200);
  assert.equal(count(), 1);
  await view(route, 'registered-nurse', '198.51.100.7');
  assert.equal(count(), 2);
  // An IPv6 visitor usually holds a whole /64.
  await view(route, 'registered-nurse', '2001:db8:1:2::10');
  await view(route, 'registered-nurse', '2001:db8:1:2::11');
  assert.equal(count(), 3);
  // Unattributable requests and unknown or closed jobs are acknowledged but never counted.
  for (const [slug, ip] of [['registered-nurse', ''], ['registered-nurse', 'not-an-ip'], ['missing-role', '192.0.2.1'], ['closed-role', '192.0.2.1']]) {
    const response = await view(route, slug, ip);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(count(), 3);
  assert.equal(db.store.get('jobs').get('closed').viewCount, undefined);
  // Dedupe keys are one-way hashes: no address or job identity is stored.
  for (const [key, record] of db.store.get('job_view_dedupe')) {
    assert.match(key, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(record), ['expiresAt']);
  }
  // Never a scan of every active job for one view.
  assert.ok(db.reads.queries.every(query => query.fields?.join() === 'slug,title' || query.filters.some(([field]) => field === 'slug')));
});

test('a repeated view under the REST transport (409 as ABORTED) is a no-op, other conflicts still fail', async () => {
  const conflict = message => {
    const db = memoryFirestore({ jobs: { role: { title: 'Role', active: true, status: 'active' } }, posts: {} });
    db.batch = () => ({ create() {}, update() {}, commit: async () => { throw Object.assign(new Error(message), { code: 10 }); } });
    return viewRoute(db);
  };
  assert.equal((await view(conflict('Document already exists: projects/demo/databases/(default)/documents/job_view_dedupe/x'), 'role', '192.0.2.9')).status, 200);
  assert.equal((await view(conflict('Too much contention on these documents.'), 'role', '192.0.2.9')).status, 500);
});

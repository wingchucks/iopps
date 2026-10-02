import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { memoryFirestore } from './helpers/public-memory-firestore.mjs';

function metadataFor(db, mocks = {}) {
  const routing = sourceModule('src/lib/server/public-job-routing.ts');
  return sourceModule('src/lib/server/detail-metadata.ts', { mocks: {
    react: { cache: read => read },
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/public-job-route-cache': { loadCachedPublicJobRouteIndex: () => routing.buildPublicJobRouteIndex(db) },
    '@/lib/server/public-opportunities': { getPublicOpportunity: async () => null },
    ...mocks,
  } });
}

const noindex = metadata => JSON.stringify(metadata.robots) === JSON.stringify({ index: false, follow: false });

test('story metadata and Article JSON-LD exist only for posts the story page shows publicly', async () => {
  const posts = {
    'story-live': { type: 'story', title: 'Community garden opens', excerpt: 'Public excerpt', status: 'active' },
    'spotlight-legacy': { type: 'spotlight', title: 'Legacy spotlight', description: 'No status recorded' },
    'job-role': { type: 'job', title: 'A job post', status: 'active' },
    // story-<slug> is checked before spotlight-<slug>, exactly as the page loads it.
    'story-order': { type: 'story', title: 'PRIVATE CANARY pending order', status: 'pending' },
    'spotlight-order': { type: 'spotlight', title: 'Public spotlight', status: 'published' },
  };
  for (const status of ['pending', 'rejected', 'archived', 'deleted', 'draft', 'removed']) {
    posts[`story-${status}`] = { type: 'story', title: `PRIVATE CANARY ${status}`, excerpt: 'PRIVATE CANARY excerpt', imageUrl: 'https://example.invalid/private.png', status };
  }
  const metadata = metadataFor(memoryFirestore({ posts }));
  for (const status of ['pending', 'rejected', 'archived', 'deleted', 'draft', 'removed']) {
    const result = await metadata.generateStoryMetadata(status);
    assert.ok(noindex(result), status);
    assert.ok(!JSON.stringify(result).includes('CANARY'), status);
    assert.equal(await metadata.generateStoryJsonLd(status), null, status);
  }
  const live = await metadata.generateStoryMetadata('live');
  assert.equal(live.robots, undefined);
  assert.match(JSON.stringify(live), /Community garden opens/);
  assert.equal((await metadata.generateStoryJsonLd('live')).headline, 'Community garden opens');
  assert.match(JSON.stringify(await metadata.generateStoryMetadata('legacy')), /Legacy spotlight/);
  assert.ok(noindex(await metadata.generateStoryMetadata('job-role')), 'only story or spotlight posts describe a story');
  assert.equal(await metadata.generateStoryJsonLd('job-role'), null);
  const ordered = await metadata.generateStoryMetadata('order');
  assert.match(JSON.stringify(ordered), /Public spotlight/);
  assert.ok(!JSON.stringify(ordered).includes('CANARY'));
});

test('missing or ended events are noindex fallbacks rather than indexable soft 404s', async () => {
  const metadata = metadataFor(memoryFirestore({}));
  const missing = await metadata.generateEventMetadata('ended-gathering');
  assert.ok(noindex(missing));
  assert.equal(missing.alternates.canonical, 'https://www.iopps.ca/events/ended-gathering');
  assert.equal(await metadata.generateEventJsonLd('ended-gathering'), null);
  const live = metadataFor(memoryFirestore({}), { '@/lib/server/public-opportunities': { getPublicOpportunity: async () => ({ id: 'gathering', title: 'Summer Gathering', startDate: '2099-07-01' }) } });
  assert.equal((await live.generateEventMetadata('gathering')).robots, undefined);
});

test('job descriptions show deadlines and listing expiry as Saskatchewan days, never raw instants', async () => {
  const db = memoryFirestore({ jobs: {
    paid: { title: 'Paid listing', employerName: 'Fictional Employer', active: true, status: 'active', expiresAt: '2099-11-01T02:30:00.000Z' },
    closing: { title: 'Closing role', employerName: 'Fictional Employer', active: true, status: 'active', closingDate: '2099-10-15', expiresAt: '2099-11-01T02:30:00.000Z' },
  }, posts: {} });
  const metadata = metadataFor(db);
  const paid = (await metadata.generateJobMetadata('paid-listing')).description;
  // Published Oct 1, 8:30 pm in Regina: listed until Oct 31 there, and it is not an application deadline.
  assert.match(paid, /Listed until October 31, 2099/);
  assert.doesNotMatch(paid, /Closing|2099-11-01|T02:30/);
  const closing = (await metadata.generateJobMetadata('closing-role')).description;
  assert.match(closing, /Closing October 15, 2099/);
  assert.doesNotMatch(closing, /Listed until/);
});

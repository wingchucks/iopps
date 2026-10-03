import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourceModule } from './helpers/security-fixtures.mjs';

const immediateTimers = { setTimeout: fn => { queueMicrotask(fn); return 1; }, clearTimeout() {} };

test('public reads time out by rejecting, so a cache never stores the failure', async () => {
  const { withPublicReadTimeout, PublicReadTimeoutError, publicReadOr } = sourceModule('src/lib/public-read-timeout.ts');
  assert.equal(await withPublicReadTimeout(async value => value * 2, 'fast read', 1000)(21), 42);
  const hung = withPublicReadTimeout(() => new Promise(() => {}), 'hung read', 5);
  await assert.rejects(hung(), error => error instanceof PublicReadTimeoutError && /hung read timed out after 5 ms/.test(error.message));
  await assert.rejects(withPublicReadTimeout(async () => { throw new Error('RST_STREAM'); }, 'failed read')(), /RST_STREAM/);
  assert.deepEqual(await publicReadOr('failed read', Promise.reject(new Error('down')), ['fallback']), ['fallback']);
});

test('homepage and partner readers propagate read failures instead of returning empty lists', async () => {
  const failing = { collection: () => ({ where: () => { throw new Error('UNAVAILABLE'); }, get: async () => { throw new Error('UNAVAILABLE'); } }) };
  const landing = sourceModule('src/lib/server/landing-content.ts', { mocks: { '@/lib/firebase-admin': { getAdminDb: () => failing } } });
  await assert.rejects(landing.getLatestJobs(), /UNAVAILABLE/);
  await assert.rejects(landing.getPartners(), /UNAVAILABLE/);
});

function pageCache(overrides, globals = {}, loadCachedPublicJobRouteIndex = async () => ({ routes: [] }), keepCacheRefreshesAlive = () => {}) {
  return sourceModule('src/lib/server/public-page-cache.ts', { globals, mocks: {
    'next/cache': { unstable_cache: read => read },
    '@/lib/server/cache-refresh-keepalive': { keepCacheRefreshesAlive },
    '@/lib/public-job-route-cache': { loadCachedPublicJobRouteIndex },
    '@/lib/server/landing-content': { getLatestJobs: async () => [], getPartners: async () => [] },
    '@/lib/server/detail-metadata': {
      fallbackMetadata: sourceModule('src/lib/server/detail-metadata.ts', { mocks: { '@/lib/firebase-admin': {}, '@/lib/public-job-route-cache': {} } }).fallbackMetadata,
      generateJobMetadata: async () => ({ title: 'Cached job' }), generateJobJsonLd: async () => ({ '@type': 'JobPosting' }),
      ...overrides,
    },
  } });
}

test('a hung or failed job metadata read renders a noindex fallback instead of holding the page', async () => {
  // Timers fire at once here: the bound is what matters, not its length.
  const hung = pageCache({ generateJobMetadata: () => new Promise(() => {}), generateJobJsonLd: () => new Promise(() => {}) }, immediateTimers);
  const metadata = await hung.getJobPageMetadata('registered-nurse');
  assert.deepEqual(JSON.parse(JSON.stringify(metadata.robots)), { index: false, follow: false });
  assert.equal(metadata.alternates.canonical, 'https://www.iopps.ca/jobs/registered-nurse');
  assert.equal(await hung.getJobPageJsonLd('registered-nurse'), null);
  const healthy = pageCache({});
  assert.deepEqual(await healthy.getJobPageMetadata('registered-nurse'), { title: 'Cached job' });
  assert.deepEqual(await healthy.getJobPageJsonLd('registered-nurse'), { '@type': 'JobPosting' });
});

test('every shared cached read keeps its request open for the refresh it may start', async () => {
  let kept = 0;
  const cache = pageCache({}, {}, async () => ({ routes: [] }), () => { kept++; });
  for (const read of [cache.getCachedLatestJobs, cache.getCachedPartners, () => cache.getCachedJobMetadata('registered-nurse'), () => cache.getCachedJobJsonLd('registered-nurse')]) {
    const before = kept;
    await read();
    assert.equal(kept, before + 1);
  }
  let indexKept = 0;
  const routeCache = sourceModule('src/lib/public-job-route-cache.ts', { mocks: {
    'next/cache': { unstable_cache: read => read },
    '@/lib/firebase-admin': { getAdminDb: () => ({}) },
    '@/lib/server/public-job-routing': { buildPublicJobRouteIndex: async () => ({ routes: [] }) },
    '@/lib/server/cache-refresh-keepalive': { keepCacheRefreshesAlive: () => { indexKept++; } },
  } });
  await routeCache.loadCachedPublicJobRouteIndex();
  assert.equal(indexKept, 1);
});

test('a hung shared route index warm-up never holds the job page metadata', async () => {
  // Manual timers: only the warm-up bound fires; the metadata read itself stays healthy.
  const timers = [];
  const manual = { setTimeout: fn => timers.push(fn), clearTimeout: id => { timers[id - 1] = undefined; } };
  const cache = pageCache({}, manual, () => new Promise(() => {}));
  const metadata = cache.getJobPageMetadata('registered-nurse');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof timers[0], 'function', 'the route index warm-up is bounded');
  timers[0]();
  assert.deepEqual(await metadata, { title: 'Cached job' });
});

test('the homepage renders its fallback when a cached read fails', async () => {
  const shell = ({ children }) => React.createElement('div', null, children);
  const page = sourceModule('src/app/page.tsx', { mocks: {
    'next/link': { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) },
    'next/image': { __esModule: true, default: () => null },
    ...Object.fromEntries(['OpportunityHeader', 'PartnerShowcase', 'ConferencePromotion', 'landing/LandingLivePreview', 'Footer'].map(name => [`@/components/${name}`, { __esModule: true, default: shell }])),
    '@/lib/server/public-page-cache': { getCachedLatestJobs: async () => { throw new Error('DEADLINE_EXCEEDED'); }, getCachedPartners: async () => { throw new Error('DEADLINE_EXCEEDED'); } },
  } });
  const html = renderToStaticMarkup(await page.default());
  assert.match(html, /Current opportunities couldn’t be loaded/);
  assert.match(html, /Browse all jobs/);
});

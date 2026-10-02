import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { memoryFirestore } from './helpers/memory-firestore.mjs';

const reginaDay = time => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Regina', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);

function sitemapModule(db, { env = {}, opportunities = { events: [], scholarships: [] } } = {}) {
  return sourceModule('src/app/sitemap.ts', { globals: { process: { env } }, mocks: {
    '@/lib/firebase-admin': { getAdminDb: () => db, hasAdminRuntimeSupport: () => true },
    '@/lib/server/imported-job-descriptions': { normalizeImportedDescription: text => text },
    '@/lib/server/public-opportunities': { getPublicOpportunities: async kind => opportunities[kind] },
  } });
}

test('the sitemap regenerates hourly and lists the public jobs, events and stories at their canonical routes', async () => {
  const now = Date.now();
  const db = memoryFirestore({
    jobs: {
      feed: { title: 'Registered Nurse', active: true, status: 'active', source: 'feed', updatedAt: '2026-09-30T00:00:00.000Z' },
      twinA: { title: 'Care Aide', active: true, status: 'active' },
      twinB: { title: 'Care Aide', active: true, status: 'active' },
      explicit: { slug: 'explicit-route--explicit', title: 'Explicit', active: true, status: 'active' },
      // Expiry is a Saskatchewan calendar day: a job closing today stays listed all day.
      today: { title: 'Closing today', active: true, status: 'active', closingDate: reginaDay(now) },
      yesterday: { title: 'Closed yesterday', active: true, status: 'active', closingDate: reginaDay(now - 86400000) },
      // Public jobs records require active === true; anything else is not served (no soft 404s).
      legacy: { title: 'Legacy unflagged', status: 'active' },
      inactive: { title: 'Inactive role', active: false, status: 'active' },
      'qa-fixture-job': { title: 'QA fixture', active: true, status: 'active' },
    },
    posts: {
      'job-mirror': { type: 'job', status: 'active', title: 'Mirror Role' },
      'story-live': { type: 'story', status: 'active', title: 'A story' },
      'story-pending': { type: 'story', status: 'pending', title: 'Pending story' },
      'spotlight-rejected': { type: 'spotlight', status: 'rejected', title: 'Rejected spotlight' },
    },
    organizations: {},
  });
  const sitemap = sitemapModule(db, { opportunities: {
    events: [{ id: 'event-1', slug: 'summer-gathering', title: 'Summer Gathering', status: 'active' }],
    scholarships: [{ id: 'open', slug: 'open-grant', title: 'Open grant' }, { id: 'closed', slug: 'closed-grant', title: 'Closed grant', intakeClosed: true }],
  } });
  assert.equal(sitemap.revalidate, 3600);
  const urls = (await sitemap.default()).map(entry => entry.url.replace('https://www.iopps.ca', ''));
  for (const path of ['/jobs/registered-nurse', '/jobs/care-aide--twinA', '/jobs/care-aide--twinB', '/jobs/explicit-route', '/jobs/closing-today',
    '/jobs/mirror-role', '/events/summer-gathering', '/scholarships/open-grant', '/stories/live', '/jobs', '']) {
    assert.ok(urls.includes(path), `${path} missing from ${urls.join(' ')}`);
  }
  for (const fragment of ['closed-yesterday', 'legacy', 'inactive', 'qa-fixture', 'closed-grant', '/stories/pending', '/stories/rejected', '/jobs/feed', '/jobs/care-aide"']) {
    assert.ok(!urls.some(url => url.includes(fragment)), `${fragment} must not be listed`);
  }
  // Only active jobs are queried: inactive history is never read for the sitemap.
  const jobQueries = db.reads.queries.filter(query => query.collection === 'jobs');
  assert.ok(jobQueries.length > 0);
  assert.ok(jobQueries.every(query => query.filters.some(([field, , value]) => field === 'active' && value === true)), JSON.stringify(jobQueries));
});

test('a failed read keeps the last good sitemap at runtime and never fails a build', async () => {
  const failing = { collection: () => { throw new Error('UNAVAILABLE'); }, getAll: async () => { throw new Error('UNAVAILABLE'); } };
  await assert.rejects(sitemapModule(failing).default(), /UNAVAILABLE/);
  const built = await sitemapModule(failing, { env: { NEXT_PHASE: 'phase-production-build' } }).default();
  assert.ok(built.some(entry => entry.url === 'https://www.iopps.ca/jobs'));
  assert.ok(!built.some(entry => /\/jobs\/./.test(entry.url)));
});

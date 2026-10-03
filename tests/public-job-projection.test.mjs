import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { memoryFirestore } from './helpers/public-memory-firestore.mjs';

const PRIVATE_FIELDS = { authorId: 'PRIVATE-UID', publication: { amountPaid: 'PRIVATE-PAYMENT' }, featuredEntitlement: { id: 'PRIVATE-ENTITLEMENT' },
  importIdentity: 'PRIVATE-IMPORT', importContentQuality: { rawDescription: 'PRIVATE-RAW-DESCRIPTION' }, editorialCorrection: { note: 'PRIVATE-EDITOR' }, adminNotes: 'PRIVATE-ADMIN' };

function relatedRoute(db) {
  const routing = sourceModule('src/lib/server/public-job-routing.ts');
  return sourceModule('src/app/api/jobs/[id]/related/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': { getAdminDb: () => db },
    '@/lib/public-job-route-cache': { loadCachedPublicJobRouteIndex: () => routing.buildPublicJobRouteIndex(db) },
  } });
}

test('related jobs are public projections of listed jobs, with a short CDN window', async () => {
  const db = memoryFirestore({ jobs: {
    current: { title: 'Current role', employerId: 'org', category: 'Care', location: 'Regina, SK', active: true, status: 'active' },
    peer: { title: 'Peer role', employerId: 'org', location: 'Regina, SK', active: true, status: 'active', externalApplyUrl: 'https://employer.example/apply', ...PRIVATE_FIELDS },
    similar: { title: 'Similar role', employerId: 'other', category: 'Care', location: 'Saskatoon, SK', active: true, status: 'active', ...PRIVATE_FIELDS },
    // Public listing and detail require active === true; so do recommendations.
    unflagged: { title: 'UNLISTED unflagged', employerId: 'org', category: 'Care', status: 'active' },
    inactive: { title: 'UNLISTED inactive', employerId: 'org', category: 'Care', active: false, status: 'active' },
    closed: { title: 'UNLISTED closed', employerId: 'org', category: 'Care', active: true, status: 'closed' },
  }, posts: {} });
  const response = await relatedRoute(db).GET(new Request('https://example.invalid/api/jobs/current-role/related'), { params: Promise.resolve({ id: 'current-role' }) });
  assert.equal(response.headers.get('cache-control'), 'public, s-maxage=60, stale-while-revalidate=60');
  const body = await response.json();
  assert.deepEqual(body.employerJobs.map(job => job.id), ['peer']);
  assert.deepEqual(body.similarJobs.map(job => job.id), ['similar']);
  const text = JSON.stringify(body);
  assert.doesNotMatch(text, /PRIVATE|UNLISTED/);
  for (const key of Object.keys(PRIVATE_FIELDS)) assert.ok(!body.employerJobs[0][key] && !body.similarJobs[0][key], key);
  // The fields the related cards render remain.
  assert.equal(body.employerJobs[0].title, 'Peer role');
  assert.equal(body.employerJobs[0].externalApplyUrl, 'https://employer.example/apply');
  assert.equal(body.employerJobs[0].location, 'Regina, SK');
});

test('organization profile jobs carry only public fields plus their exact route', async () => {
  const org = { id: 'org', name: 'Fictional Organization' };
  const db = memoryFirestore({ jobs: { owned: { title: 'Owned role', orgId: 'org', active: true, status: 'active', featured: true, ...PRIVATE_FIELDS } }, posts: {}, events: {}, scholarships: {} });
  const route = sourceModule('src/app/api/org/[slug]/route.ts', { globals: { process: { env: { NODE_ENV: 'production' } } }, mocks: {
    'next/server': { NextResponse: Response },
    '@/lib/firebase-admin': { getAdminDb: () => db, hasAdminRuntimeSupport: () => true },
    '@/lib/local-dev-business-data': {},
    '@/lib/server/public-organization-resolver': { resolvePublicOrganization: async () => org },
    '@/lib/server/employer-auth': { requireEmployerContext: async () => { throw new Error('Public fixture must not request private access'); } },
    '@/lib/server/partner-promotion': { withPartnerPromotion: value => value },
    '@/lib/organization-profile': { isOrganizationPubliclyVisible: () => true, normalizeOrganizationRecord: value => value },
    '@/lib/public-organization': { toPublicOrganization: value => value },
  } });
  const response = await route.GET(new Request('https://example.invalid/api/org/org'), { params: Promise.resolve({ slug: 'org' }) });
  assert.equal(response.status, 200);
  const { jobs } = await response.json();
  assert.deepEqual(jobs.map(job => [job.id, job.href, job.title, job.featured]), [['owned', '/jobs/owned-role--owned', 'Owned role', true]]);
  assert.doesNotMatch(JSON.stringify(jobs), /PRIVATE/);
});

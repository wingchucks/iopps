// Offline unit tests for bug 7 (dashboard stats hydration).
// No network, no Firebase, no real accounts — all data is fictional.
import test from 'node:test';
import assert from 'node:assert';
import {sourceModule} from './helpers/security-fixtures.mjs';

const statsLib = sourceModule('src/lib/dashboard-stats.ts', {mocks: {}});
const {sanitizeStats, isVisibleJobRecord, visibleJobRecords, computeJobStats, EMPTY_STATS} = statsLib;

test('sanitizeStats never yields empty/undefined values (loading -> values contract)', () => {
  const zeros = {totalPosts: 0, activePosts: 0, applications: 0, profileViews: 0};
  assert.deepEqual(sanitizeStats(null), zeros);
  assert.deepEqual(sanitizeStats(undefined), zeros);
  assert.deepEqual(sanitizeStats({}), zeros);
  assert.deepEqual(sanitizeStats(42), zeros);
  // Malformed numbers are coerced to safe counts, never left undefined.
  assert.deepEqual(
    sanitizeStats({totalPosts: '3', activePosts: -1, applications: NaN, profileViews: 2.7}),
    {totalPosts: 0, activePosts: 0, applications: 0, profileViews: 2},
  );
  // A healthy payload passes through untouched.
  assert.deepEqual(
    sanitizeStats({totalPosts: 5, activePosts: 3, applications: 12, profileViews: 40}),
    {totalPosts: 5, activePosts: 3, applications: 12, profileViews: 40},
  );
  assert.deepEqual(EMPTY_STATS, zeros);
});

test('isVisibleJobRecord excludes deletion tombstones', () => {
  assert.equal(isVisibleJobRecord({status: 'active'}), true);
  assert.equal(isVisibleJobRecord({status: 'draft'}), true);
  assert.equal(isVisibleJobRecord({}), true);
  assert.equal(isVisibleJobRecord({status: 'deleted'}), false);
  assert.equal(isVisibleJobRecord({status: 'active', deletedAt: 'fictional-timestamp'}), false);
});

test('visibleJobRecords drops tombstones and dedupes mirrored jobs by id', () => {
  const records = [
    {id: 'job-a', status: 'active'},
    {id: 'post-a', status: 'active'},
    {id: 'post-a', status: 'active'}, // mirrored across collections
    {id: 'gone', status: 'deleted'},
    {id: 'gone-too', status: 'active', deletedAt: 'fictional'},
  ];
  assert.deepEqual(visibleJobRecords(records).map((r) => r.id), ['job-a', 'post-a']);
});

test('computeJobStats counts jobs from BOTH jobs and posts collections (bug 7 root cause)', () => {
  // Regression: /api/employer/stats used to read only the `jobs` collection,
  // so orgs whose jobs live in `posts` (type job) saw 0/0/0 while the Jobs
  // list showed their listings.
  const records = [
    {id: 'job-a', status: 'active', active: true}, // jobs collection
    {id: 'post-a', status: 'active', type: 'job'}, // posts collection
    {id: 'post-b', status: 'draft', type: 'job'}, // posts collection
    {id: 'gone', status: 'deleted', type: 'job'},
  ];
  assert.deepEqual(computeJobStats(records), {totalPosts: 3, activePosts: 2});
});

test('stats route counts posts-collection jobs and reads applications in parallel', async () => {
  const jobs = [
    {id: 'job-a', data: () => ({status: 'active', active: true})},
    {id: 'job-gone', data: () => ({status: 'deleted', active: true})},
  ];
  const posts = [
    {id: 'post-a', data: () => ({type: 'job', status: 'active'})},
    {id: 'post-event', data: () => ({type: 'event', status: 'active'})},
    {id: 'post-gone', data: () => ({type: 'job', status: 'deleted'})},
  ];
  const applicationReads = [];
  const db = {
    collection(name) {
      return {
        doc() {
          return {
            get: async () => ({exists: true, data: () => ({orgId: 'fictional-org', role: 'employer'})}),
            collection: () => ({where: () => ({get: async () => ({size: 0})})}),
          };
        },
        where(field, op, id) {
          assert.equal(op, '==');
          return {
            get: async () => {
              if (name === 'jobs') return {docs: jobs, size: jobs.length};
              if (name === 'posts') return {docs: posts, size: posts.length};
              if (name === 'applications') {
                applicationReads.push(id);
                return {size: 2};
              }
              throw Error(name);
            },
          };
        },
      };
    },
  };
  const {GET} = sourceModule('src/app/api/employer/stats/route.ts', {
    mocks: {
      'next/server': {NextResponse: {json: Response.json}},
      '@/lib/firebase-admin': {
        adminAuth: {verifyIdToken: async () => ({uid: 'fictional-owner'})},
        adminDb: db,
      },
    },
  });
  const response = await GET(
    new Request('http://localhost/api/employer/stats', {headers: {Authorization: 'Bearer <redacted>'}}),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {totalPosts: 2, activePosts: 2, applications: 4, profileViews: 0});
  // Only visible jobs get application reads; tombstones and non-job posts are skipped.
  assert.deepEqual(applicationReads.sort(), ['job-a', 'post-a']);
});

test('stats route still returns jobs-only stats when the posts read fails', async () => {
  const jobs = [{id: 'job-a', data: () => ({status: 'active', active: true})}];
  const db = {
    collection(name) {
      return {
        doc() {
          return {
            get: async () => ({exists: true, data: () => ({orgId: 'fictional-org', role: 'employer'})}),
            collection: () => ({where: () => ({get: async () => ({size: 0})})}),
          };
        },
        where(field, op) {
          assert.equal(op, '==');
          return {
            get: async () => {
              if (name === 'jobs') return {docs: jobs, size: jobs.length};
              if (name === 'applications') return {size: 1};
              throw Error(`posts-unavailable:${name}`);
            },
          };
        },
      };
    },
  };
  const {GET} = sourceModule('src/app/api/employer/stats/route.ts', {
    mocks: {
      'next/server': {NextResponse: {json: Response.json}},
      '@/lib/firebase-admin': {
        adminAuth: {verifyIdToken: async () => ({uid: 'fictional-owner'})},
        adminDb: db,
      },
    },
  });
  const response = await GET(
    new Request('http://localhost/api/employer/stats', {headers: {Authorization: 'Bearer <redacted>'}}),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {totalPosts: 1, activePosts: 1, applications: 1, profileViews: 0});
});

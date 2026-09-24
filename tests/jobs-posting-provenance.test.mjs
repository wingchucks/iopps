import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

const parser = sourceModule('src/lib/server/feed-source.ts');
const project = sourceModule('src/lib/server/public-content-record.ts', { globals: { Date } }).publicContentRecord;
const oracle = date => parser.fetchOracleItems('https://fixture.test/jobs?finder=findReqs;siteNumber=TEST', async () => Response.json({ items: [{ TotalJobsCount: 1, Offset: 0, SiteNumber: 'TEST', requisitionList: [{ Id: 'fixture', Title: 'Fixture', PostedDate: date }] }] }));
const adp = date => parser.parseAdp(JSON.stringify({ jobRequisitions: [{ itemID: 'fixture', requisitionTitle: 'Fixture', postDate: date }] }));
const xml = date => parser.parseSimpleXml(`<jobs><job><guid>fixture</guid><title>Fixture</title><date>${date}</date></job></jobs>`);

for (const [name, parse] of [['Oracle PostedDate', oracle], ['ADP original postDate', adp], ['XML date', xml]]) {
  test(`${name}: original date-only survives actual parser and public projection`, async () => {
    const [item] = await parse('2028-02-29');
    assert.equal(item.sourcePostingDate, '2028-02-29');
    assert.equal(project(item).sourcePostingDate, '2028-02-29');
  });
  test(`${name}: instants, malformed and impossible dates never acquire calendar provenance`, async () => {
    for (const date of ['2026-09-19T00:00:00.000Z', '2026-09-19T13:00:00-06:00', '2026-02-29', '2026-04-31', '2026-13-01', 'not-a-date', '']) {
      const [item] = await parse(date);
      assert.equal(item.sourcePostingDate, undefined, date);
      assert.equal(project(item).sourcePostingDate, undefined, date);
    }
  });
}

test('Dayforce timestamp-named source is never promoted to calendar provenance', () => {
  const context = { origin: 'https://jobs.dayforcehcm.com', namespace: 'fixture', board: 'board', culture: 'en-US' };
  for (const postingStartTimestampUTC of ['2026-09-19', '2026-09-19T00:00:00.000Z']) {
    const { items } = parser.parseDayforcePage({ maxCount: 1, offset: 0, jobPostings: [{ jobPostingId: 123, jobTitle: 'Fixture', clientNamespace: 'fixture', postingStartTimestampUTC }] }, context, 0);
    assert.equal(items[0].sourcePostingDate, undefined);
    assert.equal(items[0].pubDate, postingStartTimestampUTC);
  }
});

test('legacy persisted midnight instant is not public calendar evidence', () => {
  const job = project({ source: 'feed', publishedAt: '2026-09-19T00:00:00.000Z' });
  assert.equal(job.sourcePostingDate, undefined);
});

test('actual detail GET retains stored calendar provenance without hydration writes', async () => {
  const record = { source: 'feed', title: 'Fixture', active: true, sourcePostingDate: '2028-02-29' };
  const doc = { id: 'fixture', exists: true, data: () => record, ref: { set: () => assert.fail('No write'), update: () => assert.fail('No write') } };
  const net = offlineNetwork();
  const route = sourceModule('src/app/api/jobs/[id]/route.ts', { ...net, mocks: {
    ...net.mocks,
    '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => doc }) }) }) },
    '@/lib/server/public-job-routing': { findPublicJobDocument: async () => ({ id: 'fixture', source: 'jobs', routeSlug: 'fixture' }) },
    'next/server': { NextResponse: { json: Response.json } },
  } });
  const response = await route.GET(new Request('https://fixture.test/api/jobs/fixture'), { params: Promise.resolve({ id: 'fixture' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).job.sourcePostingDate, '2028-02-29');
  assert.equal(net.connections.length, 0);
});

test('actual public list GET retains calendar provenance through normalization and allowlist', async () => {
  const net = offlineNetwork();
  const route = sourceModule('src/app/api/jobs/route.ts', { ...net, mocks: {
    ...net.mocks,
    '@/lib/firebase-admin': { getAdminDb: () => ({}) },
    '@/lib/server/public-job-documents': { loadPublicJobDocuments: async () => ({ posts: [], jobs: [{ id: 'fixture', data: () => ({ title: 'Fixture', active: true, source: 'feed', sourcePostingDate: '2028-02-29' }) }] }) },
    'next/server': { NextResponse: { json: Response.json } },
  } });
  const response = await route.GET(new Request('https://fixture.test/api/jobs'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.count, 1);
  assert.equal(body.jobs[0].sourcePostingDate, '2028-02-29');
  assert.equal(net.connections.length, 0);
});

// Snapshot queries plus persistent writes: the second invocation sees exactly what
// the first real handler stored. No Firebase bootstrap, env files or live sources.
function memoryDb() {
  const rows = new Map();
  let serial = 0;
  const snapshot = ref => {
    const data = rows.get(ref.path);
    const copy = data && { ...data };
    return { id: ref.id, ref, exists: !!copy, data: () => copy, get: key => copy?.[key] };
  };
  const reference = (name, id) => ({
    id, path: `${name}/${id}`, parent: { id: name },
    get: async function () { return snapshot(this); },
    update: async function (patch) {
      assert.ok(rows.has(this.path), `update of missing ${this.path}`);
      rows.set(this.path, { ...rows.get(this.path), ...patch });
    },
  });
  const db = {
    collection(name) {
      const query = (filters, bound = Infinity) => ({
        where: (key, op, value) => { assert.equal(op, '=='); return query([...filters, [key, value]], bound); },
        limit: n => query(filters, n),
        get: async () => {
          const docs = [...rows].filter(([path, data]) => path.startsWith(`${name}/`) && filters.every(([key, value]) => data[key] === value))
            .slice(0, bound).map(([path]) => snapshot(reference(name, path.slice(name.length + 1))));
          return { docs, size: docs.length, empty: !docs.length };
        },
        doc: id => reference(name, id),
        add: async data => { rows.set(`${name}/log-${++serial}`, { ...data }); },
      });
      return query([]);
    },
    async runTransaction(callback) {
      const writes = [];
      const result = await callback({
        get: async ref => snapshot(ref),
        create: (ref, data) => { assert.ok(!rows.has(ref.path)); writes.push([ref.path, { ...data }]); },
        update: (ref, data) => writes.push([ref.path, { ...rows.get(ref.path), ...data }]),
      });
      for (const [path, data] of writes) rows.set(path, data);
      return result;
    },
    batch() {
      const writes = [];
      return { update: (ref, patch) => writes.push([ref, patch]), commit: async () => { for (const [ref, patch] of writes) await ref.update(patch); } };
    },
  };
  return { db, rows, jobs: () => [...rows].filter(([path]) => path.startsWith('jobs/')) };
}

function harness(kind) {
  const store = memoryDb();
  store.rows.set('rssFeeds/fixture-feed', {
    active: true, feedUrl: 'https://example.test/jobs.xml', feedName: 'Fictional feed',
    employerId: 'fixture-org', updateExistingJobs: true,
  });
  let items = [];
  const net = offlineNetwork();
  const options = {
    ...net, baseline: false,
    globals: { ...net.globals, Date, process: { env: { CRON_SECRET: 'offline-fixture' } } },
    mocks: {
      ...net.mocks,
      'next/server': { NextResponse: { json: Response.json } },
      '@/lib/firebase-admin': { adminDb: store.db },
      '@/lib/api-auth': { verifyAdminToken: async () => ({ success: true, decodedToken: { uid: 'fixture' } }) },
      'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'fixture-time' } },
      '@/lib/server/feed-source': { ...sourceModule('src/lib/server/feed-source.ts', { baseline: false }), loadFeedItems: async () => items },
      '@/lib/server/imported-job-descriptions': {
        normalizeImportedDescription: text => text,
        fetchImportedDescriptionPatch: async () => null,
      },
    },
  };
  const route = sourceModule(kind === 'manual' ? 'src/app/api/admin/feeds/[feedId]/sync/route.ts' : 'src/app/api/cron/sync-feeds/route.ts', options);
  return { ...store, async sync(nextItems) {
    items = nextItems;
    const request = new Request('https://fixture.test/sync', { method: kind === 'manual' ? 'POST' : 'GET', headers: { authorization: 'Bearer offline-fixture' } });
    const response = kind === 'manual' ? await route.POST(request, { params: Promise.resolve({ feedId: 'fixture-feed' }) }) : await route.GET(request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true, JSON.stringify(body));
    assert.equal(net.connections.length, 0);
    assert.equal(net.dnsCalls.length, 0);
    return body;
  } };
}


async function postingJsonLd(record) {
  // Firestore reads Dates written by routes back as Timestamps.
  record = Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value instanceof Date ? { toDate: () => value } : value]));
  const metadata = sourceModule('src/lib/server/detail-metadata.ts', { globals: { Date }, mocks: {
    '@/lib/server/public-opportunities': {},
    '@/lib/server/public-job-routing': { findPublicJobDocument: async () => ({ source: 'jobs', id: 'fixture' }) },
    '@/lib/server/public-organization-resolver': {},
    '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, id: 'fixture', data: () => record }) }) }) }) },
  } });
  return metadata.generateJobJsonLd('fixture');
}

for (const kind of ['manual', 'cron']) {
  test(`${kind}: ADP timestamp truncation remains a legacy gate, not a repaired instant`, async () => {
    const h = harness(kind);
    const original = '2026-09-19T23:30:00-06:00';
    const items = adp(original);
    assert.equal(items[0].pubDate, '2026-09-19', 'known parser limitation');
    await h.sync(items);
    const stored = h.jobs()[0][1];
    assert.equal(stored.sourcePostingDate, undefined);
    assert.notEqual(stored.publishedAt.toISOString(), new Date(original).toISOString());
    // Changing just the parser would split historical intake identity and duplicate imports.
    const { sameImportedIntake } = sourceModule('src/lib/server/feed-import-identity.ts', { globals: { Date } });
    assert.equal(sameImportedIntake(stored, { ...stored, publishedAt: original }), false);
    await h.sync(items);
    assert.equal(h.jobs().length, 1);
    assert.equal(h.jobs()[0][1].publishedAt.toISOString(), '2026-09-19T00:00:00.000Z');
  });
  test(`${kind}: valid leap calendar survives create and invalid refresh preserves known evidence`, async () => {
    const h = harness(kind);
    await h.sync(xml('2028-02-29'));
    assert.equal(h.jobs()[0][1].sourcePostingDate, '2028-02-29');
    assert.equal(h.jobs()[0][1].publishedAt.toISOString(), '2028-02-29T00:00:00.000Z');
    assert.equal((await postingJsonLd(project(h.jobs()[0][1]))).datePosted, '2028-02-29');
    // No usable incoming date: update the existing intake without rewriting its date.
    await h.sync(xml(''));
    assert.equal(h.jobs().length, 1);
    assert.equal(h.jobs()[0][1].sourcePostingDate, '2028-02-29');
    assert.equal(h.jobs()[0][1].publishedAt.toISOString(), '2028-02-29T00:00:00.000Z');
  });
  test(`${kind}: original XML instants retain time and offset through actual create`, async () => {
    for (const date of ['2026-09-19T00:00:00.000Z', '2026-09-19T23:30:00-06:00']) {
      const h = harness(kind);
      const items = xml(date);
      assert.equal(items[0].pubDate, date);
      await h.sync(items);
      const stored = h.jobs()[0][1];
      assert.equal(stored.publishedAt.toISOString(), new Date(date).toISOString());
      assert.equal(stored.sourcePostingDate, undefined);
      assert.equal((await postingJsonLd(project(stored))).datePosted, new Date(date).toISOString());
      await h.sync(items);
      assert.equal(h.jobs()[0][1].publishedAt.toISOString(), new Date(date).toISOString());
    }
  });
  test(`${kind}: actual XML parser and create reject calendar rollover before persistence`, async () => {
    for (const date of ['2026-02-30', '2026-04-31', '2026-02-29', '2026-13-01', 'not-a-date']) {
      const h = harness(kind);
      const items = parser.parseSimpleXml(`<jobs><job><guid>fixture</guid><title>Fixture</title><pubDate>${date}</pubDate></job></jobs>`);
      await h.sync(items);
      assert.equal(h.jobs().length, 1);
      const stored = h.jobs()[0][1];
      assert.equal(stored.publishedAt, undefined, date);
      assert.equal(stored.sourcePostingDate, undefined, date);
      const publicJob = project(stored);
      assert.equal(publicJob.publishedAt, undefined);
      const { jobDetailDates } = sourceModule('src/lib/job-detail-dates.ts', { globals: { Date } });
      assert.equal(jobDetailDates(publicJob).some(row => row.label === 'Originally posted'), false);
      // An ingestion timestamp cannot establish the employer's original posting date.
      assert.equal((await postingJsonLd(publicJob)).datePosted, undefined);
      await h.sync(items);
      assert.equal(h.jobs().length, 1);
      assert.equal(h.jobs()[0][1].publishedAt, undefined, 'update cannot reintroduce rollover');
    }
  });
}

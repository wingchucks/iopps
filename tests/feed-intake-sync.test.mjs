import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

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
      const query = filters => ({
        where: (key, op, value) => { assert.equal(op, '=='); return query([...filters, [key, value]]); },
        get: async () => {
          const docs = [...rows].filter(([path, data]) => path.startsWith(`${name}/`) && filters.every(([key, value]) => data[key] === value))
            .map(([path]) => snapshot(reference(name, path.slice(name.length + 1))));
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

for (const kind of ['manual', 'cron']) {
  test(`${kind}: parser timestamp input and legacy midnight records cannot trigger backfill`, async () => {
    const h = harness(kind);
    const parser = sourceModule('src/lib/server/feed-source.ts');
    const items = parser.parseAdp(JSON.stringify({ jobRequisitions: [{ itemID: 'instant-fixture', requisitionTitle: 'Instant role', postDate: '2026-09-19T00:00:00.000Z' }] }));
    await h.sync(items);
    assert.equal(h.jobs()[0][1].sourcePostingDate, undefined);
    await h.sync(items);
    assert.equal(h.jobs()[0][1].sourcePostingDate, undefined);
  });
  test(`${kind}: updateExistingJobs false retains explicit existing-record backfill gate`, async () => {
    const h = harness(kind);
    const parser = sourceModule('src/lib/server/feed-source.ts');
    const items = parser.parseSimpleXml('<jobs><job><guid>gate-fixture</guid><title>Gate role</title><date>2028-02-29</date></job></jobs>');
    await h.sync(items);
    delete h.jobs()[0][1].sourcePostingDate;
    h.rows.get('rssFeeds/fixture-feed').updateExistingJobs = false;
    await h.sync(items);
    assert.equal(h.jobs()[0][1].sourcePostingDate, undefined);
  });
  test(`${kind}: actual Oracle parser calendar provenance survives create, update and public projection`, async () => {
    const h = harness(kind);
    const parser = sourceModule('src/lib/server/feed-source.ts');
    const items = await parser.fetchOracleItems('https://fixture.test/jobs?finder=findReqs;siteNumber=TEST', async () => Response.json({ items: [{ TotalJobsCount: 1, Offset: 0, requisitionList: [{ Id: 'calendar-fixture', Title: 'Calendar role', PostedDate: '2028-02-29' }] }] }));
    const project = sourceModule('src/lib/server/public-content-record.ts').publicContentRecord;
    await h.sync(items);
    assert.equal(h.jobs().length, 1);
    assert.equal(project(h.jobs()[0][1]).sourcePostingDate, '2028-02-29');
    // A previously imported row without provenance receives it only from the original source.
    delete h.jobs()[0][1].sourcePostingDate;
    await h.sync(items);
    assert.equal(project(h.jobs()[0][1]).sourcePostingDate, '2028-02-29');
    // Description-only refresh with no date provenance does not erase known evidence.
    await h.sync(items.map(({ sourcePostingDate, ...item }) => ({ ...item, description: 'Refreshed' })));
    assert.equal(project(h.jobs()[0][1]).sourcePostingDate, '2028-02-29');
    assert.equal(h.jobs()[0][1].description, 'Refreshed');
  });
}

const variants = ['Regina', 'Saskatoon'].flatMap(location => ['2026-01-01', '2026-02-01'].map(pubDate => ({
  guid: 'shared-source-id', link: 'https://example.test/shared-job', title: 'Fictional role',
  location, pubDate, description: `Original ${location} ${pubDate}`, closingDate: '2099-01-01',
})));

for (const kind of ['manual', 'cron']) {
  for (const lookup of ['id', 'url']) {
    for (const operation of ['update', 'expire']) {
      test(`${kind} two-pass ${lookup}: ${operation} every location and repost intake`, async () => {
        const h = harness(kind);
        await h.sync(variants);
        assert.equal(h.jobs().length, 4, 'initial pass creates all distinct intakes');
        const originalIds = h.jobs().map(([id]) => id).sort();
        for (const [, job] of h.jobs()) {
          assert.equal(job.active, true);
          assert.equal(job.closingDate, '2099-01-01');
        }
        if (lookup === 'url') {
          // Historical imports can have only any of these URL fields.
          h.jobs().forEach(([, job], index) => {
            delete job.externalId;
            job[index % 2 ? 'applicationUrl' : 'applyUrl'] = job.externalUrl;
            delete job.externalUrl;
          });
        }
        // Last colliding rows must not hide eligible candidates or cross namespaces.
        h.rows.set('jobs/foreign-feed', { ...h.jobs()[0][1], feedId: 'other-feed' });
        h.rows.set('jobs/foreign-employer', { ...h.jobs()[0][1], employerId: 'other-org' });
        const foreignBefore = JSON.stringify([h.rows.get('jobs/foreign-feed'), h.rows.get('jobs/foreign-employer')]);
        await h.sync(variants.map((item, index) => ({ ...item, description: `Updated intake ${index}`, closingDate: operation === 'expire' ? '2000-01-01' : '2099-02-01' })));
        assert.deepEqual(h.jobs().filter(([id]) => id.startsWith('jobs/import-')).map(([id]) => id).sort(), originalIds, 'no duplicate creation');
        variants.forEach((item, index) => {
          const job = h.jobs().find(([id, job]) => id.startsWith('jobs/import-') && job.location === item.location && job.publishedAt.toISOString().startsWith(item.pubDate))?.[1];
          assert.ok(job);
          assert.equal(job.description, `Updated intake ${index}`, `${item.location}/${item.pubDate} description`);
          assert.equal(job.closingDate, operation === 'expire' ? '2000-01-01' : '2099-02-01');
          assert.equal(job.active, operation !== 'expire');
          assert.equal(job.status, operation === 'expire' ? 'expired' : 'active');
          if (operation === 'expire') assert.equal(job.expirationReason, 'closing_date');
        });
        assert.equal(h.rows.get('rssFeeds/fixture-feed').lastSyncJobsUpdated, 4);
        assert.equal(h.rows.get('rssFeeds/fixture-feed').totalJobsImported, 4);
        assert.equal(JSON.stringify([h.rows.get('jobs/foreign-feed'), h.rows.get('jobs/foreign-employer')]), foreignBefore);
      });
    }
  }

  test(`${kind}: ID preference and URL fallback after incompatible ID candidates`, async () => {
    const h = harness(kind);
    const base = { feedId: 'fixture-feed', employerId: 'fixture-org', title: 'Fictional role', location: 'Regina', publishedAt: new Date('2026-01-01'), active: true, status: 'active', description: 'Original' };
    h.rows.set('jobs/id-preferred', { ...base, externalId: 'shared-source-id', externalUrl: 'https://example.test/old-url' });
    h.rows.set('jobs/url-alternative', { ...base, externalUrl: variants[0].link });
    h.rows.set('jobs/id-incompatible', { ...base, externalId: 'shared-source-id', location: 'Elsewhere' });
    await h.sync([{ ...variants[0], description: 'ID wins' }]);
    assert.equal(h.rows.get('jobs/id-preferred').description, 'ID wins');
    assert.equal(h.rows.get('jobs/url-alternative').description, 'Original');
    h.rows.get('jobs/id-preferred').location = 'Elsewhere';
    await h.sync([{ ...variants[0], description: 'URL fallback wins' }]);
    assert.equal(h.rows.get('jobs/url-alternative').description, 'URL fallback wins');
    assert.equal(h.rows.get('jobs/id-preferred').description, 'ID wins');
    assert.equal(h.rows.get('jobs/id-incompatible').description, 'Original');
    assert.equal(h.jobs().length, 3);
  });
}

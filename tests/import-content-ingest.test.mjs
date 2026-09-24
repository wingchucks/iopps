import test from 'node:test';
import {paidImportMemoryDb} from './helpers/paid-import-fixtures.mjs';
import assert from 'node:assert/strict';
import { sourceModule, offlineNetwork } from './helpers/security-fixtures.mjs';

const raw = '**SIGA �s employees**\n\n- Training';
const feed = { feedUrl: 'https://example.test/jobs.xml', feedName: 'Fictional feed', employerId: 'fixture-org' };

for (const kind of ['manual', 'cron', 'batch']) {
  test(`${kind} actual ingest handler persists normalized text and source review metadata offline`, async () => {
 const store=paidImportMemoryDb();const db=store.db;const writes=store.jobWrites;
 store.rows.set('rssFeeds/fixture-feed',{active:true,feedUrl:'https://example.test/jobs.xml',feedName:'Fictional feed',employerId:'fixture-org'});
 if(kind!=='batch')store.rows.set('employers/fixture-org',{standardPostCredits:1});
    const net = offlineNetwork();
    const actualFeed = sourceModule('src/lib/server/feed-source.ts');
    const options = {
      ...net,
      globals: { ...net.globals,Date, process: { env: { CRON_SECRET: 'offline-fixture' } } },
      mocks: {
        ...net.mocks,
        'next/server': { NextResponse: { json: Response.json } },
        '@/lib/firebase-admin': { adminDb: db, getAdminDb: () => db },
        '@/lib/api-auth': { verifyAdminToken: async () => ({ success: true, decodedToken: { uid: 'fixture' } }) },
        'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'fixture-time' } },
        '@/lib/server/feed-source': { ...actualFeed, loadFeedItems: async () => [{ guid: 'fixture', title: 'Fictional role', link: 'https://example.test/job', description: raw }] },
      },
    };
    const path = kind === 'manual' ? 'src/app/api/admin/feeds/[feedId]/sync/route.ts' : kind === 'cron' ? 'src/app/api/cron/sync-feeds/route.ts' : 'src/app/api/admin/import-jobs/route.ts';
    const route = sourceModule(path, options);
    const request = new Request('https://fixture.test/api/import', { method: kind === 'cron' ? 'GET' : 'POST', headers: { authorization: 'Bearer offline-fixture', 'x-cron-secret': 'offline-fixture', 'content-type': 'application/json' }, ...(kind === 'batch' ? { body: JSON.stringify({ jobs: [{ title: 'Fictional role', externalUrl: 'https://example.test/job', description: raw }] }) } : {}) });
    const response = kind === 'cron' ? await route.GET(request) : await route.POST(request, { params: Promise.resolve({ feedId: 'fixture-feed' }) });
    assert.equal(response.status, 200);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].description, 'SIGA �s employees\n\n• Training');
    assert.equal(writes[0].descriptionFormat, 'plain-text');
    assert.equal(writes[0].importContentQuality.rawDescription, raw);
    assert.equal(writes[0].importContentQuality.needsReview, true);
    assert.equal(net.connections.length, 0);
  });
}

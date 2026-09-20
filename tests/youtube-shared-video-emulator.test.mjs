import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolveSharedYouTubeVideo, SHARED_VIDEO_MINUTE_LIMIT, SHARED_VIDEO_DAY_LIMIT } from '../src/lib/server/youtube-shared-video.ts';

const enabled = process.env.IOPPS_TEST_EMULATORS === 'true';
test('shared video reservations cap concurrent calls and cache verified negative results across instances', { skip: !enabled }, async () => {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  const channelId = 'UCQA' + randomBytes(8).toString('hex');
  const app = initializeApp({ projectId: 'demo-iopps-preview' }, channelId);
  const db = getFirestore(app);
  let now = Date.parse('2026-09-19T12:00:00Z'), calls = 0;
  const lookup = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 30)); return null; };
  const resolve = id => resolveSharedYouTubeVideo(db, channelId, id, lookup, () => now);
  try {
    await Promise.all(Array.from({ length: 12 }, () => resolve('Missing0001')));
    assert.equal(calls, 1, 'Concurrent instances share one upstream reservation');
    assert.deepEqual(await resolve('Missing0001'), { video: null });
    assert.equal(calls, 1, 'Missing/private/foreign-channel outcomes are cached');
    await Promise.all(Array.from({ length: 16 }, (_, i) => resolve(String(i).padStart(11, '0'))));
    assert.equal(calls, SHARED_VIDEO_MINUTE_LIMIT);
    assert.equal((await resolve('Blocked0001')).unavailable, true);
    now += 61_000;
    await resolve('Missing0001'); assert.equal(calls, SHARED_VIDEO_MINUTE_LIMIT);
    await resolve('NewVideo001'); assert.equal(calls, SHARED_VIDEO_MINUTE_LIMIT + 1);
    now += 5 * 60_000;
    await resolve('Missing0001'); assert.equal(calls, SHARED_VIDEO_MINUTE_LIMIT + 2, 'Expired negative entries can be checked again');
    const budgets = await db.collection('youtubeSharedVideoLimits').where('channelId', '==', channelId).get();
    assert.equal(budgets.size, 1);
    await budgets.docs[0].ref.update({ dayCount: SHARED_VIDEO_DAY_LIMIT - 1 });
    await resolve('LastVideo01');
    assert.equal((await resolve('Blocked0002')).unavailable, true, 'The daily cap survives a fresh minute');
    now += 86_400_000;
    await resolve('NewDayVid01'); assert.equal(calls, SHARED_VIDEO_MINUTE_LIMIT + 4);
    const failed = await resolveSharedYouTubeVideo(db, channelId, 'Failed00001', async () => { throw Error('Provider unavailable'); }, () => now);
    assert.equal(failed.unavailable, true);
    assert.equal((await resolveSharedYouTubeVideo(db, channelId, 'Failed00001', async () => { assert.fail('Cached failure must not call the provider again'); }, () => now)).unavailable, true);
  } finally {
    for (const collection of ['youtubeSharedVideoCache', 'youtubeSharedVideoLimits']) {
      const rows = await db.collection(collection).where('channelId', '==', channelId).get();
      await Promise.all(rows.docs.map(doc => doc.ref.delete()));
    }
    await deleteApp(app);
  }
});

test('shared video storage failure refuses extra upstream calls', async () => {
  const db = { collection: () => ({ doc: () => ({}) }), runTransaction: async () => { throw Error('Storage unavailable'); } };
  const result = await resolveSharedYouTubeVideo(db, 'UCtestChannel', 'Unknown0001', async () => { assert.fail('Limiter failure must fail closed'); });
  assert.equal(result.unavailable, true);
});

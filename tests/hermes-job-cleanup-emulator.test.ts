import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';
import {
  CLEANUP, CleanupConflict, cleanupCanonical, createJobCleanup,
  type CleanupDoc, type CleanupPort,
} from '../src/lib/server/hermes-job-cleanup.ts';
import { createNativeJobCleanupPort } from '../src/lib/server/hermes-job-cleanup-firestore.ts';
import { cleanupSourceDocId } from '../src/lib/server/job-cleanup-contract.ts';
import { cleanupWriteAllowed, updateImportedJobWithEditorialGuard } from '../src/lib/server/job-cleanup-guards.ts';

// Run this file alone: the fixed manifest intentionally cannot coexist with another fixture.
// No real provider, ADC, emulator reset endpoint, or production Firebase project is used.
const enabled = process.env.IOPPS_TEST_EMULATORS === 'true';
const projectId = 'demo-iopps-preview';
const cid = '12345678-1234-1234-1234-123456789abc';
const sourceKey = (n: number) => `adp:${cid}:${n}`;
const externalUrl = (n: number) => `https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=${cid}&jobId=${n}`;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const request = (r: { reviewId: string; reviewToken: string; confirmation: string }) => ({
  reviewId: r.reviewId, reviewToken: r.reviewToken, confirmation: r.confirmation,
});

// Assert SDK classes, not merely JSON-equivalent values (JSON loses native types).
function assertNative(data: Record<string, unknown>, referencePath: string, expectedTimestamp: Timestamp) {
  const native = data.native as Record<string, unknown>;
  assert.ok(native.timestamp instanceof Timestamp);
  assert.equal(native.timestamp.seconds, expectedTimestamp.seconds);
  assert.equal(native.timestamp.nanoseconds, expectedTimestamp.nanoseconds);
  assert.ok(native.point instanceof GeoPoint);
  assert.equal(native.point.latitude, 52.1332);
  assert.equal(native.point.longitude, -106.67);
  assert.ok(Buffer.isBuffer(native.bytes));
  assert.deepEqual(native.bytes, Buffer.from([0, 1, 127, 128, 255]));
  assert.ok(native.reference instanceof DocumentReference);
  assert.equal(native.reference.path, referencePath);
  assert.equal(native.reference.firestore.projectId, projectId);
  assert.deepEqual(native.nested, [{ nullable: null, text: 'whole preimage', flags: [true, false] }]);
}

test('native cleanup acceptance: exact manifest, serialized preimages, atomic apply, retry and rollback',
  { skip: !enabled, timeout: 180_000 }, async t => {
    // These assertions MUST precede initializeApp/getFirestore. Never repair unsafe env values.
    assert.equal(process.env.GCLOUD_PROJECT, projectId);
    assert.ok(['127.0.0.1:8080', 'localhost:8080'].includes(process.env.FIRESTORE_EMULATOR_HOST ?? ''),
      'FIRESTORE_EMULATOR_HOST must explicitly target localhost port 8080');
    assert.ok(['127.0.0.1:9099', 'localhost:9099'].includes(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? ''),
      'FIREBASE_AUTH_EMULATOR_HOST must explicitly target localhost port 9099');
    const run = randomUUID();
    const keyId = `emulator-${run}`;
    const app = initializeApp({ projectId }, `cleanup-native-${run}`);
    const db = getFirestore(app);
    const owned = new Set<string>();
    const nativePort = createNativeJobCleanupPort(db);
    // Only successful native transactions confer ownership. A rejected create cannot
    // cause finally to delete somebody else's colliding document.
    const port: CleanupPort = {
      read: nativePort.read, query: nativePort.query,
      async transaction(fn) {
        const created = new Set<string>();
        const result = await nativePort.transaction(async tx => {
          created.clear(); // Firestore can retry the callback.
          return fn({ ...tx, create(path, data) { tx.create(path, data); created.add(path); } });
        });
        for (const path of created) owned.add(path);
        return result;
      },
    };
    const now = 1_800_000_000_000;
    const providerCalls: string[] = [];
    const service = createJobCleanup(port, {
      secret: 'local-emulator-only-secret-not-a-production-key', now: () => now,
      provider: async key => {
        providerCalls.push(key);
        assert.ok([...Array.from({ length: 7 }, (_, i) => sourceKey(i)),
          ...Array.from({ length: 4 }, (_, i) => sourceKey(i + 20))].includes(key));
        return { provider: 'adp', sourceKey: key, checkedAt: now,
          status: Number(key.split(':')[2]) >= 20 ? 'closed' : 'active', evidenceDigest: sha(key) };
      },
    });
    const seed = new Map<string, Record<string, unknown>>();
    const employerPath = `employers/${CLEANUP.oldEmployer}`;
    const native = { timestamp: new Timestamp(1_700_000_000, 123_456_789),
      point: new GeoPoint(52.1332, -106.67), bytes: Buffer.from([0, 1, 127, 128, 255]),
      reference: db.doc(employerPath), nested: [{ nullable: null, text: 'whole preimage', flags: [true, false] }] };
    const putJob = (id: string, employerId: string, index: number, post: boolean) => {
      seed.set(`${post ? 'posts' : 'jobs'}/${id}`, {
        employerId, ...(post ? { orgId: employerId, type: 'job' } : {}),
        externalUrl: externalUrl(index), externalId: String(index), active: true, status: 'active',
        slug: `${post ? 'post' : 'job'}-${id.toLowerCase()}`, title: 'Native cleanup fixture',
        description: 'Preserve every field', native, fixtureOwner: run,
      });
    };
    CLEANUP.pairs.forEach(([old, canonical], i) => {
      putJob(old, CLEANUP.oldEmployer, i, false);
      putJob(canonical, CLEANUP.newEmployer, i, false);
      // Exercise present mirrors and bound absence in the same exact manifest.
      if (i % 2 === 0) {
        putJob(old, CLEANUP.oldEmployer, i, true);
        putJob(canonical, CLEANUP.newEmployer, i, true);
      }
    });
    CLEANUP.stale.forEach((id, i) => { putJob(id, CLEANUP.newEmployer, 20 + i, false); if (i === 0) putJob(id, CLEANUP.newEmployer, 20 + i, true); });
    seed.set(employerPath, { name: 'Old fixture employer', fixtureOwner: run });
    seed.set(`employers/${CLEANUP.newEmployer}`, { name: 'Canonical fixture employer', fixtureOwner: run });
    const references = ['applications', 'saved_items', 'savedJobs'] as const;
    for (const collection of references) {
      for (const [index, target] of [CLEANUP.pairs[0][0], CLEANUP.pairs[0][1], CLEANUP.stale[0]].entries()) {
        seed.set(`${collection}/${run}-${index}`, {
          [collection === 'saved_items' ? 'postId' : 'jobId']: target,
          employerId: CLEANUP.oldEmployer, memberId: `private-${run}`,
          archive: { resume: 'PRIVATE-DO-NOT-EXPOSE', native }, fixtureOwner: run,
        });
      }
    }
    const originals = new Map<string, CleanupDoc>();
    const allIds = [...CLEANUP.pairs.flat(), ...CLEANUP.stale];
    const scopedPaths = allIds.flatMap(id => ['jobs', 'posts', 'jobAliases', 'jobCleanupGuards'].map(c => `${c}/${id}`));
    const sourcePaths = [...Array.from({ length: 7 }, (_, i) => i), 20, 21, 22, 23]
      .map(i => `jobCleanupSources/${cleanupSourceDocId(sourceKey(i))}`);
    const snapshot = async (path: string): Promise<CleanupDoc> => {
      const d = await db.doc(path).get();
      assert.ok(d.exists, path);
      return { path, version: `${d.updateTime!.seconds}:${d.updateTime!.nanoseconds}`, data: d.data()! };
    };
    const assertUnchanged = async (paths: string[]) => {
      for (const path of paths) assert.equal(cleanupCanonical(await snapshot(path)), cleanupCanonical(originals.get(path)), path);
    };
    try {
      // Refuse existing fixed IDs, including absence-bound mirrors/guards and source lanes.
      // batch.create also protects the preflight/seed race without overwriting anything.
      const preflight = [...new Set([...scopedPaths, ...sourcePaths, ...seed.keys()])];
      for (const d of await db.getAll(...preflight.map(p => db.doc(p)))) assert.equal(d.exists, false, `Fixture collision: ${d.ref.path}`);
      for (const id of allIds) for (const c of references) {
        assert.equal((await db.collection(c).where(c === 'saved_items' ? 'postId' : 'jobId', '==', id).limit(1).get()).empty, true,
          `Preexisting reference to fixed manifest: ${c}/${id}`);
      }
      const batch = db.batch();
      for (const [path, data] of seed) batch.create(db.doc(path), data);
      await batch.commit();
      for (const path of seed.keys()) owned.add(path);
      for (const path of seed.keys()) originals.set(path, await snapshot(path));
      // Firestore persists timestamps at microsecond precision, rounding down the
      // seed's sub-microsecond digits before cleanup ever reads it. Keep nonzero
      // microseconds so millisecond/Date conversion still fails preservation checks.
      const persistedSeedTimestamp = new Timestamp(native.timestamp.seconds, 123_456_000);
      for (const [path, original] of originals) if (/^(jobs|posts)\//.test(path)) {
        assertNative(original.data, employerPath, persistedSeedTimestamp);
      }
      const immutable = [...originals.keys()].filter(p => !/^(jobs|posts)\//.test(p) || CLEANUP.pairs.some(pair => p.endsWith('/' + pair[1])));

      await t.test('native adapter rejects out-of-manifest paths, canonical writes and unscoped queries', async () => {
        await assert.rejects(port.read(`jobs/unrelated-${run}`), CleanupConflict);
        await assert.rejects(port.query('applications', 'memberId', CLEANUP.pairs[0][0], 101), CleanupConflict);
        await assert.rejects(port.query('applications', 'jobId', CLEANUP.pairs[0][0], 100), CleanupConflict);
        await assert.rejects(port.transaction(async tx => { tx.replace(`jobs/${CLEANUP.pairs[0][1]}`, {}); }), CleanupConflict);
        await assert.rejects(port.transaction(async tx => { tx.create(`jobAliases/${CLEANUP.pairs[0][1]}`, {}); }), CleanupConflict);
      });

      const review = await service.review({ manifestId: CLEANUP.id }, keyId);
      assert.equal(review.duplicates, 7); assert.equal(review.stale, 4); assert.equal(review.targets.length, 11);
      assert.equal(providerCalls.length, 11); assert.equal(new Set(providerCalls).size, 11);
      assert.equal(JSON.stringify(review).includes('PRIVATE-DO-NOT-EXPOSE'), false);
      assert.ok(review.documents.some(d => d.path === `posts/${CLEANUP.pairs[1][0]}` && !d.exists));
      assert.equal(Object.keys(review.referenceCounts).length, 54);
      assert.equal(Object.values(review.referenceCounts).reduce((a, b) => a + b, 0), 9);
      for (const id of allIds) for (const c of references) {
        const field = c === 'saved_items' ? 'postId' : 'jobId';
        assert.equal(review.referenceCounts[`${c}:${field}:${id}`],
          [CLEANUP.pairs[0][0], CLEANUP.pairs[0][1], CLEANUP.stale[0]].includes(id) ? 1 : 0);
      }
      // Read the persisted native review: apply must validate its HMAC after actual
      // Firestore serialization, rather than consuming the original in-memory object.
      const persistedReview = await snapshot(`jobCleanupReviews/${review.reviewId}`);
      const bound = persistedReview.data.bound as { documents: Record<string, CleanupDoc | null> };
      for (const [path, original] of originals) if (/^(jobs|posts)\//.test(path)) {
        assertNative(bound.documents[path]!.data, employerPath, (original.data.native as typeof native).timestamp);
        assert.equal(cleanupCanonical(bound.documents[path]), cleanupCanonical(original));
      }
      const execution = { keyId, idempotencyKey: `apply-${run}`, requestHash: sha(`apply-${run}`) };
      const applied = await service.apply(request(review), execution);
      assert.equal(applied.verified, true);
      const receiptPath = `jobCleanupReceipts/${sha(`cleanup:${keyId}:${execution.idempotencyKey}`)}`;
      const audit = await snapshot(`jobCleanupAudits/${applied.auditId}`);
      const receipt = await snapshot(receiptPath);
      const backup = await snapshot(`jobCleanupBackups/${applied.auditId}`);
      const changedPaths = audit.data.changedPaths as string[];
      assert.equal(backup.version, audit.version); assert.equal(receipt.version, audit.version);
      for (const path of changedPaths) assert.equal((await snapshot(path)).version, audit.version, `Atomic updateTime: ${path}`);
      const preimages = backup.data.documents as Record<string, CleanupDoc | null>;
      for (const [path, original] of originals) if (/^(jobs|posts)\//.test(path)) {
        assertNative(preimages[path]!.data, employerPath, (original.data.native as typeof native).timestamp);
        assert.equal(cleanupCanonical(preimages[path]), cleanupCanonical(original));
      }
      await assertUnchanged(immutable);
      const appliedSnapshots = new Map<string, string>();
      for (const path of [...changedPaths, receiptPath, audit.path, backup.path, `jobCleanupReceipts/${applied.auditId}-verified`]) {
        appliedSnapshots.set(path, cleanupCanonical(await snapshot(path)));
      }
      assert.deepEqual(await service.apply(request(review), execution), applied);
      for (const [path, before] of appliedSnapshots) assert.equal(cleanupCanonical(await snapshot(path)), before, `Retry changed ${path}`);
      await assert.rejects(service.apply(request(review), { ...execution, requestHash: sha('different') }), /Idempotency conflict/);

      for (const [old, canonical] of CLEANUP.pairs) {
        const job = await snapshot(`jobs/${old}`);
        assert.equal(job.data.active, false); assert.equal(job.data.status, 'deleted'); assert.equal(job.data.duplicateOf, canonical);
        const alias = (await snapshot(`jobAliases/${old}`)).data;
        assert.equal(alias.redirectStatus, 307); assert.equal(alias.canonicalId, canonical); assert.equal(alias.active, true);
        assert.deepEqual(new Set(alias.slugs as string[]), new Set([originals.get(`jobs/${old}`)!.data.slug,
          ...(originals.has(`posts/${old}`) ? [originals.get(`posts/${old}`)!.data.slug] : [])]));
        assert.equal((await db.doc(`jobAliases/${canonical}`).get()).exists, false);
        assert.equal((await db.doc(`jobCleanupGuards/${canonical}`).get()).exists, false);
      }
      for (const id of CLEANUP.stale) {
        const job = await snapshot(`jobs/${id}`);
        assert.equal(job.data.active, false); assert.equal(job.data.status, 'closed'); assert.equal('duplicateOf' in job.data, false);
        assert.equal((await db.doc(`jobAliases/${id}`).get()).exists, false);
      }
      for (const target of review.targets) {
        const guard = (await snapshot(`jobCleanupGuards/${target.originalId}`)).data;
        const source = (await snapshot(`jobCleanupSources/${cleanupSourceDocId(target.sourceKey as string)}`)).data;
        assert.equal(guard.originalId, target.originalId); assert.equal(guard.active, true);
        assert.equal(source.sourceKey, target.sourceKey); assert.equal(source.canonicalId, target.canonicalId);
        assert.deepEqual(source.blockedEmployerIds, [target.employerId]);
      }

      await t.test('concurrent real importer updates cannot revive guarded original', async () => {
        const path = `jobs/${CLEANUP.pairs[0][0]}`;
        const before = cleanupCanonical(await snapshot(path));
        const results = await Promise.all(Array.from({ length: 4 }, () => updateImportedJobWithEditorialGuard(db,
          db.doc(path), { active: true, status: 'active', title: 'Importer revival' }, text => text)));
        assert.deepEqual(results, [{}, {}, {}, {}]);
        assert.equal(cleanupCanonical(await snapshot(path)), before);
        const allowed = (owner: string | undefined, url: string) => db.runTransaction(tx => cleanupWriteAllowed(db, tx,
          `unowned-${run}`, {}, { ...(owner ? { employerId: owner } : {}), externalUrl: url }));
        assert.equal(await allowed(CLEANUP.oldEmployer, externalUrl(0)), false);
        assert.equal(await allowed(undefined, externalUrl(0)), false);
        assert.equal(await allowed(CLEANUP.newEmployer, externalUrl(0)), true);
        assert.equal(await allowed(CLEANUP.oldEmployer, externalUrl(999)), true);
        assert.equal(await allowed(CLEANUP.newEmployer, externalUrl(20)), false);
      });

      const rollbackReview = await service.rollbackReview({ auditId: applied.auditId }, keyId);
      const rollbackExecution = { keyId, idempotencyKey: `undo-${run}`, requestHash: sha(`undo-${run}`) };
      const rolledBack = await service.rollback(request(rollbackReview), rollbackExecution);
      assert.equal(rolledBack.verified, true);
      const rollbackAudit = await snapshot(`jobCleanupAudits/${rolledBack.auditId}`);
      for (const path of rollbackAudit.data.changedPaths as string[]) assert.equal((await snapshot(path)).version, rollbackAudit.version);
      for (const [path, original] of originals) {
        const restored = await snapshot(path);
        assert.equal(cleanupCanonical(restored.data), cleanupCanonical(original.data), path);
        if (/^(jobs|posts)\//.test(path)) {
          assertNative(restored.data, employerPath, (original.data.native as typeof native).timestamp);
          assert.equal(Object.hasOwn(restored.data, 'duplicateOf'), false, 'replace removes apply-added fields');
        }
      }
      await assertUnchanged(immutable);
      for (const path of changedPaths.filter(p => !/^(jobs|posts)\//.test(p))) {
        const restored = await snapshot(path); assert.equal(restored.data.active, false); assert.equal(restored.data.auditId, rolledBack.auditId);
      }
      assert.deepEqual(await service.rollback(request(rollbackReview), rollbackExecution), rolledBack);
      // Rollback retains inactive guard/alias/source history, never deletes audit evidence.
      assert.equal((await snapshot(backup.path)).version, backup.version);
      assert.equal((await snapshot(audit.path)).version, audit.version);
      await t.test('ordinary-user rules privacy: authenticated client reads and writes are denied', async privacy => {
        // Real client SDK requests exercise the emulator's loaded rules, not Admin bypass.
        // The enclosing opt-in/environment assertions run before any SDK initialization.
        const { initializeApp: initializeClientApp, deleteApp: deleteClientApp } = await import('firebase/app');
        const { initializeAuth, inMemoryPersistence, connectAuthEmulator, createUserWithEmailAndPassword } = await import('firebase/auth');
        const { getFirestore: getClientFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate } = await import('firebase/firestore');
        const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
        const fixtureId = `rules-privacy-${randomUUID()}`;
        const fixtureData = { fixtureOwner: fixtureId, privateEvidence: 'fictional-emulator-only' };
        const collections = ['jobCleanupBackups', 'jobCleanupAudits', 'jobCleanupReceipts',
          'jobCleanupReviews', 'jobCleanupGuards', 'jobCleanupSources', 'jobAliases'];
        const paths = collections.map(collection => `${collection}/${fixtureId}`);
        const clientApp = initializeClientApp({ projectId, apiKey: 'demo-emulator-only',
          authDomain: `${projectId}.firebaseapp.com` }, fixtureId);
        let clientDb: ReturnType<typeof getClientFirestore> | undefined;
        let uid: string | undefined;
        let fixturesCreated = false;
        try {
          const auth = initializeAuth(clientApp, { persistence: inMemoryPersistence });
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          clientDb = getClientFirestore(clientApp);
          connectFirestoreEmulator(clientDb, '127.0.0.1', 8080);
          const credential = await createUserWithEmailAndPassword(auth,
            `${fixtureId}@example.invalid`, randomUUID());
          uid = credential.user.uid;
          assert.equal(auth.currentUser?.uid, uid);
          assert.equal(credential.user.isAnonymous, false);
          const adminAuth = getAdminAuth(app);
          assert.deepEqual((await adminAuth.getUser(uid)).customClaims ?? {}, {}, 'Fixture user must have no privileged claims');

          // Atomically create unique, plain-data fixtures; never overwrite actual cleanup
          // records (whose Admin native values cannot be blindly passed to the client SDK).
          const batch = db.batch();
          for (const path of paths) batch.create(db.doc(path), fixtureData);
          await batch.commit();
          fixturesCreated = true;
          for (const path of paths) {
            const reference = doc(clientDb, path);
            await privacy.test(path.split('/')[0], async () => {
              // Attempt BOTH operations, even if a broken rule unexpectedly permits one.
              // An unexpectedly allowed write is identical data on our own fixture only.
              const results = await Promise.allSettled([getDoc(reference), setDoc(reference, fixtureData)]);
              for (const [index, result] of results.entries()) {
                const operation = index === 0 ? 'getDoc' : 'setDoc';
                assert.equal(result.status, 'rejected', `${operation} unexpectedly allowed: ${path}`);
                if (result.status === 'rejected') {
                  assert.equal(result.reason?.code, 'permission-denied', `${operation} must fail specifically on rules: ${path}`);
                }
              }
            });
          }
        } finally {
          try {
            // A failed create never confers ownership. No scans, resets, or deletion of
            // the native acceptance test's fixtures; its outer finally owns those.
            if (fixturesCreated) {
              const batch = db.batch();
              for (const path of paths) batch.delete(db.doc(path));
              await batch.commit();
              for (const snapshot of await db.getAll(...paths.map(path => db.doc(path)))) {
                assert.equal(snapshot.exists, false, `Privacy fixture cleanup failed: ${snapshot.ref.path}`);
              }
            }
          } finally {
            try {
              if (uid) {
                const adminAuth = getAdminAuth(app);
                await adminAuth.deleteUser(uid);
                await assert.rejects(adminAuth.getUser(uid), { code: 'auth/user-not-found' });
              }
            } finally {
              try { if (clientDb) await terminate(clientDb); }
              finally { await deleteClientApp(clientApp); }
            }
          }
        }
      });
    } finally {
      // No collection scans/deletes or blanket emulator wipe. Only this run's successful
      // creates are removed, including generated review/backup/audit/receipt documents.
      try {
        const paths = [...owned];
        for (let i = 0; i < paths.length; i += 400) {
          const batch = db.batch();
          for (const path of paths.slice(i, i + 400)) batch.delete(db.doc(path));
          await batch.commit();
        }
        if (paths.length) for (const d of await db.getAll(...paths.map(p => db.doc(p)))) {
          assert.equal(d.exists, false, `Fixture cleanup failed: ${d.ref.path}`);
        }
      } finally { await db.terminate(); await deleteApp(app); }
    }
  });

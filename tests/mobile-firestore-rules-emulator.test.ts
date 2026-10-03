import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, terminate, collection, doc, getDoc, getDocs, query, where, type Firestore } from 'firebase/firestore';

// The phone app's remaining direct database code (saved jobs, the member profile,
// notifications and the shop in mobile/src/lib) runs unchanged against the production
// rules. Only its React Native Firebase setup is replaced, and its Firebase imports use
// the SDK copy this suite connects to the emulators. Everything else goes through the
// website's APIs, and the records behind them stay closed to the app.
type Member = { db: Firestore; auth: Auth; uid: string };
const testGlobals = globalThis as typeof globalThis & { mobileFirestoreSignIn?: (member: Member) => void };
const firebaseModule = 'export let db, auth; globalThis.mobileFirestoreSignIn = member => { db = member.db; auth = member.auth; };';
registerHooks({
  resolve(specifier, context, next) {
    if (!context.parentURL?.includes('/mobile/src/lib/')) return next(specifier, context);
    if (specifier === './firebase') return { url: `data:text/javascript,${encodeURIComponent(firebaseModule)}`, shortCircuit: true };
    return next(specifier, specifier.startsWith('.') ? context : { ...context, parentURL: import.meta.url });
  },
});

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';

test('phone app: saved jobs, member profile, notifications and shop under the production rules', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-mobile-firestore';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'mobile-firestore-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string): Promise<Member> {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `mobile-firestore-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, auth, uid: (await signInAnonymously(auth)).user.uid };
  }
  try {
    const savedJobs = await import('../mobile/src/lib/savedJobs.ts');
    const profile = await import('../mobile/src/lib/profile.ts');
    const notifications = await import('../mobile/src/lib/firestore.ts');
    const listings = await import('../mobile/src/lib/listings.ts');
    const signIn = testGlobals.mobileFirestoreSignIn!;
    const a = await member('a'), b = await member('b');

    await t.test('a member saves, lists and removes jobs, as on the website', async () => {
      signIn(a);
      await savedJobs.saveJob(a.uid, { id: 'job-1', title: 'Cook', employerName: 'Cafe' });
      await savedJobs.saveJob(a.uid, { id: 'job-1', title: 'Cook', employerName: 'Cafe' });
      await savedJobs.saveJob(a.uid, { id: 'job-2', title: 'Clerk' });
      const stored = (await server.doc(`saved_items/${a.uid}_job-1`).get()).data();
      assert.deepEqual(Object.keys(stored || {}).sort(), ['postId', 'postOrgName', 'postTitle', 'postType', 'savedAt', 'userId']);
      assert.equal(stored?.postType, 'job');
      assert.deepEqual((await savedJobs.listSavedJobs(a.uid)).map(saved => saved.jobId).sort(), ['job-1', 'job-2']);
      assert.equal(await savedJobs.isJobSaved(a.uid, 'job-1'), true);
      await savedJobs.unsaveJob(a.uid, 'job-1');
      assert.equal(await savedJobs.isJobSaved(a.uid, 'job-1'), false);
      assert.equal((await server.doc(`saved_items/${a.uid}_job-1`).get()).exists, false);
    });

    await t.test("another member can neither see nor remove those saves", async () => {
      signIn(b);
      assert.deepEqual(await savedJobs.listSavedJobs(b.uid), []);
      await assert.rejects(savedJobs.listSavedJobs(a.uid), denied);
      await assert.rejects(savedJobs.unsaveJob(a.uid, 'job-2'), denied);
      assert.equal((await server.doc(`saved_items/${a.uid}_job-2`).get()).exists, true);
    });

    await t.test('a new member creates and edits their own profile, and only the fields the rules list', async () => {
      signIn(a);
      assert.equal((await profile.getMemberProfile(a.uid)).displayName, '');
      await profile.saveMemberProfile(a.uid, 'a@example.ca', { displayName: 'Ada Bear', location: 'Regina, SK', bio: 'Cook', photoURL: '' });
      const created = (await server.doc(`members/${a.uid}`).get()).data();
      assert.equal(created?.uid, a.uid);
      assert.equal(created?.email, 'a@example.ca');
      assert.equal(created?.displayName, 'Ada Bear');
      await profile.saveMemberProfile(a.uid, 'a@example.ca', {
        bio: 'Head cook', resumeUrl: `https://firebasestorage.googleapis.com/v0/b/demo/o/resumes%2F${a.uid}%2Fcv.pdf`, resumeFileName: 'cv.pdf',
      });
      const updated = await profile.getMemberProfile(a.uid);
      assert.equal(updated.bio, 'Head cook');
      assert.equal(updated.resumeFileName, 'cv.pdf');
      assert.ok((await server.doc(`members/${a.uid}`).get()).data()?.resumeUploadedAt);
      await profile.saveMemberProfile(a.uid, null, { resumeUrl: '', resumeFileName: '' });
      assert.equal((await profile.getMemberProfile(a.uid)).resumeUrl, '');
    });

    await t.test("an older account's users record still shows, and nobody reads another member's profile", async () => {
      await server.doc(`users/${b.uid}`).set({ email: 'b@example.ca', displayName: 'Bea', role: 'community' });
      signIn(b);
      assert.equal((await profile.getMemberProfile(b.uid)).displayName, 'Bea');
      await assert.rejects(profile.getMemberProfile(a.uid), denied);
      await assert.rejects(profile.saveMemberProfile(a.uid, null, { bio: 'Not mine' }), denied);
      assert.equal((await server.doc(`members/${a.uid}`).get()).data()?.bio, 'Head cook');
    });

    await t.test('a member reads their notifications and marks them read', async () => {
      const at = (minutes: number) => AdminTimestamp.fromMillis(Date.UTC(2026, 9, 3, 12, minutes));
      await server.doc('notifications/n1').set({ userId: a.uid, type: 'system', title: 'One', message: 'First', read: false, createdAt: at(1) });
      await server.doc('notifications/n2').set({ userId: a.uid, type: 'system', title: 'Two', message: 'Second', read: false, createdAt: at(2) });
      await server.doc('notifications/n3').set({ userId: b.uid, type: 'system', title: 'Other', message: 'Not yours', read: false, createdAt: at(3) });
      signIn(a);
      assert.deepEqual((await notifications.getMemberNotifications(a.uid)).map(n => n.id), ['n2', 'n1']);
      assert.equal(await notifications.getUnreadNotificationCount(a.uid), 2);
      await notifications.markNotificationAsRead('n1');
      assert.equal(await notifications.getUnreadNotificationCount(a.uid), 1);
      await notifications.markAllNotificationsAsRead(a.uid);
      assert.equal(await notifications.getUnreadNotificationCount(a.uid), 0);
      await assert.rejects(notifications.getMemberNotifications(b.uid), denied);
      await assert.rejects(notifications.markNotificationAsRead('n3'), denied);
      assert.equal((await server.doc('notifications/n3').get()).data()?.read, false);
    });

    await t.test('anyone can browse the shop', async () => {
      await server.doc('shop_vendors/beadwork-by-dawn').set({ name: 'Beadwork by Dawn', category: 'Art', location: { city: 'Prince Albert', province: 'SK' }, socialLinks: {}, featured: false });
      signIn(b);
      assert.deepEqual((await listings.listVendors()).map(vendor => [vendor.id, vendor.location]), [['beadwork-by-dawn', 'Prince Albert, SK']]);
      assert.equal((await listings.getVendor('beadwork-by-dawn'))?.businessName, 'Beadwork by Dawn');
      assert.equal(await listings.getVendor('missing'), null);
    });

    await t.test('the records the app now reads through the website stay closed to it', async () => {
      await server.doc('jobs/job-1').set({ title: 'Cook', active: true, employerId: a.uid });
      await server.doc(`applications/${b.uid}_job-1`).set({ userId: b.uid, postId: 'job-1', employerId: a.uid, status: 'submitted' });
      await server.doc('scholarships/s1').set({ title: 'Award', orgId: 'org-1' });
      await server.doc('events/e1').set({ title: 'Pow Wow', orgId: 'org-1' });
      for (const viewer of [a, b]) {
        await assert.rejects(getDocs(query(collection(viewer.db, 'jobs'), where('active', '==', true))), denied);
        await assert.rejects(getDoc(doc(viewer.db, `applications/${b.uid}_job-1`)), denied);
        await assert.rejects(getDocs(query(collection(viewer.db, 'applications'), where('employerId', '==', a.uid))), denied);
        await assert.rejects(getDoc(doc(viewer.db, 'scholarships/s1')), denied);
        await assert.rejects(getDoc(doc(viewer.db, 'events/e1')), denied);
        for (const name of ['savedJobs', 'jobAlerts', 'vendors', 'powwows', 'liveStreams', 'interviews', 'savedTalent']) {
          await assert.rejects(getDocs(query(collection(viewer.db, name), where('memberId', '==', viewer.uid))), denied);
        }
      }
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

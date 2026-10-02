import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch, serverTimestamp, Timestamp, terminate, type Firestore } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
const farFuture = () => Timestamp.fromDate(new Date('2099-01-01T00:00:00Z'));
test('notification rules: server-created records that owners may only mark read', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-notification-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'notification-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string) {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `notification-rules-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, uid: (await signInAnonymously(auth)).user.uid };
  }
  const a = await member('a'), b = await member('b');
  try {
    await t.test('notifications are server-created; owners may only mark them read', async () => {
      for (const id of ['1', '2']) {
        await server.doc(`notifications/${a.uid}_${id}`).set({ userId: a.uid, type: 'system', title: 'Welcome', body: 'Fixture', link: '/profile', read: false, createdAt: AdminTimestamp.now() });
      }
      const own = doc(a.db, 'notifications', `${a.uid}_1`);
      assert.equal((await getDoc(own)).data()?.title, 'Welcome');
      assert.equal((await getDocs(query(collection(a.db, 'notifications'), where('userId', '==', a.uid), where('read', '==', false)))).size, 2);
      await assert.rejects(getDoc(doc(b.db, 'notifications', `${a.uid}_1`)), denied);
      // No client can inject a notification, for another member or for itself.
      const injected = { type: 'system', title: 'IOPPS Security', body: 'Verify your account', link: 'https://evil.example', read: false, createdAt: serverTimestamp() };
      await assert.rejects(setDoc(doc(b.db, 'notifications', `${a.uid}_injected`), { ...injected, userId: a.uid }), denied);
      await assert.rejects(setDoc(doc(b.db, 'notifications', `${b.uid}_injected`), { ...injected, userId: b.uid }), denied);
      // Owners cannot retarget a notification to another member or rewrite its content.
      for (const patch of [{ userId: b.uid }, { read: true, userId: b.uid }, { title: 'IOPPS Security' }, { title: { text: 'Not a string' } },
        { link: 'https://evil.example' }, { createdAt: farFuture() }, { read: 'yes' }]) {
        await assert.rejects(updateDoc(own, patch), denied);
      }
      await assert.rejects(updateDoc(doc(b.db, 'notifications', `${a.uid}_1`), { read: true }), denied);
      await updateDoc(own, { read: true });
      // Mark all as read uses a batch of the same single-field updates.
      const batch = writeBatch(a.db);
      batch.update(doc(a.db, 'notifications', `${a.uid}_2`), { read: true });
      await batch.commit();
      for (const id of ['1', '2']) {
        const stored = (await server.doc(`notifications/${a.uid}_${id}`).get()).data();
        assert.equal(stored?.read, true);
        assert.equal(stored?.userId, a.uid);
        assert.equal(stored?.link, '/profile');
      }
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

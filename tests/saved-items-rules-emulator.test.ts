import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, terminate, type Firestore } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
test('saved item rules: owner-only and ownership cannot be reassigned', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-saved-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'saved-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string) {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `saved-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, uid: (await signInAnonymously(auth)).user.uid };
  }
  const a = await member('a'), b = await member('b');
  try {
    await t.test('owner saves, reads, lists, re-saves and removes their own items', async () => {
      const ref = doc(a.db, 'saved_items', `${a.uid}_job-1`);
      await setDoc(ref, { userId: a.uid, postId: 'job-1', title: 'Role', type: 'job' });
      assert.equal((await getDoc(ref)).exists(), true);
      assert.equal((await getDocs(query(collection(a.db, 'saved_items'), where('userId', '==', a.uid)))).size, 1);
      await setDoc(ref, { userId: a.uid, postId: 'job-1', title: 'Role (updated)', type: 'job' });
      await deleteDoc(ref);
    });
    await t.test('items cannot be created for, or reassigned to, another member', async () => {
      await assert.rejects(setDoc(doc(a.db, 'saved_items', 'forged-userId'), { userId: b.uid, postId: 'x' }), denied);
      await assert.rejects(setDoc(doc(a.db, 'saved_items', 'forged-uid'), { uid: b.uid, postId: 'x' }), denied);
      await assert.rejects(setDoc(doc(a.db, 'saved_items', 'mixed'), { userId: a.uid, uid: b.uid, postId: 'x' }), denied);
      const own = doc(a.db, 'saved_items', `${a.uid}_job-2`);
      await setDoc(own, { userId: a.uid, postId: 'job-2' });
      await assert.rejects(updateDoc(own, { userId: b.uid }), denied);
      await assert.rejects(updateDoc(own, { uid: b.uid }), denied);
    });
    await t.test("another member's items (current and legacy uid field) stay private", async () => {
      await server.doc(`saved_items/${b.uid}_job-3`).set({ userId: b.uid, postId: 'job-3' });
      await server.doc('saved_items/legacy-b').set({ uid: b.uid, postId: 'job-4' });
      await server.doc('saved_items/legacy-a').set({ uid: a.uid, postId: 'job-5' });
      await assert.rejects(getDoc(doc(a.db, 'saved_items', `${b.uid}_job-3`)), denied);
      await assert.rejects(getDoc(doc(a.db, 'saved_items', 'legacy-b')), denied);
      await assert.rejects(deleteDoc(doc(a.db, 'saved_items', 'legacy-b')), denied);
      await assert.rejects(getDocs(query(collection(a.db, 'saved_items'), where('userId', '==', b.uid))), denied);
      assert.equal((await getDoc(doc(a.db, 'saved_items', 'legacy-a'))).exists(), true);
      await deleteDoc(doc(a.db, 'saved_items', 'legacy-a'));
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

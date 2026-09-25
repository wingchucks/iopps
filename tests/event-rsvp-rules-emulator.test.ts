import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocs, query, setDoc, where, terminate, type Firestore } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
test('event RSVP rules: members read only their own RSVPs', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-rsvp-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'rsvp-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string) {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `rsvp-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, uid: (await signInAnonymously(auth)).user.uid };
  }
  const a = await member('a'), b = await member('b');
  const eventId = 'fixture-event';
  try {
    await server.doc(`event_rsvps/${b.uid}_${eventId}`).set({ userId: b.uid, postId: eventId, postTitle: 'Private', status: 'going' });
    await t.test('own RSVP can be created, read and listed', async () => {
      await setDoc(doc(a.db, 'event_rsvps', `${a.uid}_${eventId}`), { userId: a.uid, postId: eventId, postTitle: 'Fixture', status: 'going' });
      assert.equal((await getDoc(doc(a.db, 'event_rsvps', `${a.uid}_${eventId}`))).exists(), true);
      assert.equal((await getDoc(doc(a.db, 'event_rsvps', `${a.uid}_not-yet`))).exists(), false);
      assert.equal((await getDocs(query(collection(a.db, 'event_rsvps'), where('userId', '==', a.uid)))).size, 1);
    });
    await t.test("another member's RSVPs cannot be read, listed, probed or counted client-side", async () => {
      await assert.rejects(getDoc(doc(a.db, 'event_rsvps', `${b.uid}_${eventId}`)), denied);
      await assert.rejects(getDoc(doc(a.db, 'event_rsvps', `${b.uid}_missing-event`)), denied);
      await assert.rejects(getDocs(collection(a.db, 'event_rsvps')), denied);
      await assert.rejects(getDocs(query(collection(a.db, 'event_rsvps'), where('postId', '==', eventId))), denied);
      await assert.rejects(getDocs(query(collection(a.db, 'event_rsvps'), where('userId', '==', b.uid))), denied);
    });
    await t.test('RSVPs cannot be written under another member ID', async () => {
      await assert.rejects(setDoc(doc(a.db, 'event_rsvps', `${b.uid}_other`), { userId: a.uid, postId: 'other', status: 'going' }), denied);
      await assert.rejects(setDoc(doc(a.db, 'event_rsvps', `${a.uid}_forged`), { userId: b.uid, postId: 'forged', status: 'going' }), denied);
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

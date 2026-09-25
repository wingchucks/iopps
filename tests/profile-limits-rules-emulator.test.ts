import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, terminate } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
test('profile rules cap oversized direct writes but keep existing long values editable', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-profile-limits';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'profile-limits'); const server = getAdminDb(admin);
  const client = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, 'profile-limits');
  const auth = getAuth(client); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(client); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const uid = (await signInAnonymously(auth)).user.uid;
  try {
    await t.test('create within limits succeeds; oversized create is denied', async () => {
      await assert.rejects(setDoc(doc(db, 'members', uid), { uid, displayName: 'x'.repeat(201) }), denied);
      await setDoc(doc(db, 'members', uid), { uid, displayName: 'ᐊᒥᐦᑯᐤ Éloïse', bio: 'x'.repeat(20000), interests: ['jobs'] });
    });
    await t.test('oversized updates are denied field by field', async () => {
      await assert.rejects(updateDoc(doc(db, 'members', uid), { bio: 'x'.repeat(20001) }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { headline: 'x'.repeat(5001) }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { interests: Array(201).fill('jobs') }), denied);
      await updateDoc(doc(db, 'members', uid), { headline: 'Treaty 6 administrator' });
    });
    await t.test('capped fields require their type, and lists are capped by total length', async () => {
      await assert.rejects(updateDoc(doc(db, 'members', uid), { experienceLevel: 'x'.repeat(5001) }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { workPreference: 'x'.repeat(5001) }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { bio: { a: 'x'.repeat(100000) } }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { interests: ['x'.repeat(100000)] }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { skills: [{ name: 'x' }] }), denied);
      await assert.rejects(updateDoc(doc(db, 'members', uid), { education: { a: 1 } }), denied);
      await updateDoc(doc(db, 'members', uid), { workPreference: 'hybrid', experienceLevel: 'Mid', skills: Array(400).fill('Skill'), resumeUrl: null });
      await updateDoc(doc(db, 'members', uid), { education: [{ school: 'First Nations University', degree: 'BA', field: 'Indigenous Studies', year: 2020 }] });
    });
    await t.test('an existing legacy value over the cap does not block editing other fields', async () => {
      await server.doc(`users/${uid}`).set({ displayName: 'Legacy', bio: 'x'.repeat(30000) });
      await updateDoc(doc(db, 'users', uid), { displayName: 'Legacy (edited)' });
      await assert.rejects(updateDoc(doc(db, 'users', uid), { bio: 'y'.repeat(30000) }), denied);
    });
  } finally {
    await terminate(db); await deleteApp(client); await deleteAdmin(admin);
  }
});

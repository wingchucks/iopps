import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, terminate } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
test('publishing rules: clients cannot bypass server publishing or featured entitlement checks', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-publishing-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'publishing-rules'); const server = getAdminDb(admin);
  const client = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, 'publishing-rules');
  const auth = getAuth(client); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(client); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const user = (await signInAnonymously(auth)).user; const uid = user.uid;
  const paths = new Set<string>();
  const ref = (collection: string, suffix: string) => { const path = `${collection}/${uid}-${suffix}`; paths.add(path); return doc(db, path); };
  try {
    await server.doc(`members/${uid}`).set({ role: 'employer', orgId: uid, orgRole: 'owner' });
    await t.test('org owner cannot directly create published jobs or organization posts', async () => {
      for (const [collection, type] of [['jobs', 'job'], ['posts', 'job'], ['posts', 'program'], ['posts', 'event']]) {
        await assert.rejects(setDoc(ref(collection, `create-${type}`), { orgId: uid, employerId: uid, type, title: 'Bypass', status: 'active', active: true, featured: true }), denied);
      }
    });
    await t.test('authorUid is not permission to impersonate a paid job/program', async () => {
      for (const type of ['job', 'program', 'scholarship']) await assert.rejects(setDoc(ref('posts', `author-${type}`), { authorUid: uid, title: 'Forged', type, status: 'active', featured: true }), denied);
    });
    await t.test('direct promotion, forged credit proof, owner transfer and deletion are denied', async () => {
      for (const collection of ['jobs', 'posts']) {
        const target = ref(collection, 'draft');
        await server.doc(target.path).set({ orgId: uid, employerId: uid, type: 'job', title: 'Server draft', status: 'draft', active: false, featured: false });
        for (const data of [{ status: 'active', active: true }, { featured: true }, { featuredCreditConsumed: true }, { orgId: 'victim' }, { type: 'story', authorUid: uid }]) await assert.rejects(updateDoc(target, data), denied);
        await assert.rejects(deleteDoc(target), denied);
      }
    });
    await t.test('community stories and spotlights remain compatible without promotion fields', async () => {
      for (const type of ['story', 'spotlight']) {
        const data = { type, title: 'Fictional community post', description: 'Content', authorUid: uid, authorName: 'Fixture', authorPhoto: '/fixture.png', featuredImage: '/fixture.png', status: 'active', createdAt: new Date(), order: Date.now() };
        await setDoc(ref('posts', type), data);
        await assert.rejects(setDoc(ref('posts', `${type}-featured`), { ...data, featured: true }), denied);
        await assert.rejects(setDoc(ref('posts', `${type}-org`), { ...data, orgId: 'victim' }), denied);
        await assert.rejects(setDoc(ref('posts', `${type}-author`), { ...data, authorUid: 'victim' }), denied);
      }
    });
    await t.test('client-admin must also use authenticated server publishing paths', async () => {
      await server.doc(`members/${uid}`).set({ role: 'admin' });
      for (const collection of ['jobs', 'posts']) await assert.rejects(setDoc(ref(collection, 'admin-create'), { type: 'job', status: 'active', featured: true, orgId: uid }), denied);
    });
  } finally {
    for (const path of paths) await server.doc(path).delete();
    await server.doc(`members/${uid}`).delete(); await deleteUser(user);
    await terminate(db); await deleteApp(client); await server.terminate(); await deleteAdmin(admin);
  }
});

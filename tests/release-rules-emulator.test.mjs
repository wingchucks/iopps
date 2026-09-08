import test from 'node:test';
import assert from 'node:assert/strict';

test('release rules preserve organization management while isolating private applications', {
  skip: process.env.IOPPS_TEST_EMULATORS !== 'true',
}, async () => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const admin = await import('firebase-admin/app');
  const { getFirestore: getAdminDb } = await import('firebase-admin/firestore');
  const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, terminate } = await import('firebase/firestore');
  const { getStorage, connectStorageEmulator, ref, uploadBytes } = await import('firebase/storage');
  const projectId = 'demo-iopps-preview';
  const server = admin.initializeApp({ projectId }, 'release-rules');
  const db = getAdminDb(server);
  const client = initializeApp({ projectId, apiKey: 'demo-local-key', storageBucket: `${projectId}.appspot.com` }, 'release-rules');
  const auth = getAuth(client);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const clientDb = getFirestore(client);
  connectFirestoreEmulator(clientDb, '127.0.0.1', 8080);
  const storage = getStorage(client);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  const uid = 'release-rules-owner';
  const orgId = 'release-rules-org';
  try {
    await getAdminAuth(server).createUser({ uid, email: 'release-rules@example.test', password: 'LocalRules123!', emailVerified: true }).catch(e => { if (e.code !== 'auth/uid-already-exists') throw e; });
    await db.doc(`members/${uid}`).set({ orgId, orgRole: 'owner' });
    await db.doc(`organizations/${orgId}`).set({ name: 'Before' });
    await db.doc('applications/release-other-org').set({ userId: 'other-person', orgId: 'other-org', employerId: 'other-org', status: 'submitted' });
    await signInWithEmailAndPassword(auth, 'release-rules@example.test', 'LocalRules123!');
    await updateDoc(doc(clientDb, 'organizations', orgId), { name: 'After' });
    const invite = doc(clientDb, 'organizations', orgId, 'teamInvites', 'test-invite');
    await setDoc(invite, { email: 'invite@example.test' });
    assert.equal((await getDoc(invite)).data().email, 'invite@example.test');
    await deleteDoc(invite);
    for (const collection of ['events', 'conferences', 'scholarships']) {
      const item = doc(clientDb, collection, 'release-owned-item');
      await setDoc(item, { orgId, title: 'Fictional' });
      await updateDoc(item, { title: 'Updated' });
      await deleteDoc(item);
    }
    await assert.rejects(getDoc(doc(clientDb, 'applications', 'release-other-org')), e => e.code === 'permission-denied');
    await assert.rejects(updateDoc(doc(clientDb, 'applications', 'release-other-org'), { status: 'offered' }), e => e.code === 'permission-denied');
    await uploadBytes(ref(storage, `livestream-promos/${uid}/test.png`), new Uint8Array([137,80,78,71]), { contentType: 'image/png' });
    await assert.rejects(uploadBytes(ref(storage, 'livestream-promos/other-user/test.png'), new Uint8Array([1]), { contentType: 'image/png' }), e => e.code === 'storage/unauthorized');
  } finally {
    await Promise.all([db.doc(`members/${uid}`).delete(), db.doc(`organizations/${orgId}`).delete(), db.doc('applications/release-other-org').delete()]);
    await terminate(clientDb);
    await deleteApp(client);
    await db.terminate();
    await admin.deleteApp(server);
  }
});

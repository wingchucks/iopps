import test from 'node:test';
import assert from 'node:assert/strict';

// Explicit opt-in; this test never connects to a real Firebase project.
test('application withdrawal permissions and resume ownership', {
  skip: process.env.IOPPS_TEST_EMULATORS !== 'true',
}, async () => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const admin = await import('firebase-admin/app');
  const { getFirestore: adminDb } = await import('firebase-admin/firestore');
  const { getAuth: adminAuth } = await import('firebase-admin/auth');
  const { initializeApp, deleteApp } = await import('firebase/app');
  const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = await import('firebase/auth');
  const { getFirestore, connectFirestoreEmulator, doc, updateDoc, getDoc, serverTimestamp, Timestamp, terminate } = await import('firebase/firestore');
  const { getStorage, connectStorageEmulator, ref, uploadBytes, deleteObject } = await import('firebase/storage');
  const projectId = 'demo-iopps-preview';
  const server = admin.initializeApp({ projectId }, 'application-rule-tests');
  const client = initializeApp({ projectId, apiKey: 'demo-local-key', storageBucket: `${projectId}.appspot.com` }, 'application-rule-tests');
  const db = getFirestore(client);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const auth = getAuth(client);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const storage = getStorage(client);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  const uid = 'application-rule-candidate';
  try {
    await adminAuth(server).createUser({ uid, email: 'rules@example.test', password: 'LocalRules123!', emailVerified: true }).catch(e => { if(e.code !== 'auth/uid-already-exists') throw e; });
    await signInWithEmailAndPassword(auth, 'rules@example.test', 'LocalRules123!');
    const data = { userId: uid, orgId: 'rules-org', employerId: 'rules-org', status: 'submitted', statusHistory: [], resumeUrl: 'unchanged', postId: 'rules-job' };
    const serverDoc = adminDb(server).doc('applications/local-rules-check');
    const clientDoc = doc(db, 'applications/local-rules-check');
    await serverDoc.set(data);
    await assert.rejects(updateDoc(clientDoc, { status: 'offered' }), e => e.code === 'permission-denied');
    const withdrawal = { status: 'withdrawn', statusHistory: [{ status: 'withdrawn', timestamp: Timestamp.now(), note: 'Withdrawn by applicant' }], updatedAt: serverTimestamp() };
    await assert.rejects(updateDoc(clientDoc, { ...withdrawal, resumeUrl: 'tampered' }), e => e.code === 'permission-denied');
    await updateDoc(clientDoc, withdrawal);
    assert.equal((await getDoc(clientDoc)).data().status, 'withdrawn');
    await serverDoc.update({ ...data, userId: 'someone-else' });
    await assert.rejects(updateDoc(clientDoc, withdrawal), e => e.code === 'permission-denied');
    const own = ref(storage, `resumes/${uid}/rules.pdf`);
    await uploadBytes(own, new TextEncoder().encode('%PDF-1.4 fictional test'), { contentType: 'application/pdf' });
    await assert.rejects(uploadBytes(ref(storage, 'resumes/someone-else/rules.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' }), e => e.code === 'storage/unauthorized');
    await deleteObject(own);
    await serverDoc.delete();
  } finally {
    await terminate(db);
    await deleteApp(client);
    await admin.deleteApp(server);
  }
});

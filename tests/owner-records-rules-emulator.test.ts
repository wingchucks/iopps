import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, addDoc, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, terminate, type Firestore } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
const farFuture = () => Timestamp.fromDate(new Date('2099-01-01T00:00:00Z'));
test('owner records accept only the shapes their clients write', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-owner-records-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'owner-records-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string) {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `owner-records-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, uid: (await signInAnonymously(auth)).user.uid };
  }
  const a = await member('a'), b = await member('b');
  try {
    await t.test('member settings accept the privacy page writes, including on legacy documents, and nothing else', async () => {
      // Exactly the writes made by updateMemberSettings in src/lib/firestore/memberSettings.ts.
      const fieldVisibility = { email: 'only_me', community: 'everyone', location: 'members', bio: 'everyone', interests: 'everyone' };
      const privacy = { profileVisibility: 'public', fieldVisibility, showOnlineStatus: true, allowDirectMessages: true, showInDirectory: true };
      const settings = doc(a.db, 'member_settings', a.uid);
      await assert.rejects(setDoc(settings, { userId: a.uid, ...privacy, role: 'admin', updatedAt: serverTimestamp() }), denied);
      await assert.rejects(setDoc(settings, { userId: b.uid, ...privacy, updatedAt: serverTimestamp() }), denied);
      await assert.rejects(setDoc(doc(a.db, 'member_settings', b.uid), { userId: b.uid, ...privacy, updatedAt: serverTimestamp() }), denied);
      await setDoc(settings, { userId: a.uid, ...privacy, updatedAt: serverTimestamp() });
      await updateDoc(settings, { ...privacy, showOnlineStatus: false, allowDirectMessages: false, updatedAt: serverTimestamp() });
      for (const patch of [{ orgId: 'forged-organization' }, { userId: b.uid }, { allowDirectMessages: 'no' },
        { profileVisibility: 'everyone' }, { fieldVisibility: { ...fieldVisibility, email: 'x'.repeat(100000) } },
        { fieldVisibility: { ...fieldVisibility, resumeUrl: 'everyone' } }, { fieldVisibility: 'everyone' },
        { showOnlineStatus: true, updatedAt: farFuture() }]) {
        await assert.rejects(updateDoc(settings, patch), denied);
      }
      // A legacy document keeps its historical fields, and the current page can still save it.
      await server.doc(`member_settings/${b.uid}`).set({ userId: b.uid, profileVisibility: 'connections', fieldPrivacy: { email: 'private' },
        notifications: { messages: true }, allowMessagesFrom: 'connections', showInDirectory: true, onboarding: { completed: true }, updatedAt: AdminTimestamp.now() });
      await updateDoc(doc(b.db, 'member_settings', b.uid), { ...privacy, profileVisibility: 'connections', allowDirectMessages: false, updatedAt: serverTimestamp() });
      const legacy = (await server.doc(`member_settings/${b.uid}`).get()).data();
      assert.equal(legacy?.allowDirectMessages, false);
      assert.equal(legacy?.allowMessagesFrom, 'connections');
    });
    await t.test('notification preferences accept the settings page writes and nothing else', async () => {
      // Exactly the writes made by updateNotificationPreferences in src/lib/firestore/notificationPreferences.ts.
      const channels = { email: true, push: true, inApp: true };
      const categories = { applications: { ...channels }, messages: { ...channels }, community: { ...channels }, events: { ...channels }, opportunities: { ...channels } };
      const quietHours = { enabled: false, start: '22:00', end: '08:00' };
      const preferences = doc(a.db, 'notification_preferences', a.uid);
      await assert.rejects(setDoc(preferences, { userId: a.uid, categories, quietHours, emailAddress: 'forged@example.invalid', updatedAt: serverTimestamp() }), denied);
      await assert.rejects(setDoc(doc(a.db, 'notification_preferences', b.uid), { userId: b.uid, categories, quietHours, updatedAt: serverTimestamp() }), denied);
      await setDoc(preferences, { userId: a.uid, categories, quietHours, updatedAt: serverTimestamp() });
      await updateDoc(preferences, { categories: { ...categories, messages: { ...channels, email: false } }, quietHours: { enabled: true, start: '21:30', end: '' }, updatedAt: serverTimestamp() });
      for (const patch of [{ userId: b.uid }, { emailAddress: 'forged@example.invalid' }, { categories: 'all' },
        { categories: { ...categories, marketing: { ...channels } } }, { categories: { ...categories, messages: { ...channels, sms: true } } },
        { categories: { ...categories, messages: { ...channels, email: 'x'.repeat(100000) } } },
        { quietHours: { ...quietHours, start: 'x'.repeat(100000) } }, { quietHours: { ...quietHours, enabled: 'yes' } },
        { quietHours: { ...quietHours, extra: true } }, { updatedAt: farFuture() }]) {
        await assert.rejects(updateDoc(preferences, patch), denied);
      }
      assert.equal((await server.doc(`notification_preferences/${a.uid}`).get()).data()?.categories.messages.email, false);
    });
    await t.test('training enrollments are recorded as not started and cannot be self-completed', async () => {
      // Exactly the write made by enrollInProgram in src/lib/firestore/training.ts.
      const enrollment = { userId: a.uid, programId: 'fixture-program', programTitle: 'Fixture program', progress: 0, completedModules: [],
        totalModules: 3, status: 'enrolled', enrolledAt: serverTimestamp(), completedAt: null, certificateUrl: null };
      const created = await addDoc(collection(a.db, 'training_enrollments'), enrollment);
      assert.equal((await getDoc(created)).data()?.status, 'enrolled');
      for (const forged of [{ ...enrollment, status: 'completed', progress: 100, completedAt: serverTimestamp() },
        { ...enrollment, certificateUrl: 'https://evil.example/certificate.pdf' }, { ...enrollment, completedModules: ['module-1'] },
        { ...enrollment, userId: b.uid }, { ...enrollment, enrolledAt: Timestamp.fromDate(new Date('2020-01-01T00:00:00Z')) },
        { ...enrollment, programTitle: { text: 'Not a string' } }, { ...enrollment, verified: true }]) {
        await assert.rejects(addDoc(collection(a.db, 'training_enrollments'), forged), denied);
      }
      for (const patch of [{ status: 'completed', progress: 100 }, { certificateUrl: 'https://evil.example/certificate.pdf' },
        { progress: 50, completedModules: ['module-1'], status: 'in-progress' }, { userId: b.uid }]) {
        await assert.rejects(updateDoc(created, patch), denied);
      }
      await assert.rejects(getDoc(doc(b.db, 'training_enrollments', created.id)), denied);
      assert.equal((await server.doc(`training_enrollments/${created.id}`).get()).data()?.progress, 0);
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

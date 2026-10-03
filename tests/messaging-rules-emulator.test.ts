import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, terminate, type Firestore } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
const farFuture = () => Timestamp.fromDate(new Date('2099-01-01T00:00:00Z'));
test('messaging rules: participants only, own previews, plain-text messages and the direct-message opt-out', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-messaging-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'messaging-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string) {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `messaging-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, uid: (await signInAnonymously(auth)).user.uid };
  }
  const a = await member('a'), b = await member('b'), outsider = await member('outsider');
  // Conversations are historical records; clients can no longer create them.
  const conversation = `fixture-${a.uid}-${b.uid}`;
  await server.doc(`conversations/${conversation}`).set({ participants: [a.uid, b.uid], lastMessage: 'Hello', lastMessageAt: AdminTimestamp.now(), lastSenderId: b.uid, unreadBy: a.uid });
  const message = (sender: { uid: string }, text: string) => ({ conversationId: conversation, senderId: sender.uid, text, createdAt: serverTimestamp() });
  const preview = (sender: { uid: string }, recipient: { uid: string }, text: string) => ({ lastMessage: text, lastMessageAt: serverTimestamp(), lastSenderId: sender.uid, unreadBy: recipient.uid });
  try {
    await t.test('only participants can read a conversation, and nobody can probe for missing ones', async () => {
      assert.equal((await getDoc(doc(a.db, 'conversations', conversation))).exists(), true);
      await assert.rejects(getDoc(doc(outsider.db, 'conversations', conversation)), denied);
      // Missing and foreign conversations look the same: no relationship oracle.
      for (const id of [`${a.uid}_${outsider.uid}`, `${b.uid}_${outsider.uid}`, `${conversation}-missing`]) {
        await assert.rejects(getDoc(doc(a.db, 'conversations', id)), denied);
      }
      await assert.rejects(setDoc(doc(a.db, 'conversations', `${a.uid}_${outsider.uid}`), { participants: [a.uid, outsider.uid] }), denied);
    });
    await t.test('readers clear only their own unread marker', async () => {
      const ref = (db: Firestore) => doc(db, 'conversations', conversation);
      await updateDoc(ref(a.db), { unreadBy: '' });
      await server.doc(`conversations/${conversation}`).update({ unreadBy: a.uid });
      await assert.rejects(updateDoc(ref(b.db), { unreadBy: '' }), denied);
      await assert.rejects(updateDoc(ref(b.db), { unreadBy: b.uid }), denied);
      await assert.rejects(updateDoc(ref(a.db), { unreadBy: b.uid }), denied);
      await assert.rejects(updateDoc(ref(outsider.db), { unreadBy: '' }), denied);
      await assert.rejects(updateDoc(ref(a.db), { participants: [a.uid, outsider.uid] }), denied);
      assert.equal((await server.doc(`conversations/${conversation}`).get()).data()?.unreadBy, a.uid);
    });
    await t.test('senders add plain-text messages and stamp their own preview at the server time', async () => {
      await setDoc(doc(a.db, 'messages', `${conversation}_1`), message(a, 'Hello from A'));
      await updateDoc(doc(a.db, 'conversations', conversation), preview(a, b, 'Hello from A'));
      assert.equal((await getDoc(doc(b.db, 'messages', `${conversation}_1`))).data()?.text, 'Hello from A');
      // The client keeps 80 characters plus an ellipsis; messages are capped at 5,000.
      const long = 'ᐊ'.repeat(5000);
      await setDoc(doc(a.db, 'messages', `${conversation}_2`), message(a, long));
      await updateDoc(doc(a.db, 'conversations', conversation), preview(a, b, long.slice(0, 80) + '…'));
      const stored = (await server.doc(`conversations/${conversation}`).get()).data();
      assert.equal(stored?.lastSenderId, a.uid);
      assert.equal(stored?.unreadBy, b.uid);
      await assert.rejects(getDoc(doc(outsider.db, 'messages', `${conversation}_1`)), denied);
    });
    await t.test('previews cannot be forged for the other member, pinned, malformed or retargeted', async () => {
      const ref = doc(b.db, 'conversations', conversation);
      const reply = preview(b, a, 'Reply from B');
      for (const forged of [
        { ...reply, lastMessage: 'I agree to pay $500', lastSenderId: a.uid },
        { ...reply, lastMessageAt: farFuture() },
        { ...reply, lastMessage: { text: 'Not a string' } },
        { ...reply, lastMessage: '' },
        { ...reply, lastMessage: 'x'.repeat(82) },
        { ...reply, unreadBy: b.uid },
        { ...reply, unreadBy: outsider.uid },
        { ...reply, unreadBy: '' },
        { ...reply, pinned: true },
        { lastMessageAt: serverTimestamp(), unreadBy: a.uid },
      ]) await assert.rejects(updateDoc(ref, forged), denied);
      await assert.rejects(updateDoc(doc(outsider.db, 'conversations', conversation), preview(outsider, a, 'Injected')), denied);
      await updateDoc(ref, reply);
      assert.equal((await server.doc(`conversations/${conversation}`).get()).data()?.lastSenderId, b.uid);
    });
    await t.test('messages must be plain text from the sender at the server time', async () => {
      const reply = message(b, 'Plain reply');
      for (const forged of [
        { ...reply, senderId: a.uid },
        { ...reply, text: { body: 'Not a string' } },
        { ...reply, text: '' },
        { ...reply, text: 'x'.repeat(5001) },
        { ...reply, createdAt: farFuture() },
        { conversationId: conversation, senderId: b.uid, text: 'Missing timestamp' },
        { ...reply, read: true },
        { ...reply, conversationId: `${conversation}-missing` },
      ]) await assert.rejects(setDoc(doc(b.db, 'messages', `${conversation}_forged`), forged), denied);
      await assert.rejects(setDoc(doc(outsider.db, 'messages', `${conversation}_outsider`), message(outsider, 'Injected')), denied);
      await setDoc(doc(b.db, 'messages', `${conversation}_reply`), reply);
    });
    await t.test('a member who turns off direct messages receives none until they turn them back on', async () => {
      // Exactly the writes made by updatePrivacySettings in src/lib/firestore/memberSettings.ts.
      const settings = doc(b.db, 'member_settings', b.uid);
      const privacy = { profileVisibility: 'public', fieldVisibility: { email: 'only_me', community: 'everyone', location: 'members', bio: 'everyone', interests: 'everyone' }, showOnlineStatus: true, showInDirectory: true };
      await setDoc(settings, { userId: b.uid, ...privacy, allowDirectMessages: false, updatedAt: serverTimestamp() });
      await assert.rejects(setDoc(doc(a.db, 'messages', `${conversation}_blocked`), message(a, 'Blocked')), denied);
      await assert.rejects(updateDoc(doc(a.db, 'conversations', conversation), preview(a, b, 'Blocked')), denied);
      // The member who opted out can still read, clear their marker and write in the conversation.
      await server.doc(`conversations/${conversation}`).update({ unreadBy: b.uid });
      assert.equal((await getDoc(doc(b.db, 'messages', `${conversation}_1`))).exists(), true);
      await updateDoc(doc(b.db, 'conversations', conversation), { unreadBy: '' });
      await setDoc(doc(b.db, 'messages', `${conversation}_from-b`), message(b, 'Still able to write'));
      await updateDoc(doc(b.db, 'conversations', conversation), preview(b, a, 'Still able to write'));
      await updateDoc(settings, { ...privacy, allowDirectMessages: true, updatedAt: serverTimestamp() });
      await setDoc(doc(a.db, 'messages', `${conversation}_allowed`), message(a, 'Allowed again'));
      await updateDoc(doc(a.db, 'conversations', conversation), preview(a, b, 'Allowed again'));
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

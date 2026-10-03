import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, terminate, type Firestore } from 'firebase/firestore';

// The phone app's messaging module (mobile/src/lib/messaging.ts) runs unchanged against
// the production rules. Only its React Native Firebase setup and its email request are
// replaced, and its Firebase imports use the SDK copy this suite connects to the emulators.
type Member = { db: Firestore; auth: Auth; uid: string };
const testGlobals = globalThis as typeof globalThis & { mobileMessagingSignIn?: (member: Member) => void; mobileMessagingNotified?: unknown[][] };
const notified: unknown[][] = [];
testGlobals.mobileMessagingNotified = notified;
const replacements: Record<string, string> = {
  './firebase': 'export let db, auth; globalThis.mobileMessagingSignIn = member => { db = member.db; auth = member.auth; };',
  './messageNotifications': 'export const notifyNewMessage = async (...args) => { globalThis.mobileMessagingNotified.push(args); return { state: "accepted" }; };',
};
registerHooks({
  resolve(specifier, context, next) {
    if (!context.parentURL?.endsWith('/mobile/src/lib/messaging.ts')) return next(specifier, context);
    const replacement = replacements[specifier];
    if (replacement) return { url: `data:text/javascript,${encodeURIComponent(replacement)}`, shortCircuit: true };
    return next(specifier, { ...context, parentURL: import.meta.url });
  },
});

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';

// The first snapshot (or error) of a live listener.
function first<T>(listen: (next: (value: T) => void, fail: (error: unknown) => void) => () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const stop = listen(
      value => { if (!settled) { settled = true; queueMicrotask(stop); resolve(value); } },
      error => { if (!settled) { settled = true; reject(error); } },
    );
  });
}

test('phone app messaging: inbox, unread marker, sending and refusals under the production rules', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-mobile-messaging';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'mobile-messaging-rules'); const server = getAdminDb(admin);
  const apps: FirebaseApp[] = []; const dbs: Firestore[] = [];
  async function member(name: string): Promise<Member> {
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, `mobile-messaging-${name}`); apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080); dbs.push(db);
    return { db, auth, uid: (await signInAnonymously(auth)).user.uid };
  }
  try {
    const messaging = await import('../mobile/src/lib/messaging.ts');
    const signIn = testGlobals.mobileMessagingSignIn!;
    const a = await member('a'), b = await member('b'), outsider = await member('outsider');
    const conversation = [a.uid, b.uid].sort().join('_');
    const conversationDoc = server.doc(`conversations/${conversation}`);
    await conversationDoc.set({ participants: [a.uid, b.uid], lastMessage: 'Hello from B', lastMessageAt: AdminTimestamp.now(), lastSenderId: b.uid, unreadBy: a.uid });
    const sent = async (text: string) => (await server.collection('messages').where('conversationId', '==', conversation).where('text', '==', text).get()).size;

    await t.test('a participant sees the inbox, the unread count and the conversation, and can mark it read', async () => {
      signIn(a);
      const inbox = await first<{ id: string; participants: string[]; lastMessage: string; lastSenderId: string; unreadBy: string }[]>((next, fail) => messaging.onConversations(a.uid, next, fail));
      assert.deepEqual(inbox.map(c => [c.id, c.participants, c.lastMessage, c.lastSenderId, c.unreadBy]), [[conversation, [a.uid, b.uid], 'Hello from B', b.uid, a.uid]]);
      assert.equal(await messaging.getUnreadConversationCount(a.uid), 1);
      assert.equal(await first<number>((next, fail) => messaging.onUnreadConversationCount(a.uid, next, fail)), 1);
      const opened = await first<{ unreadBy: string } | null>((next, fail) => messaging.onConversation(conversation, next, fail));
      assert.equal(opened?.unreadBy, a.uid);
      await messaging.markConversationRead(conversation);
      assert.equal((await conversationDoc.get()).data()?.unreadBy, '');
      assert.equal(await messaging.getUnreadConversationCount(a.uid), 0);
    });

    await t.test('sending saves the message and the preview together and asks for one email', async () => {
      signIn(a);
      const saved = await messaging.sendMessage(conversation, a.uid, 'Hello from the phone', b.uid);
      const stored = (await server.doc(`messages/${saved.messageId}`).get()).data();
      assert.deepEqual(Object.keys(stored || {}).sort(), ['conversationId', 'createdAt', 'senderId', 'text']);
      assert.equal(stored?.conversationId, conversation);
      assert.equal(stored?.senderId, a.uid);
      assert.equal(stored?.text, 'Hello from the phone');
      const preview = (await conversationDoc.get()).data();
      assert.equal(preview?.lastMessage, 'Hello from the phone');
      assert.equal(preview?.lastSenderId, a.uid);
      assert.equal(preview?.unreadBy, b.uid);
      assert.deepEqual(notified.at(-1)?.slice(0, 2), [saved.messageId, a.uid]);
      assert.equal((await saved.notification).state, 'accepted');

      signIn(b);
      const messages = await first<{ id: string; text: string; senderId: string }[]>((next, fail) => messaging.onMessages(conversation, next, fail));
      assert.ok(messages.some(m => m.id === saved.messageId && m.text === 'Hello from the phone' && m.senderId === a.uid));
      assert.equal(await messaging.getUnreadConversationCount(b.uid), 1);
    });

    await t.test('the longest messages and emoji previews stay within the rules', async () => {
      signIn(b);
      for (const text of ['ᐊ'.repeat(5000), '\u{1F600}'.repeat(2500), `${'a'.repeat(79)}\u{1F600} and more`]) {
        await messaging.sendMessage(conversation, b.uid, text, a.uid);
        assert.equal((await conversationDoc.get()).data()?.lastMessage, messaging.messagePreview(text));
      }
      await assert.rejects(messaging.sendMessage(conversation, b.uid, 'x'.repeat(5001), a.uid), /1 to 5,000/);
    });

    await t.test('outsiders can neither read nor write the conversation', async () => {
      signIn(outsider);
      await assert.rejects(first((next, fail) => messaging.onConversation(conversation, next, fail)), denied);
      await assert.rejects(first((next, fail) => messaging.onMessages(conversation, next, fail)), denied);
      assert.deepEqual(await first((next, fail) => messaging.onConversations(outsider.uid, next, fail)), []);
      const before = (await conversationDoc.get()).data();
      await assert.rejects(messaging.sendMessage(conversation, outsider.uid, 'Injected', a.uid), denied);
      await assert.rejects(messaging.markConversationRead(conversation), denied);
      assert.deepEqual((await conversationDoc.get()).data(), before);
      assert.equal(await sent('Injected'), 0);
    });

    await t.test('a send the rules refuse in part saves nothing at all', async () => {
      signIn(a);
      const before = (await conversationDoc.get()).data();
      const emails = notified.length;
      // The message itself is allowed, but the preview must mark the other participant unread.
      await assert.rejects(messaging.sendMessage(conversation, a.uid, 'Wrong recipient', outsider.uid), denied);
      assert.equal(await sent('Wrong recipient'), 0);
      assert.deepEqual((await conversationDoc.get()).data(), before);
      assert.equal(notified.length, emails);
    });

    await t.test('a member who turned off direct messages receives nothing until they turn them back on', async () => {
      const settings = server.doc(`member_settings/${b.uid}`);
      await settings.set({ userId: b.uid, allowDirectMessages: false });
      signIn(a);
      await assert.rejects(messaging.sendMessage(conversation, a.uid, 'Blocked', b.uid), denied);
      assert.equal(await sent('Blocked'), 0);
      signIn(b);
      await messaging.sendMessage(conversation, b.uid, 'Still able to write', a.uid);
      await settings.update({ allowDirectMessages: true });
      signIn(a);
      await messaging.sendMessage(conversation, a.uid, 'Allowed again', b.uid);
      assert.equal(await sent('Allowed again'), 1);
    });
  } finally {
    await Promise.all(dbs.map(db => terminate(db)));
    await Promise.all(apps.map(app => deleteApp(app)));
    await deleteAdmin(admin);
  }
});

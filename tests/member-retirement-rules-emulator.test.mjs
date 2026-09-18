import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, collection, getDocFromServer, getDocsFromServer, setDoc, updateDoc, terminate } from 'firebase/firestore';

const denied = error => error.code === 'permission-denied';
test('member retirement direct-client boundaries preserve private workflows and archives', { skip: process.env.IOPPS_TEST_MEMBER_RETIREMENT !== 'true' }, async t => {
  const projectId = 'demo-iopps-preview';
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  const ports = {};
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
    assert.match(process.env[key] || '', /^127\.0\.0\.1:\d+$/);
    ports[key] = Number(process.env[key].split(':')[1]);
  }
  const prefix = 'retirement-' + crypto.randomUUID();
  const admin = initializeAdmin({ projectId }, prefix), db = adminFirestore(admin), auth = adminAuth(admin);
  const apps = [], identities = [], paths = new Set();
  async function seed(c, id, data) { paths.add(`${c}/${id}`); await db.doc(`${c}/${id}`).set(data); }
  async function actor(suffix, claims = {}) {
    const uid = prefix + suffix;
    await auth.createUser({ uid }); identities.push(uid);
    const app = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, uid); apps.push(app);
    const a = getAuth(app); connectAuthEmulator(a, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    const client = getFirestore(app); connectFirestoreEmulator(client, '127.0.0.1', ports.FIRESTORE_EMULATOR_HOST);
    await signInWithCustomToken(a, await auth.createCustomToken(uid, claims));
    await seed('users', uid, { role: 'community', status: 'active' });
    await seed('members', uid, { displayName: suffix, resumeUrl: 'PRIVATE_RESUME', email: 'private@example.invalid' });
    return { uid, db: client };
  }
  try {
    const owner = await actor('-owner'), peer = await actor('-peer'), outsider = await actor('-outsider'), staff = await actor('-admin', { admin: true });
    const anonymousApp = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, prefix + '-anonymous'); apps.push(anonymousApp);
    const anonymous = { db: getFirestore(anonymousApp) }; connectFirestoreEmulator(anonymous.db, '127.0.0.1', ports.FIRESTORE_EMULATOR_HOST);
    for (const c of ['connections', 'endorsements', 'mentor_profiles', 'mentorship_requests']) {
      const data = { followerId: owner.uid, followingId: peer.uid, endorserId: owner.uid, targetUserId: peer.uid, mentorId: peer.uid, menteeId: owner.uid, displayName: 'Historical fixture' };
      await seed(c, prefix, data);
      await t.test(`${c} no longer exposes peers or accepts social writes; archived bytes survive`, async () => {
        for (const viewer of [owner, peer, outsider, anonymous, staff]) {
          if (c !== 'mentorship_requests' && viewer === staff) {
            assert.equal((await getDocFromServer(doc(viewer.db, c, prefix))).exists(), true);
          } else {
            await assert.rejects(getDocFromServer(doc(viewer.db, c, prefix)), denied);
            await assert.rejects(getDocsFromServer(collection(viewer.db, c)), denied);
          }
          await assert.rejects(setDoc(doc(viewer.db, c, prefix), data), denied);
        }
        paths.add(`${c}/${owner.uid}`);
        await assert.rejects(setDoc(doc(owner.db, c, owner.uid), data), denied);
        assert.deepEqual((await db.doc(`${c}/${prefix}`).get()).data(), data);
      });
    }
    await t.test('own account/resume remains readable and editable; peers cannot get/list full profiles', async () => {
      for (const c of ['members', 'users']) {
        assert.equal((await getDocFromServer(doc(owner.db, c, owner.uid))).exists(), true);
        await updateDoc(doc(owner.db, c, owner.uid), { displayName: 'Edited own name' });
        for (const viewer of [peer, outsider, staff, anonymous]) {
          await assert.rejects(getDocFromServer(doc(viewer.db, c, owner.uid)), denied);
          await assert.rejects(getDocsFromServer(collection(viewer.db, c)), denied);
        }
      }
      assert.equal((await getDocFromServer(doc(owner.db, 'members', owner.uid))).data().resumeUrl, 'PRIVATE_RESUME');
    });
    await t.test('existing participants read/send/mark read, but cannot manufacture new lookup relationships', async () => {
      const data = { participants: [owner.uid, peer.uid], unreadBy: owner.uid };
      await seed('conversations', prefix, data);
      assert.equal((await getDocFromServer(doc(owner.db, 'conversations', prefix))).exists(), true);
      await assert.rejects(getDocFromServer(doc(outsider.db, 'conversations', prefix)), denied);
      await updateDoc(doc(owner.db, 'conversations', prefix), { unreadBy: '' });
      await assert.rejects(updateDoc(doc(owner.db, 'conversations', prefix), { participants: [owner.uid, outsider.uid] }), denied);
      const forged = prefix + '-forged'; paths.add(`conversations/${forged}`);
      await assert.rejects(setDoc(doc(owner.db, 'conversations', forged), { participants: [owner.uid, outsider.uid] }), denied);
      paths.add(`messages/${prefix}`);
      await setDoc(doc(owner.db, 'messages', prefix), { conversationId: prefix, senderId: owner.uid, text: 'Private fixture' });
      assert.equal((await getDocFromServer(doc(peer.db, 'messages', prefix))).data().text, 'Private fixture');
      await assert.rejects(getDocFromServer(doc(outsider.db, 'messages', prefix)), denied);
    });
  } finally {
    for (const path of paths) await db.doc(path).delete();
    for (const app of apps) { await terminate(getFirestore(app)); await deleteApp(app); }
    for (const uid of identities) await auth.deleteUser(uid);
    await db.terminate(); await deleteAdmin(admin);
  }
});

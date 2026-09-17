import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, setDoc, updateDoc, deleteDoc, terminate } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

const denied = error => error.code === 'permission-denied';
const storageDenied = error => error.code === 'storage/unauthorized';
test('database privacy boundaries apply to direct client requests, including signed administrators', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async t => {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
  Object.assign(process.env, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' });
  const projectId = 'demo-iopps-preview', prefix = 'privacy-' + crypto.randomUUID();
  const admin = initializeAdmin({ projectId }, prefix), db = adminFirestore(admin), auth = adminAuth(admin);
  const apps = [], identities = [], paths = new Set();
  async function seed(collection, id, data) { paths.add(`${collection}/${id}`); await db.doc(`${collection}/${id}`).set(data); }
  async function actor(suffix, claims = {}, email) {
    const uid = prefix + suffix;
    await auth.createUser({ uid, email: email || uid + '@example.invalid', emailVerified: true }); identities.push(uid);
    await auth.setCustomUserClaims(uid, claims);
    const app = initializeApp({ projectId, apiKey: 'fictional-key', storageBucket: projectId + '.appspot.com' }, uid); apps.push(app);
    const clientAuth = getAuth(app); connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const client = getFirestore(app); connectFirestoreEmulator(client, '127.0.0.1', 8080);
    const storage = getStorage(app); connectStorageEmulator(storage, '127.0.0.1', 9199);
    await signInWithCustomToken(clientAuth, await auth.createCustomToken(uid));
    await seed('users', uid, { status: 'active', role: 'community' });
    await seed('members', uid, { displayName: 'Fictional member', role: 'community', email: 'PRIVATE_CONTACT', resumeUrl: 'PRIVATE_RESUME' });
    return { uid, db: client, storage };
  }
  try {
    const owner = await actor('-owner', { admin: true }, 'nathan.arias@iopps.ca');
    const staff = await actor('-staff', { admin: true });
    const applicant = await actor('-candidate'), outsider = await actor('-outsider'), employer = await actor('-employer');
    const org = prefix + '-organization';
    await seed('members', employer.uid, { role: 'employer', orgId: org, orgRole: 'owner' });
    for (const collection of ['organizations', 'employers']) await seed(collection, org, { name: 'Fictional organization', ownerId: owner.uid });

    await t.test('private account documents are self-only, even when another account is an admin', async () => {
      for (const collection of ['users', 'members']) {
        assert.equal((await getDocFromServer(doc(applicant.db, collection, applicant.uid))).exists(), true);
        for (const viewer of [outsider, employer, staff]) await assert.rejects(getDocFromServer(doc(viewer.db, collection, applicant.uid)), denied);
        await updateDoc(doc(applicant.db, collection, applicant.uid), { displayName: 'Safe own edit' });
        for (const patch of [{ role: 'admin' }, { admin: true }, { isSuperAdmin: true }, { orgId: org, orgRole: 'owner' }, { status: 'suspended' }, { deletedAt: null }]) await assert.rejects(updateDoc(doc(applicant.db, collection, applicant.uid), patch), denied);
      }
    });
    await t.test('direct clients cannot perform privileged account or organization deletion', async () => {
      for (const viewer of [staff, owner]) {
        for (const collection of ['users', 'members']) {
          await assert.rejects(deleteDoc(doc(viewer.db, collection, owner.uid)), denied);
          await assert.rejects(updateDoc(doc(viewer.db, collection, owner.uid), { role: 'member', status: 'suspended' }), denied);
        }
        for (const collection of ['organizations', 'employers']) await assert.rejects(deleteDoc(doc(viewer.db, collection, org)), denied);
      }
    });
    await t.test('drafts and full application records require authorized API projections', async () => {
      for (const collection of ['jobs', 'posts', 'organizationOpportunityDrafts']) {
        await seed(collection, prefix, { orgId: org, employerId: org, status: 'draft', title: 'PRIVATE_DRAFT' });
        for (const viewer of [applicant, outsider, employer, staff, owner]) await assert.rejects(getDocFromServer(doc(viewer.db, collection, prefix)), denied);
      }
      await seed('applications', prefix, { userId: applicant.uid, orgId: org, employerId: org, status: 'submitted', reviewerNote: 'PRIVATE_NOTE' });
      for (const viewer of [applicant, outsider, employer, staff, owner]) {
        await assert.rejects(getDocFromServer(doc(viewer.db, 'applications', prefix)), denied);
        await assert.rejects(updateDoc(doc(viewer.db, 'applications', prefix), { status: 'offered' }), denied);
      }
    });
    await t.test('empty organization ids and profile-only admin roles cannot grant access', async () => {
      await seed('members', outsider.uid, { orgId: '', orgRole: 'owner', role: 'admin' });
      for (const collection of ['events', 'scholarships']) {
        await seed(collection, prefix, { orgId: '', status: 'draft', title: 'PRIVATE_DRAFT' });
        await assert.rejects(getDocFromServer(doc(outsider.db, collection, prefix)), denied);
        await assert.rejects(updateDoc(doc(outsider.db, collection, prefix), { title: 'Forged admin' }), denied);
        await updateDoc(doc(staff.db, collection, prefix), { title: 'Legitimate signed admin correction' });
      }
    });
    await t.test('suspended accounts cannot read private records or restore their own access', async () => {
      await db.doc(`users/${outsider.uid}`).update({ status: 'suspended' });
      await assert.rejects(getDocFromServer(doc(outsider.db, 'members', outsider.uid)), denied);
      await assert.rejects(updateDoc(doc(outsider.db, 'users', outsider.uid), { status: 'active' }), denied);
      await db.doc(`users/${outsider.uid}`).update({ status: 'active' });
    });
    await t.test('private conversations cannot be read, joined, or injected into by another user', async () => {
      const conversation = prefix + '-conversation';
      await seed('conversations', conversation, { participants: [applicant.uid, employer.uid], unreadBy: applicant.uid });
      await assert.rejects(getDocFromServer(doc(outsider.db, 'conversations', conversation)), denied);
      await assert.rejects(updateDoc(doc(applicant.db, 'conversations', conversation), { participants: [applicant.uid, outsider.uid] }), denied);
      await assert.rejects(setDoc(doc(outsider.db, 'messages', prefix), { conversationId: conversation, senderId: outsider.uid, text: 'Injected' }), denied);
      paths.add(`messages/${prefix}`);
      await setDoc(doc(applicant.db, 'messages', prefix), { conversationId: conversation, senderId: applicant.uid, text: 'Fictional test message' });
      assert.equal((await getDocFromServer(doc(employer.db, 'messages', prefix))).exists(), true);
      await assert.rejects(setDoc(doc(outsider.db, 'mail', prefix), { to: 'arbitrary@example.invalid', message: { text: 'Bypass' } }), denied);
    });
    await t.test('brand uploads cannot overwrite another account and resumes remain owner-only', async () => {
      for (const folder of ['org-logos', 'org-banners']) {
        const own = ref(applicant.storage, `${folder}/${applicant.uid}`);
        await uploadBytes(own, new Uint8Array([137, 80, 78, 71]), { contentType: 'image/png' });
        await assert.rejects(uploadBytes(ref(outsider.storage, `${folder}/${applicant.uid}`), new Uint8Array([1]), { contentType: 'image/png' }), storageDenied);
        // Storage fixture cleanup uses the same guarded demo bucket via Admin SDK.
      }
      const resume = `resumes/${applicant.uid}/test.pdf`;
      await uploadBytes(ref(applicant.storage, resume), new TextEncoder().encode('%PDF-1.4 fictional'), { contentType: 'application/pdf' });
      await assert.rejects(getBytes(ref(outsider.storage, resume)), storageDenied);
      await assert.rejects(deleteObject(ref(outsider.storage, resume)), storageDenied);
      await deleteObject(ref(applicant.storage, resume));
      await assert.rejects(uploadBytes(ref(applicant.storage, `livestream-promos/${applicant.uid}/test.png`), new Uint8Array([1]), { contentType: 'image/png' }), storageDenied);
    });
  } finally {
    for (const path of paths) await db.recursiveDelete(db.doc(path));
    for (const app of apps) { await terminate(getFirestore(app)); await deleteApp(app); }
    for (const uid of identities) await auth.deleteUser(uid);
    const { getStorage } = await import('firebase-admin/storage');
    const bucket = getStorage(admin).bucket(projectId + '.appspot.com');
    for (const uid of identities) for (const folder of ['org-logos', 'org-banners']) await bucket.file(`${folder}/${uid}`).delete({ ignoreNotFound: true });
    await db.terminate(); await deleteAdmin(admin);
  }
});

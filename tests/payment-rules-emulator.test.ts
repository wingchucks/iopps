import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, getDoc, deleteField, terminate } from 'firebase/firestore';

const denied = (e: unknown) => (e as { code?: string }).code === 'permission-denied';
test('payment rules: server-owned billing with compatible owner profile updates', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async (t) => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  const projectId = 'demo-iopps-billing-rules';
  const response = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  assert.equal(response.status, 200, await response.text());
  const admin = initializeAdmin({ projectId }, 'billing-rules');
  const server = getAdminDb(admin);
  const client = initializeApp({ projectId, apiKey: 'fictional-emulator-key' }, 'billing-rules');
  const auth = getAuth(client); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(client); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const user = (await signInAnonymously(auth)).user;
  const uid = user.uid;
  const employer = doc(db, 'employers', uid);
  const org = doc(db, 'organizations', uid);
  const receipt = doc(db, 'subscriptions', uid);
  try {
    await t.test('owner can create a non-billing profile', async () => {
      await setDoc(employer, { name: 'Fictional organization', uid, id: uid, contactEmail: 'fictional@example.invalid' });
      await setDoc(org, { name: 'Fictional organization', type: 'business', contactName: 'Test', contactEmail: 'fictional@example.invalid', onboardingComplete: false, plan: null, createdAt: new Date(), updatedAt: new Date() });
      await server.doc(`members/${uid}`).set({ role: 'employer', orgId: uid, orgRole: 'owner' });
    });
    await t.test('owner cannot mint any credit or subscription field', async () => {
      for (const [field, value] of Object.entries({ standardPostCredits: 100, featuredPostCredits: 100, programPostCredits: 100, plan: 'premium', subscriptionTier: 'school', subscriptionStatus: 'active', subscriptionEnd: new Date(), tier: 'premium' })) {
        await assert.rejects(updateDoc(employer, { [field]: value }), denied, field);
        await assert.rejects(updateDoc(org, { [field]: value }), denied, `organization ${field}`);
      }
    });
    await t.test('paid and ownership fields cannot be injected during creation', async () => {
      await server.doc(`employers/${uid}`).delete();
      await assert.rejects(setDoc(employer, { name: 'Forged', featuredPostCredits: 100 }), denied);
      await assert.rejects(setDoc(employer, { name: 'Forged', uid: 'victim' }), denied);
      await server.doc(`organizations/${uid}`).delete();
      await assert.rejects(setDoc(org, { name: 'Forged', plan: 'school' }), denied);
      await assert.rejects(setDoc(org, { name: 'Forged', employerId: 'victim' }), denied);
    });
    await t.test('ordinary edits preserve server-issued billing and immutable ownership', async () => {
      const billing = { plan: 'premium', subscriptionTier: 'premium', featuredPostCredits: 2, subscriptionStatus: 'active' };
      await server.doc(`employers/${uid}`).set({ ...billing, uid, id: uid, name: 'Before' });
      await server.doc(`organizations/${uid}`).set({ ...billing, employerId: uid, name: 'Before' });
      for (const ref of [employer, org]) {
        await updateDoc(ref, { name: 'After', description: 'Profile edit', logoUrl: '/fictional.png', location: { city: 'Test' }, socialLinks: { linkedin: 'https://example.invalid' }, onboardingComplete: true, updatedAt: new Date() });
        assert.equal((await getDoc(ref)).data()?.featuredPostCredits, 2);
        await assert.rejects(updateDoc(ref, { featuredPostCredits: deleteField() }), denied);
        await assert.rejects(setDoc(ref, { name: 'Overwrite billing' }), denied);
        await assert.rejects(updateDoc(ref, { uid: 'victim', id: 'victim', employerId: 'victim' }), denied);
      }
    });
    await t.test('purchase records are server-only but readable by their owner', async () => {
      await assert.rejects(setDoc(receipt, { orgId: uid, status: 'active', plan: 'tier2' }), denied);
      await server.doc(`subscriptions/${uid}`).set({ orgId: uid, status: 'active', plan: 'tier2' });
      assert.equal((await getDoc(receipt)).data()?.plan, 'tier2');
      await assert.rejects(updateDoc(receipt, { status: 'active', amount: 0 }), denied);
      await assert.rejects(deleteDoc(receipt), denied);
      await assert.rejects(setDoc(doc(db, 'stripeWebhookEvents', uid), { status: 'completed' }), denied);
    });
    await t.test('client admin cannot silently change billing outside audited server paths', async () => {
      await server.doc(`members/${uid}`).set({ role: 'admin' });
      await assert.rejects(updateDoc(employer, { featuredPostCredits: 200 }), denied);
      await assert.rejects(updateDoc(org, { plan: 'school' }), denied);
      await assert.rejects(updateDoc(receipt, { amount: 0 }), denied);
    });
  } finally {
    for (const collection of ['members', 'employers', 'organizations', 'subscriptions', 'stripeWebhookEvents']) await server.doc(`${collection}/${uid}`).delete();
    await deleteUser(user); await terminate(db); await deleteApp(client); await server.terminate(); await deleteAdmin(admin);
  }
});

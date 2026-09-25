import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { publicContactMigration } from '../scripts/migrate-public-contact-email.mjs';
import { normalizeOrganizationProfilePatch } from '../src/lib/organization-profile.ts';

class EmployerApiError extends Error { constructor(status, message) { super(message); this.status = status; } }

test('owners edit the opt-in public email; the private account email is not editable through the profile', () => {
  const { updates, touchedFields } = normalizeOrganizationProfilePatch({ publicContactEmail: ' team@example.invalid ', contactEmail: 'changed@example.invalid' });
  assert.deepEqual(updates, { publicContactEmail: 'team@example.invalid' });
  assert.deepEqual(touchedFields, ['publicContactEmail']);
  assert.deepEqual(normalizeOrganizationProfilePatch({ publicContactEmail: '' }).updates, { publicContactEmail: '' }, 'blank hides the email');
});

test('the profile route rejects an invalid public email before any write', async () => {
  let dbUsed = false;
  const { PUT } = sourceModule('src/app/api/employer/profile/route.ts', { mocks: {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': { getAdminDb: () => { dbUsed = true; throw new Error('database must not be used'); } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } },
    '@/lib/server/employer-auth': { EmployerApiError, requireEmployerContext: async () => ({ uid: 'owner', orgId: 'org', employerId: 'org', orgRole: 'owner' }) },
    '@/lib/server/business-listing-review': { recordReviewChange() {}, reviewError: error => Response.json({ error: error.message }, { status: error.status ?? 500 }) },
  } });
  const response = await PUT(new Request('http://localhost/api/employer/profile', { method: 'PUT', body: JSON.stringify({ publicContactEmail: 'not an email' }) }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid public contact email/);
  assert.equal(dbUsed, false);
});

test('migration keeps deliberately chosen emails public and hides copies of sign-in emails', () => {
  const owners = new Set(['owner@example.invalid']);
  assert.deepEqual(publicContactMigration({ contactEmail: 'Owner@Example.invalid' }, owners), { publicContactEmail: '', reason: 'copy-of-sign-in-email' });
  assert.deepEqual(publicContactMigration({ contactEmail: ' bookings@example.invalid ' }, owners), { publicContactEmail: 'bookings@example.invalid', reason: 'kept-deliberate-email' });
  assert.deepEqual(publicContactMigration({ contactEmail: 'not-an-email' }, owners), { publicContactEmail: '', reason: 'no-valid-email' });
  assert.deepEqual(publicContactMigration({}, owners), { publicContactEmail: '', reason: 'no-valid-email' });
  assert.equal(publicContactMigration({ contactEmail: 'owner@example.invalid', publicContactEmail: '' }, owners), null, 'explicit records are never touched');
  assert.deepEqual(publicContactMigration({ contactEmail: 'listing@example.invalid' }, new Set()), { publicContactEmail: 'listing@example.invalid', reason: 'kept-deliberate-email' }, 'a listing without an owner account keeps its email');
});

test('migration script: dry run writes nothing, apply is idempotent and prints no email addresses', { skip: process.env.IOPPS_TEST_EMULATORS !== 'true' }, async () => {
  const project = 'demo-iopps-contact-migration';
  const env = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', GCLOUD_PROJECT: project };
  Object.assign(process.env, { FIRESTORE_EMULATOR_HOST: env.FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST: env.FIREBASE_AUTH_EMULATOR_HOST });
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');
  const app = initializeApp({ projectId: project }, `contact-migration-${Date.now()}`);
  const db = getFirestore(app), auth = getAuth(app);
  const run = (...args) => spawnSync(process.execPath, ['scripts/migrate-public-contact-email.mjs', '--project', project, ...args], { env, encoding: 'utf8' });
  const docs = [['organizations', 'org-copy'], ['employers', 'org-copy'], ['users', 'org-copy'], ['organizations', 'org-deliberate'], ['organizations', 'org-explicit']];
  try {
    await auth.createUser({ uid: 'org-copy', email: 'owner1@example.invalid' });
    await auth.createUser({ uid: 'org-deliberate', email: 'owner2@example.invalid' });
    await db.doc('users/org-copy').set({ email: 'owner1@example.invalid' });
    await db.doc('organizations/org-copy').set({ name: 'Copy', contactEmail: 'owner1@example.invalid' });
    await db.doc('employers/org-copy').set({ name: 'Copy', contactEmail: 'owner1@example.invalid' });
    await db.doc('organizations/org-deliberate').set({ name: 'Deliberate', contactEmail: 'bookings@example.invalid' });
    await db.doc('organizations/org-explicit').set({ name: 'Explicit', contactEmail: 'x@example.invalid', publicContactEmail: 'shown@example.invalid' });

    const dry = run();
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(/@/.test(dry.stdout), false, 'output never includes email addresses');
    assert.equal('publicContactEmail' in (await db.doc('organizations/org-copy').get()).data(), false, 'dry run writes nothing');

    const applied = run('--apply');
    assert.equal(applied.status, 0, applied.stderr);
    const read = async path => (await db.doc(path).get()).data();
    assert.equal((await read('organizations/org-copy')).publicContactEmail, '');
    assert.equal((await read('employers/org-copy')).publicContactEmail, '');
    assert.equal((await read('organizations/org-copy')).contactEmail, 'owner1@example.invalid', 'the private account email is unchanged');
    assert.equal((await read('organizations/org-deliberate')).publicContactEmail, 'bookings@example.invalid');
    assert.equal((await read('organizations/org-explicit')).publicContactEmail, 'shown@example.invalid');
    const again = run('--apply');
    assert.match(again.stdout, /"skipped": 3/, 'a second run changes nothing');
  } finally {
    for (const [collection, id] of docs) await db.doc(`${collection}/${id}`).delete();
    for (const uid of ['org-copy', 'org-deliberate']) await auth.deleteUser(uid).catch(() => {});
    await deleteApp(app);
  }
});

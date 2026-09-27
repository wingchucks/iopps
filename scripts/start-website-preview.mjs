// Local review preview of the built website against the isolated demo emulators.
// Seeds clearly labelled fictional demo records through the app's own APIs, then
// keeps `next start` running on http://127.0.0.1:3100 until stopped (Ctrl+C).
// Nothing here touches production Firebase, Stripe or email providers.
//
// Run (emulators must already be running, see CLAUDE.md):
//   node scripts/run-isolated-qa.mjs --emulators node scripts/start-website-preview.mjs
//
// Fictional emulator-only sign-ins for the review (password shared by all):
//   preview-demo-person@example.invalid    individual who also owns "Preview Demo Café"
//   preview-demo-applicant@example.invalid individual job seeker with an application
export const PREVIEW_PASSWORD = 'Preview-demo-only-2026!';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
const port = Number(process.env.PREVIEW_PORT || 3100), base = `http://127.0.0.1:${port}`, bucketName = 'demo-iopps-preview.appspot.com';
const app = initializeApp({ projectId: 'demo-iopps-preview', storageBucket: bucketName }, 'website-preview');
const auth = getAuth(app), db = getFirestore(app), bucket = getStorage(app).bucket(bucketName);

const env = {};
for (const key of ['SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PROGRAMFILES', 'PROGRAMDATA']) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, {
  NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', GCLOUD_PROJECT: 'demo-iopps-preview', NEXT_PUBLIC_USE_EMULATORS: 'true',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-iopps-preview', NEXT_PUBLIC_FIREBASE_API_KEY: 'fictional-emulator-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-iopps-preview.firebaseapp.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucketName,
  NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'false', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
});
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'inherit'] });
server.stdout.on('data', chunk => process.stdout.write(chunk));
process.on('SIGINT', () => { server.kill(); process.exit(0); });
for (let i = 0; i < 120; i++) { try { if ((await fetch(base + '/api/launch-status')).ok) break; } catch { /* starting */ } await new Promise(r => setTimeout(r, 500)); }

async function token(uid) {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: await auth.createCustomToken(uid), returnSecureToken: true }) });
  return (await r.json()).idToken;
}
async function api(method, route, uid, body) {
  const r = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + await token(uid), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 409) throw new Error(`${method} ${route} → ${r.status} ${JSON.stringify(data)}`);
  return data;
}
async function person(key, displayName, extra = {}) {
  const email = `preview-demo-${key}@example.invalid`;
  const user = await auth.getUserByEmail(email).catch(() => auth.createUser({ email, password: PREVIEW_PASSWORD, emailVerified: true, displayName }));
  for (const collection of ['users', 'members']) {
    const ref = db.doc(`${collection}/${user.uid}`);
    if (!(await ref.get()).exists) await ref.set({ uid: user.uid, email, displayName, role: 'community', setupComplete: true, onboardingComplete: true, community: 'Preview Demo Community', location: 'Saskatoon, SK', ...extra });
  }
  return user;
}
async function uploaded(objectName, contentType, bytes) {
  const downloadToken = crypto.randomUUID();
  await bucket.file(objectName).save(bytes, { contentType, metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } } });
  return `http://127.0.0.1:9199/v0/b/${bucketName}/o/${encodeURIComponent(objectName)}?alt=media&token=${downloadToken}`;
}

const seeded = await db.doc('previewDemo/state').get();
if (!seeded.exists) {
  const admin = await person('reviewer', 'Preview Demo Reviewer', { role: 'admin' });
  await auth.setCustomUserClaims(admin.uid, { admin: true, role: 'admin' });
  const owner = await person('person', 'Preview Demo Person', { headline: 'Community coordinator (demo)', bio: 'Fictional person who also runs a café, for the website review.' });
  const applicant = await person('applicant', 'Preview Demo Applicant', { headline: 'Barista and cook (demo)' });
  const resume = await uploaded(`resumes/${applicant.uid}/preview-demo-resume.pdf`, 'application/pdf', Buffer.from('%PDF-1.4\n% Preview demo résumé\n%%EOF'));
  await db.doc('members/' + applicant.uid).update({ resumeUrl: resume, resumeFileName: 'preview-demo-resume.pdf', resumeUploadedAt: new Date().toISOString() });

  // One login: the person adds an organization workspace with the same account.
  await api('POST', '/api/employer/upgrade', owner.uid, { name: 'Preview Demo Café', type: 'employer', website: 'https://example.invalid/preview-cafe', location: 'Saskatoon, Saskatchewan', description: 'Fictional Indigenous-owned café used only for this website review. Bannock, soup and coffee.' });
  const logo = await uploaded(`org-logos/${owner.uid}.png`, 'image/png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
  await api('PUT', '/api/employer/profile', owner.uid, { logoUrl: logo, businessIdentity: 'indigenous', contactEmail: 'preview-cafe@example.invalid' });
  await api('POST', '/api/employer/onboarding/complete', owner.uid, {});
  const review = await api('GET', '/api/employer/business-review', owner.uid);
  const submitted = await api('POST', '/api/employer/business-review', owner.uid, { revision: review.review?.revision ?? review.revision });
  await api('POST', '/api/admin/business-reviews', admin.uid, { orgId: owner.uid, revision: submitted.review.revision, status: 'pending', action: 'approve' });

  const jobId = 'preview-demo-barista';
  await db.doc('jobs/' + jobId).set({ title: 'Barista (Preview Demo)', employerId: owner.uid, orgId: owner.uid, employerName: 'Preview Demo Café', orgName: 'Preview Demo Café', location: 'Saskatoon, SK', description: 'Fictional job for the website review. Serve coffee and bannock to the community.', category: 'Hospitality', employmentType: 'Part-time', active: true, status: 'active', applicationMethod: 'iopps', requiresResume: true, closingDate: '2099-12-31', createdAt: new Date() });
  await api('POST', '/api/applications', applicant.uid, { postId: jobId, resumeUrl: resume, resumeType: 'file', resumeFileName: 'preview-demo-resume.pdf', coverLetter: 'Fictional cover letter: I would love to work at the café.' });
  for (const [kind, body] of [
    ['events', { title: 'Preview Demo Round Dance', eventType: 'Round Dance', description: 'Fictional community round dance for the website review.', startDate: '2027-02-13', startTime: '18:00', endTime: '23:00', timeZone: 'America/Regina', city: 'Saskatoon', province: 'SK', venue: 'Preview Demo Hall', rsvpLink: 'https://example.invalid/round-dance', contactEmail: 'preview-cafe@example.invalid' }],
    ['scholarships', { title: 'Preview Demo Culinary Bursary', category: 'Bursary', description: 'Fictional bursary for the website review.', amount: '$1,000', deadlineType: 'date', deadline: '2027-04-30', eligibility: 'Fictional culinary students.', applicationUrl: 'https://example.invalid/bursary', applicationInstructions: 'Send a short statement.' }],
  ]) await api('POST', '/api/employer/' + kind, owner.uid, { ...body, status: 'active', requestId: 'preview-demo-' + kind + '-000001' });
  await db.doc('previewDemo/state').set({ seededAt: new Date(), note: 'Fictional preview demo data in the demo emulator only.' });
}
console.log(`\nIOPPS website preview: ${base}\nSign-ins are listed at the top of scripts/start-website-preview.mjs (fictional, emulator only). Ctrl+C to stop.\n`);
await new Promise(resolve => server.once('exit', resolve));

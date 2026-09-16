// Real HTTP hiring journey against isolated Firebase emulators. Never uses live credentials.
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { startIsolatedQaServer } from './local-qa-server.mjs';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview', 'Run with the demo-iopps-preview emulator project');
Object.assign(process.env, {
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
});
const projectId = 'demo-iopps-preview';
const bucketName = projectId + '.appspot.com';
const admin = initializeAdmin({ projectId }, 'hiring-journey');
const db = getFirestore(admin), auth = getAdminAuth(admin);
const prefix = 'qa-hiring-' + crypto.randomUUID();
const employerId = prefix + '-employer', candidateId = prefix + '-candidate', secondId = prefix + '-second';
const jobId = prefix + '-job';
const appId = candidateId + '_' + jobId;
const client = initializeApp({ projectId, apiKey: 'fictional-emulator-key', storageBucket: bucketName }, 'hiring-journey');
const candidateAuth = getAuth(client);
connectAuthEmulator(candidateAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
const storage = getStorage(client);
connectStorageEmulator(storage, '127.0.0.1', 9199);
let server, archivePath;
const checks = [];
const passed = message => { checks.push(message); console.log('PASS ' + message); };

async function createIdentity(uid) {
  await auth.createUser({ uid, email: uid + '@example.invalid', emailVerified: true });
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await auth.createCustomToken(uid), returnSecureToken: true }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  return result.idToken;
}

try {
  server = await startIsolatedQaServer();
  async function request(method, path, token, body) {
    const response = await fetch(server.base + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  }
  const employerToken = await createIdentity(employerId);
  const signup = {
    name: 'Prairie Pathways ' + prefix, type: 'business', contactName: 'Fictional Hiring Manager',
    contactEmail: employerId + '@example.invalid',
    description: 'Fictional community services organization used only in the isolated hiring test.',
    location: { city: 'Saskatoon', province: 'Saskatchewan' },
    logoUrl: 'https://example.invalid/fictional-logo.png',
    capabilities: ['post_jobs', 'list_business'], onboardingComplete: true,
    formStartedAt: Date.now() - 60000,
  };
  assert.equal((await request('POST', '/api/employer/signup', null, signup)).status, 401);
  const registered = await request('POST', '/api/employer/signup', employerToken, signup);
  assert.equal(registered.status, 200, JSON.stringify(registered));
  assert.equal((await request('GET', '/api/auth/account', employerToken)).data.destination, '/org/dashboard');
  assert.equal((await request('GET', '/api/employer/dashboard', employerToken)).status, 200);
  passed('Organization signup and one-account dashboard routing');

  // A lost response or a second tab must never reset existing organization entitlements.
  await db.doc(`employers/${employerId}`).update({ featuredPostCredits: 2, plan: 'test-existing-plan' });
  const originalOrganization = (await db.doc(`organizations/${employerId}`).get()).data();
  const repeatedSignup = await request('POST', '/api/employer/signup', employerToken, signup);
  assert.equal(repeatedSignup.status, 200, JSON.stringify(repeatedSignup));
  const employer = (await db.doc(`employers/${employerId}`).get()).data();
  assert.equal(employer.featuredPostCredits, 2, 'Repeat signup must preserve existing credits');
  assert.equal(employer.plan, 'test-existing-plan');
  assert.deepEqual((await db.doc(`organizations/${employerId}`).get()).data(), originalOrganization);
  passed('Retrying signup preserves the existing organization and credits');
  await db.doc(`employers/${employerId}`).update({ plan: 'free' });

  const details = {
    territory: 'Treaty 6', territoryName: 'Saskatoon', criminalRecordCheck: 'Required after an offer',
    vulnerableSectorCheck: 'Not required', driversLicense: true, licenceClass: 'Class 5',
    willTrain: true, trainingDetails: 'Paid orientation', certifications: 'First Aid',
    schedule: 'Weekdays', supports: ['Mentorship', 'Paid training'], indigenousEncouraged: true,
  };
  const draft = await request('POST', '/api/employer/jobs', employerToken, {
    slug: jobId, title: 'Fictional Community Coordinator', status: 'draft',
    description: 'Isolated test role. No real applications or emails.',
    location: 'Saskatoon, Saskatchewan', employmentType: 'Full-time', workLocation: 'On-site',
    hiringDetails: details, requiresResume: true, requiresCoverLetter: true, requiresReferences: true,
  });
  assert.equal(draft.status, 200, JSON.stringify(draft));
  assert.equal((await request('GET', '/api/jobs', null)).data.jobs.some(job => job.id === jobId), false);
  const savedDraft = (await request('GET', `/api/employer/jobs/${jobId}`, employerToken)).data.job;
  assert.deepEqual(savedDraft.hiringDetails, details);
  passed('Draft stays private and retains province, treaty, checks, licence and training');
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, employerToken, { status: 'active' })).status, 200);
  const publicJob = (await request('GET', '/api/jobs', null)).data.jobs.find(job => job.id === jobId);
  assert.ok(publicJob, 'Published job must appear publicly');
  assert.deepEqual(publicJob.hiringDetails, details);
  passed('Publishing exposes the job with all hiring details');

  // Document requirements must remain editable after the first save.
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, employerToken, { requiresReferences: false })).status, 200);
  assert.equal((await request('GET', `/api/employer/jobs/${jobId}`, employerToken)).data.job.requiresReferences, false);
  passed('Editing application document requirements persists');

  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, employerToken, { applicationUrl: 'https://example.invalid/apply', closingDate: '2099-12-31' })).status, 200);
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, employerToken, { applicationUrl: '', closingDate: '' })).status, 200);
  const clearedJob = (await request('GET', `/api/employer/jobs/${jobId}`, employerToken)).data.job;
  assert.equal(clearedJob.applicationUrl, ''); assert.equal(clearedJob.externalApplyUrl, ''); assert.equal(clearedJob.closingDate, '');
  passed('External application links and deadlines can be cleared without leaving stale values');

  await createIdentity(candidateId);
  await signInWithCustomToken(candidateAuth, await auth.createCustomToken(candidateId));
  const candidateToken = await candidateAuth.currentUser.getIdToken();
  await db.doc(`users/${candidateId}`).set({ role: 'community' });
  await db.doc(`members/${candidateId}`).set({ role: 'community', displayName: 'Fictional Candidate' });
  assert.equal((await request('POST', '/api/applications', null, { postId: jobId })).status, 401);
  assert.equal((await request('POST', '/api/applications', candidateToken, { postId: jobId })).status, 422);
  const source = ref(storage, `resumes/${candidateId}/fictional.pdf`);
  await uploadBytes(source, new TextEncoder().encode('%PDF-1.4 fictional test resume'), { contentType: 'application/pdf' });
  const application = await request('POST', '/api/applications', candidateToken, {
    postId: jobId, resumeUrl: await getDownloadURL(source), resumeFileName: 'fictional.pdf', coverLetter: 'Fictional cover letter',
  });
  assert.equal(application.status, 201, JSON.stringify(application));
  const receipt = application.data.application;
  assert.equal(receipt.postId, jobId);
  assert.match(receipt.resumeUrl, /application-documents/);
  archivePath = decodeURIComponent(new URL(receipt.resumeUrl).pathname.split('/o/')[1]);
  await deleteObject(source);
  assert.equal(await (await fetch(receipt.resumeUrl)).text(), '%PDF-1.4 fictional test resume');
  passed('Required documents enforced; submitted résumé archived independently');

  const inbox = (await request('GET', '/api/employer/applications', employerToken)).data;
  assert.equal(inbox.applications.find(app => app.id === appId)?.resumeUrl, receipt.resumeUrl);
  assert.equal(inbox.profiles[candidateId].displayName, 'Fictional Candidate');
  passed('Employer receives the application, candidate and résumé in the dashboard');
  for (const status of ['reviewing', 'shortlisted', 'interview']) {
    assert.equal((await request('PUT', '/api/employer/applications', employerToken, { appId, status, reviewerNote: 'Private fictional review note' })).status, 200);
  }
  const reviewed = (await request('GET', '/api/employer/applications', employerToken)).data.applications.find(app => app.id === appId);
  assert.equal(reviewed.status, 'interview');
  assert.equal(reviewed.reviewerNote, 'Private fictional review note');
  assert.deepEqual(reviewed.statusHistory.map(entry => entry.status), ['submitted', 'reviewing', 'shortlisted', 'interview']);
  const candidateHistory = (await request('GET', '/api/applications', candidateToken)).data.applications;
  assert.equal(candidateHistory.find(app => app.id === appId).status, 'interview');
  assert.equal(JSON.stringify(candidateHistory).includes('Private fictional'), false);
  const repeated = await request('POST', '/api/applications', candidateToken, { postId: jobId });
  assert.equal(repeated.status, 200); assert.equal(repeated.data.created, false);
  assert.equal(repeated.data.application.resumeUrl, receipt.resumeUrl);
  assert.equal(JSON.stringify(repeated.data).includes('Private fictional'), false);
  passed('Review stages and notes persist; applicant sees status without private notes; retries do not duplicate');

  // Historical applications may contain only orgId; they still belong in the same inbox.
  await db.doc(`applications/${appId}`).update({ employerId: '' });
  assert.ok((await request('GET', '/api/employer/applications', employerToken)).data.applications.some(app => app.id === appId));
  passed('Existing organization-linked applications remain visible');

  const secondToken = await createIdentity(secondId);
  assert.equal((await request('PUT', '/api/employer/applications', secondToken, { appId, status: 'rejected' })).status, 403);
  assert.equal((await request('GET', '/api/applications?postId=' + jobId, secondToken)).data.application, null);
  passed('Another account cannot access or change the candidate application');
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, employerToken, { status: 'closed' })).status, 200);
  assert.equal((await request('GET', '/api/jobs', null)).data.jobs.some(job => job.id === jobId), false);
  const lateApplication = await request('POST', '/api/applications', secondToken, { postId: jobId });
  assert.equal(lateApplication.status, 422); assert.match(lateApplication.data.error, /no longer accepting/);
  assert.equal((await request('GET', '/api/applications?postId=' + jobId, candidateToken)).data.application.postId, jobId);
  passed('Closing removes the listing, stops new applications and preserves existing receipts');
  console.log(JSON.stringify({ projectId, checks, count: checks.length }, null, 2));
} finally {
  await Promise.allSettled([employerId, candidateId, secondId].flatMap(uid => [
    ...['users', 'members', 'employers', 'organizations'].map(collection => db.doc(`${collection}/${uid}`).delete()),
    auth.deleteUser(uid),
  ]));
  await Promise.allSettled([db.doc(`jobs/${jobId}`).delete(), db.doc(`posts/${jobId}`).delete(), db.doc(`applications/${appId}`).delete()]);
  if (archivePath) await getAdminStorage(admin).bucket(bucketName).file(archivePath).delete({ ignoreNotFound: true });
  await deleteApp(client); await db.terminate(); await deleteAdmin(admin); await server?.stop();
}

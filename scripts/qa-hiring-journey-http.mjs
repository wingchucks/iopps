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

assert.equal(process.env.IOPPS_TEST_EMULATORS, 'true');
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
const teamId = prefix + '-team';
const protectedOwnerId = prefix + '-protected-owner';
const directoryIds = Array.from({ length: 41 }, (_, index) => prefix + '-page-' + String(index).padStart(2, '0'));
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

async function createIdentity(uid, email = uid + '@example.invalid') {
  await auth.createUser({ uid, email, emailVerified: true });
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
  await db.doc(`jobs/${jobId}`).update({ privateNotes: 'PRIVATE_JOB_FIELD' });
  const publicJob = (await request('GET', '/api/jobs', null)).data.jobs.find(job => job.id === jobId);
  assert.equal(JSON.stringify(publicJob).includes('PRIVATE_JOB_FIELD'), false);
  assert.equal(JSON.stringify((await request('GET', '/api/jobs/' + jobId, null)).data).includes('PRIVATE_JOB_FIELD'), false);
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
  await db.doc(`members/${candidateId}`).set({ role: 'community', displayName: 'Fictional Candidate', email: 'PRIVATE_EMAIL', resumeUrl: 'PRIVATE_PROFILE_RESUME', salaryRange: { private: 'PRIVATE_SALARY' } });
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
  assert.equal(JSON.stringify(inbox.profiles).includes('PRIVATE_PROFILE_RESUME'), false);
  assert.equal(JSON.stringify(inbox.profiles).includes('PRIVATE_SALARY'), false);
  passed('Employer receives the application, candidate and submitted résumé without unrelated private profile data');
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
  assert.equal((await request('POST', '/api/employer/signup', secondToken, { ...signup, name: 'Different fictional employer', contactEmail: secondId + '@example.invalid' })).status, 200);
  assert.equal((await request('GET', '/api/employer/applications', secondToken)).data.applications.length, 0);
  assert.equal((await request('PUT', '/api/employer/applications', secondToken, { appId, status: 'rejected' })).status, 404);
  assert.equal((await request('GET', `/api/employer/jobs/${jobId}`, secondToken)).status, 404);
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, secondToken, { title: 'Foreign edit' })).status, 404);
  assert.equal((await request('GET', '/api/applications?postId=' + jobId, secondToken)).data.application, null);
  passed('Another account cannot access or change the candidate application');
  assert.equal((await request('PUT', `/api/employer/jobs/${jobId}`, employerToken, { status: 'closed' })).status, 200);
  assert.equal((await request('GET', '/api/jobs', null)).data.jobs.some(job => job.id === jobId), false);
  const lateApplication = await request('POST', '/api/applications', secondToken, { postId: jobId });
  assert.equal(lateApplication.status, 422); assert.match(lateApplication.data.error, /no longer accepting/);
  assert.equal((await request('GET', '/api/applications?postId=' + jobId, candidateToken)).data.application.postId, jobId);
  passed('Closing removes the listing, stops new applications and preserves existing receipts');
  const profileView = await request('GET', '/api/members?uid=' + candidateId, employerToken);
  assert.equal(profileView.status, 200);
  assert.equal(profileView.data.member.displayName, 'Fictional Candidate');
  assert.equal(JSON.stringify(profileView.data).includes('PRIVATE_'), false);
  await db.doc(`member_settings/${candidateId}`).set({ profileVisibility: 'private', showInDirectory: false });
  assert.equal((await request('GET', '/api/members?uid=' + candidateId, employerToken)).data.member, null);
  assert.equal((await request('GET', '/api/members', employerToken)).data.members.some(member => member.uid === candidateId), false);
  const metadata = await (await fetch(server.base + '/members/' + candidateId)).text();
  assert.equal(metadata.includes('PRIVATE_PROFILE_RESUME'), false);
  passed('Public profiles and directory respect privacy settings and omit private contact, résumé and salary fields');
  await db.doc(`users/${candidateId}`).set({ role: 'community', adminSignupNotifiedAt: 'already-recorded', status: 'active' });
  assert.equal((await request('PATCH', '/api/profile', candidateToken, { displayName: 'Changed safely', status: 'suspended', role: 'admin', orgId: secondId, admin: true, isSuperAdmin: true })).status, 200);
  const safeProfile = (await db.doc(`users/${candidateId}`).get()).data();
  assert.equal(safeProfile.displayName, 'Changed safely'); assert.equal(safeProfile.status, 'active'); assert.equal(safeProfile.role, 'community'); assert.equal(safeProfile.orgId, undefined);
  await db.doc(`users/${candidateId}`).update({ status: 'suspended' });
  assert.equal((await request('PATCH', '/api/profile', candidateToken, { status: 'active' })).status, 403);
  assert.equal((await request('POST', '/api/posts', candidateToken, { description: 'Must not post while suspended' })).status, 403);
  await db.doc(`users/${candidateId}`).update({ status: 'active' });
  passed('Profile API cannot self-promote, relink an organization, or undo suspension');
  await db.doc(`applications/${appId}`).update({ statusHistory: [{ status: 'submitted', timestamp: new Date(), note: 'PRIVATE_REVIEW_HISTORY' }], reviewerNote: 'PRIVATE_REVIEW' });
  assert.equal(JSON.stringify((await request('GET', '/api/applications', candidateToken)).data).includes('PRIVATE_REVIEW'), false);
  assert.equal((await request('GET', '/api/applications?appId=' + appId, secondToken)).data.application, null);
  assert.equal((await request('PATCH', '/api/applications', secondToken, { appId, action: 'withdraw' })).status, 404);
  assert.equal((await request('PUT', '/api/employer/applications', employerToken, { appId, status: 'withdrawn' })).status, 400);
  const [withdrawResult, simultaneousReview] = await Promise.all([
    request('PATCH', '/api/applications', candidateToken, { appId, action: 'withdraw', orgId: secondId }),
    request('PUT', '/api/employer/applications', employerToken, { appId, status: 'reviewing' }),
  ]);
  assert.equal(withdrawResult.status, 200);
  assert.ok([200, 409].includes(simultaneousReview.status));
  assert.equal((await db.doc(`applications/${appId}`).get()).data().status, 'withdrawn');
  assert.equal((await request('PATCH', '/api/applications', candidateToken, { appId, action: 'withdraw' })).status, 200);
  assert.equal((await db.doc(`applications/${appId}`).get()).data().statusHistory.filter(item => item.status === 'withdrawn').length, 1);
  assert.equal((await request('GET', '/api/employer/applications', employerToken)).data.applications.find(app => app.id === appId).status, 'withdrawn');
  assert.equal((await request('PUT', '/api/employer/applications', employerToken, { appId, status: 'reviewing' })).status, 409);
  passed('Only the applicant can withdraw; retries are idempotent, employers cannot reopen it, and reviewer notes stay private');
  const teamToken = await createIdentity(teamId);
  await auth.setCustomUserClaims(teamId, { employer: true, orgId: employerId, employerId });
  await db.doc(`users/${teamId}`).set({ role: 'employer', employerId, orgId: employerId, orgRole: 'member' });
  await db.doc(`members/${teamId}`).set({ role: 'employer', orgId: employerId, orgRole: 'member', displayName: 'Fictional teammate', resumeUrl: 'PRIVATE_TEAM_RESUME' });
  assert.equal((await request('GET', '/api/employer/applications', teamToken)).status, 403);
  assert.equal((await request('GET', '/api/employer/team', teamToken)).status, 403);
  assert.equal(JSON.stringify((await request('GET', '/api/employer/team', employerToken)).data).includes('PRIVATE_TEAM_RESUME'), false);
  assert.equal((await request('PATCH', '/api/employer/team', secondToken, { uid: teamId, role: 'admin' })).status, 404);
  assert.equal((await request('PATCH', '/api/employer/team', employerToken, { uid: employerId, role: 'remove' })).status, 403);
  assert.equal((await request('PATCH', '/api/employer/team', employerToken, { uid: teamId, role: 'admin' })).status, 200);
  assert.equal((await request('GET', '/api/employer/applications', teamToken)).status, 200);
  assert.equal((await request('PATCH', '/api/employer/team', employerToken, { uid: teamId, role: 'remove' })).status, 200);
  assert.ok([401, 403].includes((await request('GET', '/api/employer/applications', teamToken)).status));
  assert.equal((await auth.getUser(teamId)).customClaims.orgId, undefined);
  passed('Team roles are organization-scoped; ordinary members cannot review applications and removed teammates lose access');
  const conversationId = prefix + '-conversation', messageId = prefix + '-message';
  await db.doc(`conversations/${conversationId}`).set({ participants: [candidateId, employerId] });
  await db.doc(`messages/${messageId}`).set({ conversationId, senderId: candidateId, text: 'Isolated fictional message' });
  assert.equal((await request('POST', '/api/messages/notify', secondToken, { messageId })).status, 404);
  assert.equal((await request('POST', '/api/messages/notify', candidateToken, { messageId, to: 'forged@example.invalid' })).status, 200);
  assert.equal((await request('POST', '/api/messages/notify', candidateToken, { messageId })).status, 200);
  assert.equal((await db.doc(`mail/message-${messageId}`).get()).data().to, employerId + '@example.invalid');
  passed('Message notifications use the existing conversation and verified recipient, with no arbitrary mail payloads or duplicates');
  await Promise.all(directoryIds.map(uid => db.doc(`members/${uid}`).set({ displayName: 'Fictional directory member', resumeUrl: 'PRIVATE_DIRECTORY_RESUME' })));
  const firstPage = await request('GET', '/api/members?cursor=' + prefix + '-page-', employerToken);
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.data.members.length, 40);
  assert.equal(firstPage.data.nextCursor, directoryIds[39]);
  const secondPage = await request('GET', '/api/members?cursor=' + firstPage.data.nextCursor, employerToken);
  assert.ok(secondPage.data.members.some(member => member.uid === directoryIds[40]));
  assert.equal(JSON.stringify([firstPage.data, secondPage.data]).includes('PRIVATE_DIRECTORY_RESUME'), false);
  passed('Privacy-filtered directory pagination reaches members beyond the first page');
  const protectedToken = await createIdentity(protectedOwnerId, 'nathan.arias@iopps.ca');
  await db.doc(`members/${protectedOwnerId}`).set({ email: 'spoofed@example.invalid', displayName: 'Protected emulator fixture' });
  assert.equal((await request('DELETE', '/api/account', null, { confirmDelete: true })).status, 401);
  assert.equal((await request('DELETE', '/api/account', candidateToken, {})).status, 400);
  assert.equal((await request('DELETE', '/api/account', protectedToken, { confirmDelete: true })).status, 403);
  assert.equal((await request('DELETE', '/api/account', employerToken, { confirmDelete: true })).status, 409);
  const agedParts = candidateToken.split('.');
  const agedClaims = JSON.parse(Buffer.from(agedParts[1], 'base64url'));
  agedClaims.auth_time -= 600;
  agedParts[1] = Buffer.from(JSON.stringify(agedClaims)).toString('base64url');
  assert.equal((await request('DELETE', '/api/account', agedParts.join('.'), { confirmDelete: true })).status, 401);
  assert.equal((await request('DELETE', '/api/account', candidateToken, { confirmDelete: true, uid: employerId })).status, 200);
  assert.equal((await db.doc(`members/${candidateId}`).get()).exists, false);
  assert.equal((await db.doc(`users/${candidateId}`).get()).data().status, 'deleted');
  assert.equal((await db.doc(`applications/${appId}`).get()).exists, true);
  await assert.rejects(auth.getUser(candidateId), error => error.code === 'auth/user-not-found');
  assert.equal((await auth.getUser(employerId)).uid, employerId);
  assert.ok([401, 403].includes((await request('PATCH', '/api/profile', candidateToken, { displayName: 'Cannot recreate' })).status));
  passed('Recent sign-in allows only self-deletion; protected owners and other accounts remain intact, and stale tokens cannot recreate profiles');
  console.log(JSON.stringify({ projectId, checks, count: checks.length }, null, 2));
} finally {
  await Promise.allSettled([employerId, candidateId, secondId, teamId, protectedOwnerId].flatMap(uid => [
    ...['users', 'members', 'member_settings', 'employers', 'organizations'].map(collection => db.doc(`${collection}/${uid}`).delete()),
    auth.deleteUser(uid),
  ]));
  await Promise.allSettled(directoryIds.map(uid => db.doc(`members/${uid}`).delete()));
  await Promise.allSettled([db.doc(`jobs/${jobId}`).delete(), db.doc(`posts/${jobId}`).delete(), db.doc(`applications/${appId}`).delete()]);
  await Promise.allSettled([db.doc(`conversations/${prefix}-conversation`).delete(), db.doc(`messages/${prefix}-message`).delete(), db.doc(`mail/message-${prefix}-message`).delete()]);
  if (archivePath) await getAdminStorage(admin).bucket(bucketName).file(archivePath).delete({ ignoreNotFound: true });
  await deleteApp(client); await db.terminate(); await deleteAdmin(admin); await server?.stop();
}

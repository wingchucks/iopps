// Exercise real API handoffs with fictional identities in the isolated demo project.
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { startIsolatedQaServer } from './local-qa-server.mjs';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview', 'Run with the demo-iopps-preview emulator project');
Object.assign(process.env, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' });
const admin = initializeApp({ projectId: 'demo-iopps-preview' }, 'business-journey');
const db = getFirestore(admin), auth = getAuth(admin);
const prefix = 'qa-business-' + crypto.randomUUID();
const ownerId = prefix + '-owner', otherId = prefix + '-other', adminId = prefix + '-admin', jobId = prefix + '-job';
const checks = [];
const passed = message => { checks.push(message); console.log('PASS ' + message); };
let server;
async function identity(uid, claims = {}) {
  await auth.createUser({ uid, email: uid + '@example.invalid', emailVerified: true });
  await auth.setCustomUserClaims(uid, claims);
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await auth.createCustomToken(uid), returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).idToken;
}
try {
  server = await startIsolatedQaServer();
  async function request(method, path, token, body) {
    const response = await fetch(server.base + path, { method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  }
  const token = await identity(ownerId), otherToken = await identity(otherId), adminToken = await identity(adminId, { admin: true });
  const signup = { name: 'Fictional business ' + prefix, type: 'business', contactName: 'Fictional Owner', contactEmail: ownerId + '@example.invalid',
    businessIdentity: 'not_specified', capabilities: ['list_business'], description: 'Fictional business profile for isolated workflow testing.',
    logoUrl: 'https://example.invalid/logo.png', location: { city: 'Saskatoon', province: 'SK' }, onboardingComplete: true, formStartedAt: Date.now() - 60000 };
  const created = await request('POST', '/api/employer/signup', token, signup);
  assert.equal(created.status, 200, JSON.stringify(created));
  assert.equal((await request('GET', '/api/auth/account', token)).data.destination, '/org/dashboard');
  assert.deepEqual((await db.doc(`organizations/${ownerId}`).get()).data().capabilities, ['list_business']);
  assert.equal((await request('GET', '/api/employer/dashboard', token)).status, 200);
  passed('Business-only signup enters the shared organization dashboard');
  const ownerReview = async () => (await request('GET', '/api/employer/business-review', token)).data;
  const submit = async () => request('POST', '/api/employer/business-review', token, { revision: (await ownerReview()).review.revision });
  const decision = async (action, feedback = '', snapshot) => {
    const current = snapshot || await ownerReview();
    return request('POST', '/api/admin/business-reviews', adminToken, { orgId: ownerId, revision: current.review.revision, status: current.review.status, action, feedback });
  };
  assert.equal((await ownerReview()).review.status, 'draft');
  assert.equal((await request('GET', `/api/org/${ownerId}`, null)).status, 404);
  assert.equal((await request('GET', '/api/organizations', null)).data.orgs.some(org => org.id === ownerId), false);
  assert.equal((await request('GET', '/api/admin/business-reviews', token)).status, 403);
  assert.equal((await request('POST', '/api/admin/business-reviews', token, { orgId: ownerId, action: 'approve', revision: 1, status: 'draft' })).status, 403);
  assert.equal((await request('POST', '/api/employer/business-review', otherToken, { orgId: ownerId, revision: 1 })).status, 403);
  passed('New listings stay private and owners cannot impersonate an admin or another organization');
  assert.equal((await request('PUT', '/api/employer/profile', token, { description: '', tagline: '', directoryReview: { status: 'approved', revision: 1, approvedRevision: 1 } })).status, 200);
  assert.equal((await submit()).status, 422);
  assert.equal((await ownerReview()).review.status, 'draft');
  passed('Incomplete listings and forged approval metadata cannot become public');


  const patch = { name: 'Fictional Studio ' + prefix, businessIdentity: 'indigenous', location: { city: 'Whitehorse', province: 'YT' },
    services: ['Design', 'Community workshops'], tags: ['Creative services'], nation: 'Example community', treatyTerritory: 'Modern treaty / land claim agreement',
    contactEmail: 'public@example.invalid', description: 'A fictional studio. No real business or partnership is represented.',
    orgId: otherId, verified: true, plan: 'premium', capabilities: ['post_jobs'] };
  const saved = await request('PUT', '/api/employer/profile', token, patch);
  assert.equal(saved.status, 200, JSON.stringify(saved));
  const privateRecord = (await db.doc(`organizations/${ownerId}`).get()).data();
  assert.equal(privateRecord.businessIdentity, 'indigenous'); assert.equal(privateRecord.indigenousOwned, true);
  assert.notEqual(privateRecord.verified, true); assert.notEqual(privateRecord.plan, 'premium');
  assert.deepEqual(privateRecord.capabilities, ['list_business']);
  assert.equal((await db.doc(`organizations/${otherId}`).get()).exists, false);
  passed('Owner edits save identity, province and services without changing entitlements or another organization');
  const submitted = await submit(); assert.equal(submitted.status, 200, JSON.stringify(submitted));
  assert.equal(submitted.data.review.status, 'pending');
  const audits = await db.collection(`organizations/${ownerId}/listingReviews`).get();
  assert.equal((await submit()).status, 200);
  assert.equal((await db.collection(`organizations/${ownerId}/listingReviews`).get()).size, audits.size);
  assert.equal((await request('GET', `/api/org/${created.data.slug}`, null)).status, 404);
  assert.equal((await request('GET', '/api/admin/business-reviews?status=pending', adminToken)).data.listings.some(item => item.org.id === ownerId), true);
  assert.equal((await decision('changes_requested')).status, 400);
  assert.equal((await decision('changes_requested', 'Please explain which communications services customers can book.')).status, 200);
  const feedbackState = await ownerReview();
  assert.match(feedbackState.review.feedback, /communications/);
  assert.equal((await submit()).status, 422);
  assert.equal((await request('POST', '/api/auth/session', null, { idToken: token })).status, 200);
  assert.equal((await ownerReview()).review.status, 'changes_requested');
  passed('Submission is idempotent; reviewer feedback reaches the owner and survives sign-in');
  assert.equal((await request('PUT', '/api/employer/profile', token, { description: patch.description + ' Services include event notices and website copy.' })).status, 200);
  assert.equal((await submit()).status, 200);
  const stale = await ownerReview();
  assert.equal((await request('PUT', '/api/employer/profile', token, { phone: '306-555-0100' })).status, 200);
  assert.equal((await decision('approve', '', stale)).status, 409);
  assert.equal((await submit()).status, 200);
  const approved = await decision('approve'); assert.equal(approved.status, 200, JSON.stringify(approved));
  assert.equal(approved.data.isPublic, true);
  assert.equal((await decision('reject', 'Stale decision must not overwrite another review.', stale)).status, 409);
  assert.equal((await db.doc(`organizations/${ownerId}`).get()).data().verified, false);
  passed('Editing during review prevents stale approval; current approval publishes without a verification badge');


  await db.doc(`organizations/${ownerId}`).update({ stripeCustomerId: 'PRIVATE_CANARY_CUSTOMER', billingEmail: 'PRIVATE_CANARY_BILLING', emailTemplates: { offer: 'PRIVATE_CANARY_TEMPLATE' }, internalNotes: 'PRIVATE_CANARY_NOTES', ownerId: 'PRIVATE_CANARY_OWNER' });
  const publicProfile = await request('GET', `/api/org/${created.data.slug}`, null);
  assert.equal(publicProfile.status, 200, JSON.stringify(publicProfile));
  assert.equal(publicProfile.data.org.name, patch.name);
  assert.deepEqual(publicProfile.data.org.location, patch.location);
  assert.deepEqual(publicProfile.data.org.services, patch.services);
  assert.equal(publicProfile.data.org.businessIdentity, 'indigenous');
  assert.equal(publicProfile.data.org.contactEmail, 'public@example.invalid');
  const directory = (await request('GET', '/api/organizations', null)).data.orgs;
  const directoryRecord = directory.find(org => org.id === ownerId);
  assert.ok(directoryRecord); assert.deepEqual(directoryRecord.services, patch.services);
  assert.ok(!JSON.stringify([publicProfile.data, directory]).includes('PRIVATE_CANARY'));
  assert.equal('emailTemplates' in directoryRecord, false); assert.equal('plan' in directoryRecord, false);
  passed('Public profile and directory show saved details while excluding account-only fields');
  const beforeNoOp = await ownerReview();
  assert.equal((await request('PUT', '/api/employer/profile', token, { name: patch.name })).status, 200);
  assert.deepEqual((await ownerReview()).review, beforeNoOp.review);
  assert.equal((await request('GET', `/api/org/${ownerId}`, null)).status, 200);
  passed('Saving an unchanged profile preserves its public approval');


  assert.equal((await request('PUT', '/api/employer/profile', null, { name: 'Changed' })).status, 401);
  assert.equal((await request('PUT', '/api/employer/profile', otherToken, { orgId: ownerId, name: 'Changed' })).status, 403);
  assert.equal((await db.doc(`organizations/${ownerId}`).get()).data().name, patch.name);
  passed('Anonymous and unrelated accounts cannot edit the business');

  assert.equal((await request('PUT', '/api/employer/profile', token, { businessIdentity: 'not_specified' })).status, 200);
  assert.equal((await request('GET', `/api/org/${ownerId}`, null)).status, 404);
  assert.equal((await ownerReview()).review.status, 'draft');
  assert.equal((await submit()).status, 200); assert.equal((await decision('approve')).status, 200);
  const cleared = (await request('GET', `/api/org/${ownerId}`, null)).data.org;
  assert.equal(cleared.businessIdentity, 'not_specified'); assert.equal(cleared.indigenousOwned, false);
  assert.equal(cleared.nation, patch.nation); assert.equal(cleared.treatyTerritory, patch.treatyTerritory);
  passed('Identity can be cleared while preserving separate Nation and territory information');

  assert.equal((await request('PUT', '/api/employer/profile', token, { isPublished: false })).status, 200);
  assert.equal((await request('GET', `/api/org/${ownerId}`, null)).status, 404);
  assert.equal((await request('GET', '/api/organizations', null)).data.orgs.some(org => org.id === ownerId), false);
  assert.equal((await request('PUT', '/api/employer/profile', token, { isPublished: true })).status, 200);
  assert.equal((await request('GET', `/api/org/${ownerId}`, null)).status, 200);
  passed('Hidden profiles stay out of both public endpoints and can be restored');

  await db.doc(`employers/${ownerId}`).update({ featuredPostCredits: 3 });
  assert.equal((await request('POST', '/api/employer/signup', token, signup)).status, 200);
  assert.equal((await db.doc(`organizations/${ownerId}`).get()).data().name, patch.name);
  assert.equal((await db.doc(`employers/${ownerId}`).get()).data().featuredPostCredits, 3);
  passed('A repeated signup preserves the edited profile and existing credits');
  assert.equal((await decision('reject', 'Please correct the misleading service description before resubmitting.')).status, 200);
  assert.equal((await request('POST', '/api/auth/session', null, { idToken: token })).status, 200);
  assert.equal((await request('POST', '/api/employer/onboarding/complete', token, {})).status, 200);
  assert.equal((await ownerReview()).review.status, 'rejected');
  assert.equal((await request('GET', `/api/org/${ownerId}`, null)).status, 404);
  assert.equal((await request('GET', '/api/partners', null)).data.partners.some(org => org.id === ownerId), false);
  passed('Revoking a listing hides it; session refresh and onboarding cannot undo the review');
  await db.doc(`members/${ownerId}`).update({ orgRole: 'recruiter' });
  assert.equal((await request('PUT', '/api/employer/profile', token, { name: 'Not permitted' })).status, 403);
  assert.equal((await request('POST', '/api/employer/business-review', token, { revision: 1 })).status, 403);
  await db.doc(`members/${ownerId}`).update({ orgRole: 'owner' });
  passed('Recruiters cannot edit or submit an organization listing');


  const draft = await request('POST', '/api/employer/jobs', token, { slug: jobId, title: 'Fictional Studio Assistant', status: 'draft', description: 'Isolated demo job.', location: 'Whitehorse, YT', workLocation: 'On-site', employmentType: 'Full-time' });
  assert.equal(draft.status, 200, JSON.stringify(draft));
  assert.equal((await request('GET', `/api/employer/jobs/${jobId}`, token)).status, 200);
  assert.equal((await request('GET', '/api/jobs', null)).data.jobs.some(job => job.id === jobId), false);
  assert.equal((await request('GET', '/api/auth/account', token)).data.destination, '/org/dashboard');
  passed('The business account can draft a job without a second signup or public posting');
  await db.doc(`organizations/${ownerId}`).update({ status: 'rejected' });
  await db.doc(`employers/${ownerId}`).update({ status: 'rejected' });
  assert.equal((await request('POST', '/api/auth/session', null, { idToken: token })).status, 200);
  assert.equal((await request('POST', '/api/employer/onboarding/complete', token, {})).status, 200);
  assert.equal((await db.doc(`organizations/${ownerId}`).get()).data().status, 'rejected');
  assert.equal((await db.doc(`employers/${ownerId}`).get()).data().status, 'rejected');
  passed('Existing account rejection is also preserved across sign-in and setup');

  console.log(`Completed ${checks.length} business workflow checks.`);
} finally {
  for (const collection of ['organizations', 'employers', 'users', 'members']) {
    for (const id of [ownerId, otherId, adminId]) await db.recursiveDelete(db.doc(`${collection}/${id}`));
  }
  for (const collection of ['jobs', 'posts']) await db.recursiveDelete(db.doc(`${collection}/${jobId}`));
  for (const id of [ownerId, otherId, adminId]) await auth.deleteUser(id).catch(error => { if (error.code !== 'auth/user-not-found') throw error; });
  await server?.stop(); await deleteApp(admin);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { cleanClosedAccountUploads } from '../src/lib/server/account-upload-cleanup.ts';
import { reservePasswordReset } from '../src/lib/server/password-reset-limit.ts';
import * as organization from '../src/lib/organization-profile.ts';
import * as subscription from '../src/lib/server/subscription-state.ts';
import * as seo from '../src/lib/server/seo.ts';
import * as jobs from '../src/lib/public-job-merge.ts';
import * as jobSlugs from '../src/lib/server/job-slugs.ts';
import * as publicJobs from '../src/lib/public-jobs.ts';
import * as publicOpportunities from '../src/lib/server/public-opportunities.ts';
import * as jobDocuments from '../src/lib/server/public-job-documents.ts';
import * as organizationJobs from '../src/lib/server/public-organization-jobs.ts';
import * as partnerPayload from '../src/lib/server/partners-payload.ts';
import * as partnerPromotion from '../src/lib/server/partner-promotion.ts';
import * as publicOrganization from '../src/lib/public-organization.ts';
import * as actionLinks from '../src/lib/auth-verification-email.ts';
import * as schoolVisibility from '../src/lib/school-visibility.ts';
import * as jobDetailDates from '../src/lib/job-detail-dates.ts';
import * as applicationDestination from '../src/lib/application-destination.ts';
import * as accessState from '../src/lib/access-state.ts';
import * as businessReview from '../src/lib/business-listing-review.ts';

const requireNative = createRequire(import.meta.url);
function load(file, dependencies, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { exports, URL, URLSearchParams, Response, console, ...globals, require: id => {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    if (id === 'react' || id === 'react/jsx-runtime') return requireNative(id);
    throw Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}

test('directory routes count only displayed organizations while retaining private legacy identity matching', async () => {
  const partner = {
    id: 'public-org', employerId: 'legacy-owner', name: 'Fictional Partner', type: 'business', status: 'approved', onboardingComplete: true,
    publicVisibility: 'public', logoUrl: 'https://fixture.invalid/logo.png', description: 'Fictional profile', contactEmail: 'qa@example.invalid',
    subscription: { tier: 'premium', status: 'active', billingStartAt: '2026-01-01', subscriptionEnd: '2099-12-31', paymentId: 'pi_fictional', amountPaid: 2500 },
  };
  const records = {
    organizations: [partner, { ...partner, id: 'hidden-org', employerId: 'hidden-owner', name: 'Hidden Partner', publicVisibility: 'private' }],
    jobs: [{ id: 'legacy-job', employerId: 'legacy-owner', active: true, status: 'active' }, { id: 'closed', orgId: 'former-owner', active: false, status: 'closed' }, { id: 'foreign', orgId: 'hidden-org', active: true, status: 'active' }],
    posts: [{ id: 'closed', orgId: 'public-org', type: 'job', status: 'active' }],
  };
  const queriedIdentities = [];
  const doc = row => ({ id: row.id, exists: true, data: () => row });
  const query = (name, filters = []) => ({
    where: (field, operator, value) => {
      if (name !== 'organizations' && operator === 'in') queriedIdentities.push(...value);
      return query(name, [...filters, [field, operator, value]]);
    },
    get: async () => {
      assert.ok(name === 'organizations' || filters.length, 'Unscoped directory job read');
      return { docs: records[name].filter(row => filters.every(([field, operator, value]) => operator === 'in' ? value.includes(row[field]) : row[field] === value)).map(doc) };
    },
    doc: id => ({ name, id }),
  });
  const db = { collection: name => query(name), getAll: async (...refs) => refs.map(ref => {
    const row = records[ref.name].find(value => value.id === ref.id);
    return row ? doc(row) : { id: ref.id, exists: false };
  }) };
  const dependencies = {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/firebase-admin': { getAdminDb: () => db, hasAdminRuntimeSupport: () => true },
    '@/lib/local-dev-business-data': {}, '@/lib/public-job-merge': jobs, '@/lib/organization-profile': organization,
    '@/lib/server/partners-payload': partnerPayload, '@/lib/server/partner-promotion': partnerPromotion,
    '@/lib/public-organization': publicOrganization, '@/lib/school-visibility': schoolVisibility,
    '@/lib/server/public-organization-jobs': organizationJobs,
  };
  for (const [path, suffix] of [['organizations', ''], ['organizations', '?partners=true'], ['partners', '']]) {
    const route = load(`src/app/api/${path}/route.ts`, dependencies, { process: { env: { NODE_ENV: 'production' } } });
    const response = await route.GET(new Request('https://fixture.invalid/api/' + path + suffix));
    assert.equal(response.status, 200);
    const body = await response.json(), rows = body.orgs || body.partners;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].openJobs, 1);
    assert.equal(rows[0].employerId, undefined);
    assert.equal(rows[0].subscription, undefined);
  }
  assert.ok(queriedIdentities.includes('legacy-owner'));
  assert.equal(queriedIdentities.includes('hidden-org'), false);
  assert.equal(queriedIdentities.includes('hidden-owner'), false);
});

test('application details render the submitted snapshot and escape untrusted cover letters', () => {
  const component = load('src/components/ApplicationDetails.tsx', { '@/lib/utils': { displayLocation: String } }).default;
  const html = requireNative('react-dom/server').renderToStaticMarkup(requireNative('react').createElement(component, {
    application: { profileSnapshot: { email: 'qa@example.invalid', bio: 'Captured bio', skills: ['Design'], education: [{ school: 'Fictional School', degree: 'Certificate' }] }, coverLetter: '<script>bad()</script>', references: 'Reference supplied' },
    profile: { bio: 'New private bio' },
  }));
  for (const content of ['Captured bio', 'qa@example.invalid', 'Fictional School', 'Reference supplied', '&lt;script&gt;']) assert.ok(html.includes(content));
  assert.ok(!html.includes('<script>') && !html.includes('New private bio'));
  const source = readFileSync('src/app/org/dashboard/applications/page.tsx', 'utf8');
  assert.equal((source.match(/<ApplicationDetails/g) || []).length, 2, 'List and Board both expose application content');
  assert.match(source, /disabled=\{app.status === "withdrawn" \|\|/);
});

// Model immutable, bounded Firestore queries rather than accepting no-op paging.
function cleanupApplications(records, reads = [], failField) {
  const query = (field, value, order, count, after) => ({
    orderBy: name => { assert.equal(name, '__name__'); return query(field, value, name, count, after); },
    limit: size => { assert.equal(size, 250); return query(field, value, order, size, after); },
    startAfter: snapshot => { assert.ok(snapshot.id); return query(field, value, order, count, snapshot.id); },
    get: async () => {
      assert.equal(order, '__name__'); assert.equal(count, 250);
      reads.push({ field, after });
      if (field === failField) throw Error('Legacy query unavailable');
      return { docs: records.filter(row => row[field] === value && (!after || row.id > after))
        .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).slice(0, count)
        .map(row => ({ id: row.id, data: () => row })) };
    },
  });
  return { where: (field, op, value) => { assert.equal(op, '=='); return query(field, value); } };
}

function cleanupFiles(paths, onDelete, onList = () => {}) {
  return async options => {
    const { prefix, autoPaginate, maxResults, pageToken } = options;
    assert.equal(autoPaginate, false); assert.ok(maxResults > 0 && maxResults <= 100);
    onList(options);
    const matches = paths.filter(name => name.startsWith(prefix));
    const offset = Number(pageToken || 0), page = matches.slice(offset, offset + maxResults);
    return [page.map(name => ({ name, metadata: { generation: '123' }, delete: async options => onDelete(name, options) })),
      offset + page.length < matches.length ? { pageToken: String(offset + page.length) } : null];
  };
}

test('closed-account upload cleanup preserves shared files, rejects live accounts and pins generations', async () => {
  let closed = false;
  const deletions = [], authDeletes = [];
  const uid = 'qa-owner', bucketName = 'fictional.example';
  const shared = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(`resumes/${uid}/shared.pdf`)}?token=fictional`;
  const db = { doc: () => ({ get: async () => ({ data: () => closed ? { status: 'deleted', deletedAt: 'now' } : { status: 'active' } }) }), collection: () => cleanupApplications([{ id: 'current', userId: uid, resumeUrl: shared }]) };
  const auth = { deleteUser: async id => { authDeletes.push(id); throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); } };
  const bucket = { name: bucketName, getFiles: async options => {
    // Keep the original adversarial listing: foreign/archive rows must be skipped.
    assert.equal(options.autoPaginate, false); assert.ok(options.maxResults <= 100);
    return [[options.prefix.startsWith('avatars/') ? `avatars/${uid}.png` : `resumes/${uid}/private.pdf`, `resumes/${uid}/shared.pdf`, 'resumes/foreign/file.pdf', `application-documents/${uid}/archive.pdf`].map(name => ({ name, metadata: { generation: '123' }, delete: async options => deletions.push({ name, options }) })), null];
  } };
  await assert.rejects(cleanClosedAccountUploads(db, bucket, auth, uid), /closed/);
  assert.equal(authDeletes.length, 0);
  closed = true;
  const result = await cleanClosedAccountUploads(db, bucket, auth, uid);
  assert.equal(result.deleted, 2);
  assert.equal(result.cursor, null);
  assert.deepEqual(deletions.map(d => d.name), [`avatars/${uid}.png`, `resumes/${uid}/private.pdf`]);
  assert.ok(deletions.every(d => d.options.ifGenerationMatch === 123));
  await assert.rejects(cleanClosedAccountUploads(db, bucket, auth, '../foreign'), /identity/);
});

test('cleanup retains resumes and profile images referenced by legacy memberId applications', async () => {
  const uid = 'qa-legacy', bucketName = 'fictional.example', deletions = [];
  const url = name => `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(name)}?token=fictional`;
  const records = [
    { id: 'current', userId: uid, resumeUrl: url(`resumes/${uid}/current.pdf`) },
    { id: 'legacy', memberId: uid, resumeUrl: url(`resumes/${uid}/legacy.pdf`), profileSnapshot: { photoURL: url(`avatars/${uid}.png`) } },
    { id: 'both', userId: uid, memberId: uid, profileSnapshot: { resumeUrl: url(`resumes/${uid}/snapshot.pdf`) } },
  ];
  // Force both reference scans past their first page without changing retention.
  records.push(...Array.from({ length: 250 }, (_, i) => ({ id: `a-${String(i).padStart(3, '0')}`, userId: uid, memberId: uid })));
  const reads = [];
  const db = { doc: () => ({ get: async () => ({ data: () => ({ status: 'deleted', deletedAt: 'now' }) }) }), collection: () => cleanupApplications(records, reads) };
  const paths = [`resumes/${uid}/current.pdf`, `resumes/${uid}/legacy.pdf`, `resumes/${uid}/snapshot.pdf`, `avatars/${uid}.png`, `resumes/${uid}/unshared.pdf`];
  const bucket = { name: bucketName, getFiles: cleanupFiles(paths, name => deletions.push(name), () => {
    assert.deepEqual(reads.map(read => read.field), ['userId', 'userId', 'memberId', 'memberId']);
    assert.equal(reads[1].after, 'a-249'); assert.equal(reads[3].after, 'a-249');
  }) };
  const result = await cleanClosedAccountUploads(db, bucket, { deleteUser: async () => {} }, uid);
  assert.deepEqual(deletions, [`resumes/${uid}/unshared.pdf`]);
  assert.equal(result.retainedShared, 4);
  assert.equal(result.cursor, null);
});

test('cleanup deletes no uploads if the legacy ownership query fails', async () => {
  let listed = false;
  const reads = [];
  const db = { doc: () => ({ get: async () => ({ data: () => ({ status: 'deleted', deletedAt: 'now' }) }) }), collection: () => cleanupApplications([], reads, 'memberId') };
  const bucket = { getFiles: async () => { listed = true; return [[]]; } };
  await assert.rejects(cleanClosedAccountUploads(db, bucket, { deleteUser: async () => {} }, 'qa-legacy'), /Legacy query unavailable/);
  assert.equal(listed, false);
  assert.deepEqual(reads.map(read => read.field), ['userId', 'memberId']);
});

test('password-reset rate reservations enforce independent email/IP windows without storing raw identities', async () => {
  const stored = new Map();
  const db = { collection: () => ({ doc: id => id }), runTransaction: async action => action({
    getAll: async (...refs) => refs.map(ref => ({ data: () => stored.get(ref) })), set: (ref, data) => stored.set(ref, data),
  }) };
  for (let i = 0; i < 3; i++) assert.equal(await reservePasswordReset(db, 'Qa@Example.invalid', '127.0.0.9', 1000), true);
  assert.equal(await reservePasswordReset(db, 'qa@example.invalid', '127.0.0.8', 1000), false);
  for (let i = 0; i < 7; i++) assert.equal(await reservePasswordReset(db, `different${i}@example.invalid`, '127.0.0.9', 1000), true);
  assert.equal(await reservePasswordReset(db, 'last@example.invalid', '127.0.0.9', 1000), false);
  assert.equal(await reservePasswordReset(db, 'qa@example.invalid', '127.0.0.9', 86402000), true);
  assert.ok(!JSON.stringify([...stored]).includes('@') && !JSON.stringify([...stored]).includes('127.0.0.9'));
});

test('password reset checks origin, App Check, input and limits; absent users and delivery failure share one response', async () => {
  let origin = true, appCheck = true, allowed = true, failure = '', generated = 0, sent = 0;
  const route = load('src/app/api/auth/password-reset/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/csrf': { validateOrigin: () => origin },
    '@/lib/server/app-check': { verifyAppCheckFromRequest: async () => appCheck },
    '@/lib/server/password-reset-limit': { reservePasswordReset: async () => allowed },
    '@/lib/auth-verification-email': actionLinks,
    '@/lib/firebase-admin': { getAdminDb: () => ({}), getAdminAuth: () => ({ generatePasswordResetLink: async (email, settings) => {
      generated++; assert.equal(email, 'qa@example.invalid'); assert.equal(settings.url, 'https://www.iopps.ca/login');
      if (failure === 'missing') throw Object.assign(Error(), { code: 'auth/user-not-found' });
      return 'https://fictional.firebaseapp.com/action?mode=resetPassword&oobCode=fictional';
    } }) },
    '@/lib/email': { sendAccountPasswordResetEmail: async (_email, link) => { assert.equal(new URL(link).origin + new URL(link).pathname, 'https://iopps.ca/auth/action'); assert.equal(new URL(link).searchParams.get('oobCode'), 'fictional'); sent++; if (failure === 'provider') throw Error('Provider unavailable'); } },
  }, { process: { env: { RESEND_API_KEY: 'fictional-unit-key' } }, console: { error: () => {} } });
  const call = (email = 'QA@example.invalid') => route.POST(new Request('https://www.iopps.ca/api/auth/password-reset', { method: 'POST', body: JSON.stringify({ email }), headers: { 'x-forwarded-for': '127.0.0.1' } }));
  origin = false; assert.equal((await call()).status, 403); origin = true;
  appCheck = false; assert.equal((await call()).status, 403); appCheck = true;
  assert.equal((await call('invalid')).status, 400); allowed = false; assert.equal((await call()).status, 429); allowed = true;
  assert.equal(generated, 0);
  const success = await call(); assert.equal(success.status, 200); assert.equal(sent, 1);
  const expected = await success.json();
  for (failure of ['missing', 'provider']) { const response = await call(); assert.equal(response.status, 200); assert.deepEqual(await response.json(), expected); }
  assert.equal(sent, 2, 'unknown accounts never trigger outgoing email');
});

test('reset email uses IOPPS branding, escapes its link and rejects provider non-acceptance', async () => {
  const sent = []; let result = { data: { id: 'fictional-id' } };
  const email = load('src/lib/email.ts', {
    resend: { Resend: class { emails = { send: async message => { sent.push(message); return result; } }; } },
    '@/lib/auth-verification-email': {},
  }, { process: { env: { RESEND_API_KEY: 'fictional-unit-key' } } });
  await email.sendAccountPasswordResetEmail('qa@example.invalid', 'https://example.invalid/?a=1&b="quoted"');
  assert.equal(sent[0].from, 'IOPPS <notifications@iopps.ca>'); assert.equal(sent[0].subject, 'Reset your IOPPS password');
  assert.ok(sent[0].html.includes('&amp;b=&quot;quoted&quot;')); assert.ok(sent[0].text.includes('Reset your IOPPS password'));
  result = { error: { message: 'Failed acceptance' } }; await assert.rejects(email.sendAccountPasswordResetEmail('qa@example.invalid', 'https://example.invalid'), /acceptance/);
});

test('organization metadata resolves the canonical record and immediately drops withdrawn or deleted identities', async () => {
  const rows = new Map([['organizations/qa', { name: 'Private canonical name', status: 'draft', directoryStatus: 'draft', slug: 'qa' }], ['employers/legacy', { name: 'Stale public name', slug: 'legacy', orgId: 'qa', status: 'approved' }]]);
  const snapshot = path => ({ id: path.split('/')[1], exists: rows.has(path), data: () => rows.get(path) });
  const db = { collection: name => ({ doc: id => ({ get: async () => snapshot(`${name}/${id}`) }), where: (field, _op, value) => ({ limit: () => ({ get: async () => {
    const docs = [...rows].filter(([path, record]) => path.startsWith(name + '/') && record[field] === value).map(([path]) => snapshot(path)); return { empty: docs.length === 0, docs };
  } }) }) }) };
  const resolver = load('src/lib/server/public-organization-resolver.ts', { '@/lib/organization-profile': organization, '@/lib/server/subscription-state': subscription });
  const metadata = load('src/lib/server/detail-metadata.ts', {
    '@/lib/application-destination': applicationDestination,
    '@/lib/job-detail-dates': jobDetailDates,
    react: { cache: fn => fn }, '@/lib/firebase-admin': { getAdminDb: () => db }, '@/lib/server/public-opportunities': {},
    '@/lib/public-job-merge': jobs, '@/lib/organization-profile': organization, '@/lib/server/public-job-routing': {},
    '@/lib/server/public-organization-resolver': resolver, '@/lib/server/seo': seo,
  });
  const hidden = await metadata.generateOrgMetadata('legacy');
  assert.equal(hidden.robots.index, false); assert.ok(!JSON.stringify(hidden).includes('Private canonical name') && !JSON.stringify(hidden).includes('Stale public name'));
  rows.set('organizations/qa', { name: 'Approved QA organization', slug: 'qa', status: 'approved', logoUrl: '/qa.png', description: 'Fictional organization', contactEmail: 'qa@example.invalid' });
  assert.ok(JSON.stringify(await metadata.generateOrgMetadata('qa')).includes('Approved QA organization'));
  rows.delete('organizations/qa');
  assert.ok(!JSON.stringify(await metadata.generateOrgMetadata('qa')).includes('Approved QA organization'));
  rows.set('employers/legacy', { ...rows.get('employers/legacy'), logoUrl: '/qa.png', description: 'Stale public copy', website: 'https://example.invalid' });
  const deletedAlias = await metadata.generateOrgMetadata('legacy');
  assert.equal(deletedAlias.robots.index, false);
  assert.ok(!JSON.stringify(deletedAlias).includes('Stale public name'));
});

test('scoped organization job links resolve the exact listing when another organization reuses its slug', async () => {
  const org = { id: 'qa-org', name: 'Fictional Organization' };
  const owned = { id: 'owned-id', orgId: org.id, title: 'Shared job title', slug: 'shared-job', active: true };
  const foreign = { ...owned, id: 'foreign-id', orgId: 'other-org', createdAt: '2099-01-01' };
  const doc = row => ({ id: row.id, data: () => row });
  const empty = { where() { return this; }, limit() { return this; }, get: async () => ({ docs: [] }) };
  const route = load('src/app/api/org/[slug]/route.ts', {
    '@/lib/server/employer-auth': { requireEmployerContext: async () => { throw new Error('Public fixture must not request private access'); } },
    '@/lib/access-state': accessState,
    '@/lib/business-listing-review': businessReview,
    'next/server': { NextResponse: Response },
    '@/lib/public-organization': { toPublicOrganization: value => value },
    '@/lib/firebase-admin': { getAdminDb: () => ({ collection: () => empty }), hasAdminRuntimeSupport: () => true },
    '@/lib/local-dev-business-data': {}, '@/lib/server/job-slugs': jobSlugs,
    '@/lib/server/public-organization-resolver': { resolvePublicOrganization: async () => org },
    '@/lib/server/public-organization-jobs': { loadPublicOrganizationJobDocuments: async () => ({ jobs: [doc(owned)], posts: [] }) },
    '@/lib/server/public-opportunities': publicOpportunities,
    '@/lib/public-job-merge': jobs, '@/lib/server/partner-promotion': { withPartnerPromotion: value => value },
    '@/lib/organization-profile': { isOrganizationPubliclyVisible: () => true, normalizeOrganizationRecord: value => value },
    '@/lib/school-visibility': { isSchoolOrganization: () => false },
  }, { process: { env: { NODE_ENV: 'production' } } });
  const response = await route.GET(new Request('https://example.invalid/api/org/qa'), { params: Promise.resolve({ slug: 'qa' }) });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.jobs[0].href, '/jobs/shared-job--owned-id');
  const resolver = load('src/lib/server/public-job-routing.ts', { '@/lib/server/job-slugs': jobSlugs, '@/lib/public-jobs': publicJobs, './public-job-documents': jobDocuments });
  const db = { collection: name => { const query = { where: () => query, get: async () => ({ docs: name === 'jobs' ? [doc(foreign), doc(owned)] : [] }) }; return query; } };
  const resolved = await resolver.findPublicJobDocument(db, payload.jobs[0].href.slice('/jobs/'.length));
  assert.equal(resolved.id, 'owned-id');
});

test('organization profiles omit opportunity tombstones, stale mirrors, hidden legacy matches and paused training', async () => {
  for (const fallback of [false, true]) {
    const org = { id: 'qa-org', name: 'Fictional Organization' };
    const rows = { events: [], scholarships: [], posts: [], training_programs: [
      { id: 'active-training', orgId: org.id, title: 'Paused training listing', slug: 'paused-training', active: true },
      { id: 'legacy-training', provider: org.name, title: 'Paused legacy training listing', active: true },
    ] };
    for (const kind of ['events', 'scholarships']) {
      const prefix = kind === 'events' ? 'event' : 'scholarship';
      const ownership = fallback ? { orgName: org.name } : { orgId: org.id, employerId: org.id };
      rows[kind].push({ id: `${prefix}-live`, ...ownership, title: `Live ${kind}`, status: 'active', active: true, startDate: '2099-09-19', endDate: '2099-09-20', deadline: '2099-09-20' });
      for (const status of ['draft', 'closed', 'deleted', 'rejected']) {
        rows[kind].push({ id: `${prefix}-${status}`, ...ownership, slug: `hidden-${prefix}-${status}`, status, active: false });
        if (!fallback) rows.posts.push({ id: `${prefix}-${prefix}-${status}`, orgId: org.id, type: prefix, title: 'STALE HIDDEN COPY', slug: `hidden-${prefix}-${status}`, status: 'active', active: true, startDate: '2099-09-19', endDate: '2099-09-20' });
      }
      rows[kind].push({ id: `${prefix}-untitled`, ...ownership, status: 'active', active: true });
    }
    const query = (collection, filters = []) => ({
      where: (field, _op, value) => query(collection, [...filters, [field, value]]),
      limit: () => query(collection, filters),
      get: async () => ({ docs: rows[collection].filter(row => filters.every(([field, value]) => row[field] === value)).map(row => ({ id: row.id, data: () => row })) }),
    });
    const mocks = {
      'next/server': { NextResponse: Response }, '@/lib/public-organization': { toPublicOrganization: value => value },
      '@/lib/firebase-admin': { getAdminDb: () => ({ collection: name => { assert.notEqual(name, 'training_programs', 'Paused listings should not be loaded'); return query(name); } }), hasAdminRuntimeSupport: () => true },
      '@/lib/local-dev-business-data': { getLocalDevOrganizationPayload: () => ({ org, jobs: [], events: [], scholarships: [], training: rows.training_programs }) }, '@/lib/server/job-slugs': jobSlugs,
      '@/lib/server/public-organization-resolver': { resolvePublicOrganization: async () => org },
      '@/lib/server/public-organization-jobs': { loadPublicOrganizationJobDocuments: async () => ({ jobs: [], posts: [] }) },
      '@/lib/server/public-opportunities': publicOpportunities,
      '@/lib/public-job-merge': jobs, '@/lib/server/partner-promotion': { withPartnerPromotion: value => value },
      '@/lib/organization-profile': { isOrganizationPubliclyVisible: () => true, normalizeOrganizationRecord: value => value },
      '@/lib/school-visibility': { isSchoolOrganization: () => false },
    };
    Object.assign(mocks, { '@/lib/server/employer-auth': { requireEmployerContext: async () => { throw new Error('Public fixture must not request private access'); } }, '@/lib/access-state': accessState, '@/lib/business-listing-review': businessReview });
    const route = load('src/app/api/org/[slug]/route.ts', mocks, { process: { env: { NODE_ENV: 'production' } } });
    const response = await route.GET(new Request('https://example.invalid/api/org/qa'), { params: Promise.resolve({ slug: 'qa' }) });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.events.map(item => item.title), ['Live events']);
    assert.deepEqual(payload.scholarships.map(item => item.title), ['Live scholarships']);
    assert.ok(!JSON.stringify(payload).includes('HIDDEN COPY'));
    assert.deepEqual(payload.training, []);
    assert.deepEqual(payload.programs, []);
    assert.ok(!JSON.stringify(payload).includes('/training/'));
    const localRoute = load('src/app/api/org/[slug]/route.ts', {
      ...mocks, '@/lib/firebase-admin': { hasAdminRuntimeSupport: () => false },
    }, { process: { env: { NODE_ENV: 'development' } } });
    const localPayload = await (await localRoute.GET(new Request('https://example.invalid/api/org/qa'), { params: Promise.resolve({ slug: 'qa' }) })).json();
    assert.deepEqual(localPayload.training, []);
    assert.deepEqual(localPayload.programs, []);
  }
});

test('account cleanup cron requires its secret and retains failed jobs with a later retry', async () => {
  let scanned = 0; const deleted = [], updated = [], claims = [], ownershipReads = [], authDeletes = [], uploadDeletes = [], listings = [];
  // These jobs are eligible final sweeps; unknown-history grace is covered separately.
  const stored = new Map(['complete', 'retry', 'progress'].map(id => [id, { notBefore: '2020-01-01T00:00:00.000Z', authRemovedAt: '2020-01-01T00:00:00.000Z' }]));
  const snapshot = id => ({ data: () => stored.has(id) ? structuredClone(stored.get(id)) : undefined });
  const job = id => ({ id, ref: { id, get: async () => { ownershipReads.push(id); return snapshot(id); } } });
  const db = {
    doc: path => ({ get: async () => { assert.match(path, /^users\//); return { data: () => ({ status: 'deleted', deletedAt: 'fixture' }) }; } }),
    collection: name => {
      if (name === 'applications') return cleanupApplications([]);
      assert.equal(name, 'account_cleanup');
      return { where: (field, op, due) => {
        assert.equal(field, 'notBefore'); assert.equal(op, '<=');
        return { limit: count => { assert.equal(count, 50); return { get: async () => {
          scanned++; return { docs: [...stored].filter(([, data]) => data.notBefore <= due).slice(0, count).map(([id]) => job(id)) };
        } }; } };
      } };
    },
    runTransaction: async action => {
      const writes = [];
      const result = await action({
        get: async ref => snapshot(ref.id),
        update: (ref, data) => writes.push(() => {
          assert.ok(stored.has(ref.id), 'transactions must not resurrect removed jobs');
          stored.set(ref.id, { ...stored.get(ref.id), ...structuredClone(data) });
          (data.leaseOwner ? claims : updated).push({ id: ref.id, data });
        }),
        delete: ref => writes.push(() => { stored.delete(ref.id); deleted.push(ref.id); }),
      });
      for (const write of writes) write();
      return result;
    },
  };
  const paths = ['avatars/complete.png', ...Array.from({ length: 101 }, (_, i) => `resumes/progress/${String(i).padStart(3, '0')}.pdf`)];
  const bucket = { name: 'fictional.example', getFiles: cleanupFiles(paths, (name, options) => {
    assert.equal(options.ifGenerationMatch, 123); uploadDeletes.push(name);
  }, options => listings.push(options)) };
  const auth = { deleteUser: async uid => { authDeletes.push(uid); if (uid === 'retry') throw Error('Transient provider failure'); } };
  const route = load('src/app/api/cron/account-cleanup/route.ts', {
    'node:crypto': requireNative('node:crypto'),
    'next/server': { NextResponse: Response }, 'firebase-admin/storage': { getStorage: () => ({ bucket: () => bucket }) },
    '@/lib/firebase-admin': { getAdminApp: () => ({}), getAdminAuth: () => auth, getAdminDb: () => db },
    // Execute the actual helper and its ownership callback; no synthetic cursor result.
    '@/lib/server/account-upload-cleanup': { cleanClosedAccountUploads },
  }, { process: { env: { CRON_SECRET: 'fictional-unit-secret' } } });
  assert.equal((await route.GET(new Request('https://example.invalid/cron'))).status, 401);
  assert.equal(scanned, 0);
  const before = Date.now();
  const response = await route.GET(new Request('https://example.invalid/cron', { headers: { authorization: 'Bearer fictional-unit-secret' } }));
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { completed: 1, failed: 1 });
  assert.deepEqual(deleted, ['complete']); assert.equal(updated[0].id, 'retry');
  assert.ok(Date.parse(updated[0].data.notBefore) >= before + 86400000);
  assert.deepEqual(authDeletes, ['complete', 'retry', 'progress']);
  assert.deepEqual(claims.map(write => write.id), ['complete', 'retry', 'progress']);
  assert.equal(new Set(claims.map(write => write.data.leaseOwner)).size, 3);
  for (const claim of claims) {
    assert.equal(claim.data.notBefore, claim.data.leaseUntil);
    assert.ok(Date.parse(claim.data.leaseUntil) >= before + 360000);
    assert.ok(ownershipReads.includes(claim.id), 'real helper invoked the route ownership callback');
  }
  assert.equal(stored.has('complete'), false);
  assert.equal(stored.get('retry').lastError, 'Cleanup needs retry');
  assert.equal(stored.get('retry').leaseOwner, null);
  assert.deepEqual(stored.get('progress').cursor, { prefixIndex: 1, pageToken: '100' });
  assert.equal(stored.get('progress').leaseOwner, null);
  assert.ok(Date.parse(stored.get('progress').notBefore) >= before + 60000);
  assert.equal(uploadDeletes.filter(name => name.startsWith('resumes/progress/')).length, 100);
  // Advance only the fictional job's due time, then resume its durable cursor.
  stored.get('progress').notBefore = '2020-01-01T00:00:00.000Z';
  const resumed = await route.GET(new Request('https://example.invalid/cron', { headers: { authorization: 'Bearer fictional-unit-secret' } }));
  assert.equal(resumed.status, 200); assert.deepEqual(await resumed.json(), { completed: 1, failed: 0 });
  assert.deepEqual(deleted, ['complete', 'progress']);
  assert.deepEqual([...stored.keys()], ['retry']);
  assert.equal(listings.at(-1).pageToken, '100');
  assert.equal(uploadDeletes.length, 102);
  assert.equal(new Set(uploadDeletes).size, 102, 'continuation does not restart or repeat deletions');
  assert.equal(authDeletes.filter(id => id === 'retry').length, 1, 'backoff excludes the failed job from the second scan');
});

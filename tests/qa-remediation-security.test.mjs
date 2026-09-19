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

const requireNative = createRequire(import.meta.url);
function load(file, dependencies, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { exports, URL, URLSearchParams, Response, console, ...globals, require: id => {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    if (id.startsWith('react')) return requireNative(id);
    throw Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}

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

test('closed-account upload cleanup preserves shared files, rejects live accounts and pins generations', async () => {
  let closed = false;
  const deletions = [], authDeletes = [];
  const uid = 'qa-owner', bucketName = 'fictional.example';
  const shared = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(`resumes/${uid}/shared.pdf`)}?token=fictional`;
  const db = { doc: () => ({ get: async () => ({ data: () => closed ? { status: 'deleted', deletedAt: 'now' } : { status: 'active' } }) }), collection: () => ({ where: () => ({ get: async () => ({ docs: [{ data: () => ({ resumeUrl: shared }) }] }) }) }) };
  const auth = { deleteUser: async id => { authDeletes.push(id); throw Object.assign(Error('absent'), { code: 'auth/user-not-found' }); } };
  const bucket = { name: bucketName, getFiles: async ({ prefix }) => [[prefix.startsWith('avatars/') ? `avatars/${uid}.png` : `resumes/${uid}/private.pdf`, `resumes/${uid}/shared.pdf`, 'resumes/foreign/file.pdf', `application-documents/${uid}/archive.pdf`].map(name => ({ name, metadata: { generation: '123' }, delete: async options => deletions.push({ name, options }) }))] };
  await assert.rejects(cleanClosedAccountUploads(db, bucket, auth, uid), /closed/);
  assert.equal(authDeletes.length, 0);
  closed = true;
  const result = await cleanClosedAccountUploads(db, bucket, auth, uid);
  assert.equal(result.deleted, 2);
  assert.deepEqual(deletions.map(d => d.name), [`avatars/${uid}.png`, `resumes/${uid}/private.pdf`]);
  assert.ok(deletions.every(d => d.options.ifGenerationMatch === 123));
  await assert.rejects(cleanClosedAccountUploads(db, bucket, auth, '../foreign'), /identity/);
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
    '@/lib/firebase-admin': { getAdminDb: () => ({}), getAdminAuth: () => ({ generatePasswordResetLink: async (email, settings) => {
      generated++; assert.equal(email, 'qa@example.invalid'); assert.equal(settings.url, 'https://www.iopps.ca/login');
      if (failure === 'missing') throw Object.assign(Error(), { code: 'auth/user-not-found' });
      return 'https://fictional.firebaseapp.com/action?mode=resetPassword&code=fictional';
    } }) },
    '@/lib/email': { sendAccountPasswordResetEmail: async () => { sent++; if (failure === 'provider') throw Error('Provider unavailable'); } },
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

test('account cleanup cron requires its secret and retains failed jobs with a later retry', async () => {
  let scanned = 0; const deleted = [], updated = [];
  const jobs = ['complete', 'retry'].map(id => ({ id, ref: { delete: async () => deleted.push(id), update: async data => updated.push({ id, data }) } }));
  const route = load('src/app/api/cron/account-cleanup/route.ts', {
    'next/server': { NextResponse: Response }, 'firebase-admin/storage': { getStorage: () => ({ bucket: () => ({}) }) },
    '@/lib/firebase-admin': { getAdminApp: () => ({}), getAdminAuth: () => ({}), getAdminDb: () => ({ collection: name => {
      assert.equal(name, 'account_cleanup'); return { where: (field, op) => { assert.equal(field, 'notBefore'); assert.equal(op, '<='); return { limit: count => { assert.equal(count, 50); return { get: async () => { scanned++; return { docs: jobs }; } }; } }; } };
    } }) },
    '@/lib/server/account-upload-cleanup': { cleanClosedAccountUploads: async (_db, _bucket, _auth, uid) => { if (uid === 'retry') throw Error('Transient provider failure'); } },
  }, { process: { env: { CRON_SECRET: 'fictional-unit-secret' } } });
  assert.equal((await route.GET(new Request('https://example.invalid/cron'))).status, 401);
  assert.equal(scanned, 0);
  const before = Date.now();
  const response = await route.GET(new Request('https://example.invalid/cron', { headers: { authorization: 'Bearer fictional-unit-secret' } }));
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { completed: 1, failed: 1 });
  assert.deepEqual(deleted, ['complete']); assert.equal(updated[0].id, 'retry');
  assert.ok(Date.parse(updated[0].data.notBefore) >= before + 86400000);
});

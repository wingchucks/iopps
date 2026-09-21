// Parent-owned build/emulators only. Run explicitly after the fresh build is ready.
// No builds, deployments, provider calls, historical Auth changes, or broad cleanup.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { startIsolatedQaServer } from './local-qa-server.mjs';

const project = 'demo-iopps-preview';
assert.equal(process.env.GCLOUD_PROJECT, project);
for (const [key, value] of Object.entries({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' })) assert.equal(process.env[key], value, key);
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_ADMIN_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY']) assert.ok(!process.env[key], `Refusing credential-bearing environment: ${key}`);
for (const key of ['GOOGLE_CLOUD_PROJECT', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID']) if (process.env[key]) assert.equal(process.env[key], project, key);
const output = path.join(process.env.IOPPS_CLEANUP_OUTPUT || 'C:/Users/natha/Documents/Codex/2026-09-21/individual-safe-cleanup/acceptance', 'cleanup-browser');
await fs.mkdir(output, { recursive: true });
const app = initializeApp({ projectId: project }, 'safe-cleanup-' + randomUUID());
const db = getFirestore(app), auth = getAuth(app);
const prefix = 'qa-cleanup-' + randomUUID();
const oldId = prefix + '-old', canonicalId = prefix + '-canonical', uid = prefix + '-member';
const oldEmployer = 'jNQB1XrW8DfwmN6hABeyym7br4y1', canonicalEmployer = 'tsRvNLiRWARbOoiBOiEVFDwFfZn2';
const historicalSlug = prefix + '-historic-role';
const canonicalSlug = 'fictional-full-original-canonical-title--' + canonicalId;
const destination = '/jobs/' + canonicalSlug;
const title = 'Fictional Full Original Canonical Title — Community Support Coordinator';
const sourceCid = '00000000-0000-4000-8000-000000000001';
const sourceKey = `adp:${sourceCid}:${prefix}`;
const externalUrl = `https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=${sourceCid}&jobId=${prefix}`;
const docs = [], checks = [], blocked = [], pageErrors = [];
let browser, context, page, server, authCreated = false, failure, applicationBefore, applicationRef;
const scrub = value => String(value).replace(/([?&](?:oobCode|apiKey|token|key)=)[^\s&"']+/gi, '$1[REDACTED]').replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
async function json(name, value) { await fs.writeFile(path.join(output, name + '.json'), JSON.stringify(value, null, 2)); }
async function record(name, data = {}) { checks.push({ name, status: 'pass', ...data }); await json('results', checks); }
async function seed(collection, id, data) {
  const ref = db.collection(collection).doc(id);
  assert.equal((await ref.get()).exists, false, 'Refuse preexisting fixture: ' + ref.path);
  await ref.create(data); docs.push(ref); return ref;
}
async function screenshot(name) { await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true }); }
function noPermanentCache(response, requireNoStore = false) {
  const cache = response.headers.get('cache-control') || '';
  assert.match(cache, requireNoStore ? /(?:^|[,\s])no-store(?:$|[,\s])/i : /no-store|no-cache|max-age=0/i);
  assert.doesNotMatch(cache, /(?:s-maxage|max-age)\s*=\s*[1-9]|immutable/i);
  assert.ok(![301, 308].includes(response.status));
}
async function http(route, options = {}) {
  assert.ok(route.startsWith('/') && !route.startsWith('//'));
  return fetch(server.base + route, { ...options, redirect: 'manual', signal: AbortSignal.timeout(45000) });
}
async function aliases(body, status = 200) {
  const response = await http('/api/jobs/aliases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal(response.status, status); noPermanentCache(response, true); return response.json();
}
async function unchangedApplication() {
  if (!applicationBefore) return;
  const snapshot = await applicationRef.get();
  assert.equal(snapshot.exists, true);
  assert.deepEqual(snapshot.data(), applicationBefore, 'Historical application fields must remain identical');
  assert.equal(snapshot.data().employerId, oldEmployer);
}
try {
  server = await startIsolatedQaServer();
  const now = Timestamp.now();
  const canonical = { title, slug: canonicalSlug, employerId: canonicalEmployer, orgId: canonicalEmployer, employerName: 'Fictional QA Organization', location: 'Saskatoon, SK', description: 'Fictional full original canonical description. No real opening or provider action.', category: 'Social Services', active: true, status: 'active', applicationMethod: 'external', externalUrl, externalId: prefix, closingDate: '2099-12-31', createdAt: now, updatedAt: now };
  const canonicalRef = await seed('jobs', canonicalId, canonical);
  await seed('jobs', oldId, { ...canonical, title: 'Fictional historical duplicate', slug: historicalSlug, employerId: oldEmployer, orgId: oldEmployer, active: false, status: 'deleted', deletedAt: now, duplicateOf: canonicalId });
  const alias = { schemaVersion: 1, active: true, kind: 'duplicate', originalId: oldId, canonicalId, sourceKey, auditId: prefix + '-audit', slugs: [historicalSlug], redirectStatus: 307 };
  const aliasRef = await seed('jobAliases', oldId, alias);
  applicationRef = await seed('applications', prefix + '-historical-application', { userId: uid, jobId: oldId, employerId: oldEmployer, status: 'submitted', coverLetter: 'Fictional immutable original submission', jobTitle: 'Fictional historical duplicate', submittedAt: now, applicantSnapshot: { displayName: 'Fictional QA Member', email: prefix + '@example.invalid' } });
  applicationBefore = (await applicationRef.get()).data();
  const expected = { aliases: [{ originalId: oldId, canonicalId, destination }] };
  assert.deepEqual(await aliases({ ids: [oldId, canonicalId] }), expected);
  await record('post-aliases-exact-sanitized-v1-mapping-no-store');
  const response = await http('/jobs/' + historicalSlug);
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), destination); noPermanentCache(response);
  await record('built-http-historical-slug-exact-307-no-permanent-cache', { destination, cacheControl: response.headers.get('cache-control') });

  const chromeEnv = {};
  for (const key of ['SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PROGRAMFILES', 'PROGRAMDATA']) if (process.env[key]) chromeEnv[key] = process.env[key];
  browser = await chromium.launch({ channel: 'chrome', headless: true, env: chromeEnv });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const allowedPorts = new Set([new URL(server.base).port, '8080', '9099', '9199']);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && allowedPorts.has(url.port)) return route.continue();
    blocked.push({ protocol: url.protocol, host: url.hostname, path: url.pathname }); return route.abort();
  });
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(scrub(error.message)));
  await page.goto(server.base + '/jobs/' + historicalSlug);
  await expect(page).toHaveURL(server.base + destination);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).pathname, destination);
  assert.ok(!page.url().includes('--' + canonicalId + '--' + canonicalId));
  await screenshot('canonical-original-title');
  await record('chrome-follow-full-original-title-persisted-suffix-normalized');

  for (const body of [{ ids: ['../invalid'] }, { ids: [oldId], extra: true }, { ids: 'invalid' }, { ids: Array(51).fill(oldId) }, { ids: [null] }]) await aliases(body, 400);
  await record('invalid-request-schema-ids-size-fail-closed-no-store');
  for (const patch of [{ schemaVersion: 2 }, { redirectStatus: 308 }, { sourceKey: 'adp:invalid:wrong' }, { originalId: canonicalId }]) {
    await aliasRef.set({ ...alias, ...patch });
    assert.deepEqual(await aliases({ ids: [oldId, canonicalId] }), { aliases: [] });
    const unavailable = await http('/jobs/' + historicalSlug);
    assert.ok(![301, 302, 303, 307, 308].includes(unavailable.status)); assert.equal(unavailable.headers.get('location'), null); noPermanentCache(unavailable);
  }
  await aliasRef.set(alias);
  await record('invalid-stored-alias-schema-status-source-identity-no-redirect');
  for (const patch of [{ active: false, status: 'closed' }, { active: true, status: 'deleted', deletedAt: now }]) {
    await canonicalRef.set({ ...canonical, ...patch });
    assert.deepEqual(await aliases({ ids: [oldId, canonicalId] }), { aliases: [] });
    const unavailable = await http('/jobs/' + historicalSlug);
    assert.ok(![301, 302, 303, 307, 308].includes(unavailable.status)); assert.equal(unavailable.headers.get('location'), null); noPermanentCache(unavailable);
  }
  await canonicalRef.delete();
  assert.deepEqual(await aliases({ ids: [oldId] }), { aliases: [] });
  const missing = await http('/jobs/' + historicalSlug);
  assert.ok(![301, 302, 303, 307, 308].includes(missing.status)); assert.equal(missing.headers.get('location'), null); noPermanentCache(missing);
  await canonicalRef.create(canonical);
  assert.deepEqual(await aliases({ ids: [oldId] }), expected);
  await record('inactive-deleted-missing-canonical-no-alias-no-redirect-restoration-visible');
  await unchangedApplication();

  const email = prefix + '@example.invalid', password = 'Fictional-cleanup-only-2026!';
  await auth.createUser({ uid, email, password, emailVerified: true, displayName: 'Fictional Cleanup QA' }); authCreated = true;
  for (const collection of ['users', 'members']) await seed(collection, uid, { uid, email, displayName: 'Fictional Cleanup QA', role: 'community', accountType: 'community', onboardingComplete: true, profileComplete: true, location: 'Saskatoon, SK', interests: ['jobs'] });
  const saves = [];
  for (const [index, postId] of [oldId, canonicalId].entries()) saves.push(await seed('saved_items', prefix + '-actual-save-' + index, { userId: uid, postId, postTitle: title, postType: 'job', postOrgName: 'Fictional QA Organization', savedAt: now }));
  await page.goto(server.base + '/login');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url => !['/login', '/verify-email'].includes(url.pathname));
  assert.ok((await context.cookies()).some(cookie => cookie.name === '__session' && cookie.value));
  await page.goto(server.base + '/saved');
  // Each card has an icon link plus one title link; assert one titled canonical link/card, not one anchor total.
  const titleLink = page.locator('a').filter({ hasText: title });
  await expect(titleLink).toHaveCount(1); await expect(titleLink).toHaveAttribute('href', destination);
  await expect(page.getByTitle('Remove from saved', { exact: true })).toHaveCount(1);
  for (const ref of saves) assert.equal((await ref.get()).exists, true);
  await screenshot('saved-one-canonical-group');
  await page.getByTitle('Remove from saved', { exact: true }).click();
  await expect.poll(async () => (await Promise.all(saves.map(ref => ref.get()))).every(snap => !snap.exists)).toBe(true);
  await expect(titleLink).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No saved items yet', exact: true })).toBeVisible();
  await expect(page.getByTitle('Remove from saved', { exact: true })).toHaveCount(0);
  await screenshot('saved-both-documents-removed');
  await record('saved-authenticated-group-one-canonical-title-link-ui-removes-both-actual-docs', { savedDocumentIds: saves.map(ref => ref.id) });
  await unchangedApplication(); await record('original-application-all-fields-and-original-employer-unchanged');
  assert.deepEqual(pageErrors, [], 'Unexpected browser page errors');
} catch (error) {
  failure = error;
  checks.push({ name: 'browser-acceptance', status: 'fail', error: scrub(error.message) });
  if (page && !page.isClosed()) {
    try { await screenshot('failure'); } catch { /* retain original failure */ }
  }
} finally {
  const cleanup = { documents: [], auth: { uid, created: authCreated, absent: false }, serverStopped: !server, browserStopped: !browser, errors: [] };
  async function cleanStep(name, action) { try { await action(); } catch (error) { cleanup.errors.push({ name, error: scrub(error.message) }); } }
  await cleanStep('application-preservation-before-cleanup', unchangedApplication);
  await cleanStep('browser', async () => { if (browser) await browser.close(); cleanup.browserStopped = true; });
  await cleanStep('server', async () => {
    if (server) {
      await server.stop();
      await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(Number(new URL(server.base).port), '127.0.0.1', () => probe.close(resolve)); });
    }
    cleanup.serverStopped = true;
  });
  for (const ref of docs) await cleanStep(ref.path, async () => { await ref.delete(); const absent = !(await ref.get()).exists; cleanup.documents.push({ path: ref.path, absent }); assert.equal(absent, true); });
  await cleanStep('fictional-auth', async () => {
    if (authCreated) await auth.deleteUser(uid);
    await assert.rejects(auth.getUser(uid), error => error.code === 'auth/user-not-found'); cleanup.auth.absent = true;
  });
  await cleanStep('admin-app', () => deleteApp(app));
  await json('cleanup', cleanup); await json('results', checks);
  await json('network', { blocked, pageErrors, policy: 'Only owned HTTP server and demo emulators on 127.0.0.1; service workers blocked; no provider navigation or credentials recorded.' });
  if (cleanup.errors.length && !failure) failure = new Error('Cleanup verification failed; inspect cleanup.json');
}
if (failure) { console.error(scrub(failure.message)); process.exitCode = 1; }
else console.log('Safe cleanup browser acceptance and exact fixture absence verified. Evidence: ' + output);

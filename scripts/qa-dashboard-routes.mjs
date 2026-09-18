// Real root application, demo Auth/Firestore, fictional accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const base = process.env.QA_BASE_URL;
assert.ok(base && new URL(base).hostname === '127.0.0.1');
const output = path.resolve('test-results/release-browser/dashboards');
await fs.mkdir(output, { recursive: true });
const app = initializeApp({ projectId: 'demo-iopps-preview' }, 'ui-route-browser');
const auth = getAuth(app), db = getFirestore(app);
const prefix = 'qa-ui-' + crypto.randomUUID();
const password = 'Fictional-test-password-2026!';
const accounts = {};
const documents = [];
let browser, currentPage;
const checks = [];
const runtimeErrors = [];
const authChecks = [];
const interactionChecks = [];
async function seed(collection, id, data) {
  const ref = db.collection(collection).doc(id); documents.push(ref); await ref.set(data);
}
async function isolatedContext(width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' && [new URL(base).port, '8080', '9099', '9199'].includes(url.port) ? route.continue() : route.abort();
  });
  return context;
}
async function login(page, role) {
  await page.goto(base + '/login');
  await page.getByLabel('Email address', { exact: true }).fill(accounts[role].email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !['/login', '/verify-email'].includes(url.pathname), { timeout: 30000 });
}
async function fixtureToken(role) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fictional-emulator-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accounts[role].email, password, returnSecureToken: true }),
  });
  assert.equal(response.status, 200, 'Fictional emulator sign-in');
  return (await response.json()).idToken;
}
async function checkTeamDenial(width) {
  const token = await fixtureToken('teammate');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const member = db.doc(`members/${accounts.owner.uid}`), user = db.doc(`users/${accounts.owner.uid}`);
  const before = [(await member.get()).data(), (await user.get()).data()];
  assert.equal((await fetch(base + '/api/employer/team', { headers })).status, width === 1440 ? 200 : 403);
  assert.equal((await fetch(base + '/api/employer/team', { method: 'PATCH', headers,
    body: JSON.stringify({ uid: accounts.owner.uid, role: 'member' }) })).status, 403);
  assert.deepEqual([(await member.get()).data(), (await user.get()).data()], before);
  const context = await isolatedContext(width), page = await context.newPage(); currentPage = page;
  page.on('pageerror', error => runtimeErrors.push({ role: 'teammate', width, message: error.message }));
  await login(page, 'teammate');
  await page.goto(base + '/org/dashboard/team');
  await page.waitForURL(url => url.pathname === '/org/dashboard');
  assert.equal(await page.getByRole('heading', { name: 'Team Members', exact: true }).count(), 0);
  interactionChecks.push({ check: 'team-denied', orgRole: width === 1440 ? 'admin' : 'member', width, passed: true });
  await context.close();
}
async function checkRemoval(page, width) {
  const role = `removal-${width}`, label = `QA ${role}`;
  assert.equal(await page.getByLabel('Role for QA owner', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Remove QA owner', exact: true }).count(), 0);
  const target = db.doc(`members/${accounts[role].uid}`);
  const before = (await target.get()).data();
  let patches = 0;
  const onRequest = request => { if (new URL(request.url()).pathname === '/api/employer/team' && request.method() === 'PATCH') patches++; };
  page.on('request', onRequest);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: `Remove ${label}`, exact: true }).click();
  assert.equal(patches, 0); assert.deepEqual((await target.get()).data(), before);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Remove ${label}`, exact: true }).click();
  await page.getByText('Member removed', { exact: true }).waitFor();
  assert.equal(patches, 1); page.off('request', onRequest);
  assert.equal(await page.getByRole('button', { name: `Remove ${label}`, exact: true }).count(), 0);
  for (const collection of ['users', 'members']) {
    const data = (await db.doc(`${collection}/${accounts[role].uid}`).get()).data();
    for (const key of ['orgId', 'employerId', 'orgRole', 'orgName']) assert.equal(data[key], undefined);
    assert.equal(data.role, 'community');
  }
  assert.deepEqual((await auth.getUser(accounts[role].uid)).customClaims, { qaUnrelatedClaim: true });
  const context = await isolatedContext(width), removedPage = await context.newPage(); currentPage = removedPage;
  removedPage.on('pageerror', error => runtimeErrors.push({ role, width, message: error.message }));
  await login(removedPage, role);
  assert.equal(new URL(removedPage.url()).pathname, '/feed');
  const token = await fixtureToken(role);
  assert.equal((await fetch(base + '/api/employer/team', { headers: { Authorization: `Bearer ${token}` } })).status, 403);
  interactionChecks.push({ check: 'team-remove-cancel-confirm-claims-reauth', width, passed: true });
  await context.close(); currentPage = page;
}
async function checkTheme(page, context, width) {
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const other = await context.newPage();
  other.on('pageerror', error => runtimeErrors.push({ role: 'owner-theme-tab', width, message: error.message }));
  await other.goto(base + '/settings');
  await other.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).filter({ visible: true }).first().click();
  await other.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  await page.reload();
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  await other.close();
  interactionChecks.push({ check: 'theme-dark-hydration-cross-tab-persistence', width, passed: true });
}
async function checkBlockedThemeStorage() {
  const context = await isolatedContext(1440);
  await context.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(key) { if (key === 'iopps-theme') throw new DOMException('Fictional denied theme storage', 'SecurityError'); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key === 'iopps-theme') throw new DOMException('Fictional denied theme storage', 'SecurityError'); return set.call(this, key, value); };
  });
  const page = await context.newPage(); currentPage = page;
  page.on('pageerror', error => runtimeErrors.push({ role: 'owner', width: 1440, message: error.message }));
  await login(page, 'owner');
  for (const next of ['dark', 'light']) {
    await page.getByRole('button', { name: `Switch to ${next} mode`, exact: true }).filter({ visible: true }).first().click();
    await page.waitForFunction(value => document.documentElement.getAttribute('data-theme') === value, next);
  }
  interactionChecks.push({ check: 'theme-denied-storage-still-toggles', width: 1440, passed: true });
  await context.close();
}
async function checkAdminModal(page, kind, width) {
  const conference = kind === 'conferences', title = conference ? 'Conference' : 'Pow Wow';
  const beforeOverflow = await page.evaluate(() => document.body.style.overflow);
  const add = page.getByRole('button', { name: conference ? 'Add Conference' : 'Add New Pow Wow', exact: true });
  await add.click();
  const dialog = page.getByRole('dialog', { name: `Add New ${title}`, exact: true });
  const field = dialog.getByLabel(conference ? 'Title' : 'Name', { exact: true });
  await field.fill(`Fictional unsaved ${title}`);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await page.evaluate(() => document.body.style.overflow), beforeOverflow);
  await add.click(); assert.equal(await field.inputValue(), '');
  await field.fill(`Fictional retained ${title}`);
  const url = `${base}/api/admin/${kind}`;
  await page.route(url, route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fictional temporary save failure' }) })
    : route.fallback());
  const failedSave = page.waitForResponse(response => response.url() === url && response.request().method() === 'POST');
  const submit = dialog.locator('button[type="submit"]');
  await submit.click();
  assert.equal((await failedSave).status(), 503);
  await page.getByText(conference ? 'Failed to create conference' : 'Failed to create pow wow', { exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('[role="dialog"] button[type="submit"]').disabled);
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await submit.isEnabled(), true);
  assert.equal(await field.inputValue(), `Fictional retained ${title}`);
  await page.screenshot({ path: path.join(output, `${kind}-${width}-failed-save.png`), fullPage: true });
  await page.unroute(url);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await page.evaluate(() => document.body.style.overflow), beforeOverflow);
  interactionChecks.push({ check: `${kind}-modal-cancel-reset-failed-save-preserves`, width, passed: true });
}
try {
  for (const role of ['member', 'owner', 'school', 'admin', 'teammate', 'removal-1440', 'removal-390']) {
    const uid = `${prefix}-${role}`, email = `${uid}@example.invalid`;
    accounts[role] = { uid, email };
    await auth.createUser({ uid, email, emailVerified: true, password, displayName: `QA ${role}` });
    const data = { uid, email, displayName: `QA ${role}`, role: role === 'admin' ? 'admin' : 'community', onboardingComplete: true, createdAt: Timestamp.now() };
    if (role === 'owner' || role === 'school' || role === 'teammate' || role.startsWith('removal-')) Object.assign(data, { orgId: role === 'school' ? uid : `${prefix}-owner`, employerId: role === 'school' ? uid : `${prefix}-owner`, orgRole: role === 'teammate' || role.startsWith('removal-') ? 'member' : 'owner' });
    if (role === 'member') Object.assign(data, { skills: ['QA route testing'], openToWork: true, location: 'Saskatoon, SK' });
    await seed('users', uid, data); await seed('members', uid, data);
    if (role === 'admin') await auth.setCustomUserClaims(uid, { admin: true, role: 'admin' });
    if (role.startsWith('removal-')) await auth.setCustomUserClaims(uid, { orgId: `${prefix}-owner`, employerId: `${prefix}-owner`, orgRole: 'member', role: 'organization', employer: true, qaUnrelatedClaim: true });
  }
  const org = { id: accounts.owner.uid, uid: accounts.owner.uid, ownerId: accounts.owner.uid, name: 'QA Dashboard Organization', slug: accounts.owner.uid,
    type: 'business', role: 'employer', status: 'approved', plan: 'free', onboardingComplete: true, createdAt: Timestamp.now(),
    description: 'Fictional local organization used to verify dashboard navigation.', contactName: 'QA Owner',
    contactEmail: accounts.owner.email, logoUrl: '/icon-192.png', location: { city: 'Saskatoon', province: 'Saskatchewan' }, capabilities: ['post_jobs', 'list_business'] };
  await seed('employers', accounts.owner.uid, org); await seed('organizations', accounts.owner.uid, org);
  const school = { ...org, id: accounts.school.uid, uid: accounts.school.uid, ownerId: accounts.school.uid, slug: accounts.school.uid, name: 'QA Dashboard School', type: 'school', contactEmail: accounts.school.email };
  await seed('employers', accounts.school.uid, school); await seed('organizations', accounts.school.uid, school);
  for (const status of ['active', 'draft']) await seed('jobs', `${prefix}-${status}`, {
    id: `${prefix}-${status}`, slug: `${prefix}-${status}`, title: `QA ${status} dashboard job`, employerId: accounts.owner.uid, orgId: accounts.owner.uid,
    employerName: org.name, location: 'Saskatoon, SK', description: 'Fictional QA job.', descriptionFormat: 'plain-text',
    employmentType: 'Full-time', active: status === 'active', status, createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000 * 7),
  });

  await seed('posts', `${prefix}-post-only`, {
    orgId: accounts.owner.uid, type: 'job', title: 'QA post-only dashboard job', status: 'draft', active: false, createdAt: Timestamp.now(),
  });
  for (const kind of ['events', 'scholarships']) {
    await seed(kind, `${prefix}-${kind}-active`, {
      id: `${prefix}-${kind}-active`, slug: `${prefix}-${kind}-active`, kind, title: `QA published ${kind}`,
      orgId: accounts.owner.uid, employerId: accounts.owner.uid, status: 'active', active: true,
      startDate: '2099-09-18', deadline: '2099-10-18', createdAt: new Date().toISOString(),
    });
    await seed('organizationOpportunityDrafts', `${kind}-${prefix}-private`, {
      id: `${prefix}-private`, kind, title: `QA private ${kind}`, orgId: accounts.owner.uid,
      status: 'draft', active: false, createdAt: new Date().toISOString(),
    });
    await seed(kind, `${prefix}-${kind}-foreign`, { title: `QA foreign ${kind}`, orgId: `${prefix}-foreign`, status: 'active', active: true });
  }
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    for (const role of ['owner', 'school', 'member', 'admin']) {
      const context = await isolatedContext(width);
      if (role === 'owner' && width === 1440) await context.addInitScript(() => {
        if (!sessionStorage.getItem('qa-theme-initialized')) {
          localStorage.setItem('iopps-theme', 'dark'); sessionStorage.setItem('qa-theme-initialized', 'true');
        }
      });
      const errors = [], missing = [], retired = [], accountResolutions = [], loginDocuments = [];
      const page = await context.newPage(); currentPage = page;
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => {
        const detail = { role, width, url: page.url(), message: error.message, stack: error.stack };
        errors.push(detail); runtimeErrors.push(detail);
        console.error('Dashboard browser error:', JSON.stringify(detail));
      });
      page.on('response', response => { if (response.status() === 404 && new URL(response.url()).pathname.startsWith('/api/')) missing.push(response.url()); });
      page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/talent')) retired.push(request.url()); });
      page.on('request', request => {
        const pathname = new URL(request.url()).pathname;
        if (pathname === '/api/auth/account') accountResolutions.push(pathname);
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) loginDocuments.push(pathname);
      });
      await login(page, role);
      assert.equal(accountResolutions.length, 1, `${role} sign-in must resolve its destination once`);
      assert.equal(loginDocuments.filter(pathname => pathname !== '/login').length, 1, `${role} sign-in must navigate once`);
      authChecks.push({ role, width, accountResolutions: accountResolutions.length, documents: [...loginDocuments] });
      if (role === 'owner' && width === 1440) await checkTheme(page, context, width);
      const routes = role === 'owner' ? [
        ['/org/dashboard', 'QA Dashboard Organization'],
        ['/employer/dashboard?tab=Jobs', 'QA active dashboard job'],
        ['/org/dashboard?tab=Talent%20Search', 'Talent Search'],
        ['/org/dashboard?create=job&tab=Jobs', 'Post a New Job'],
        ['/org/dashboard?tab=Team', 'Team Members'],
        ['/org/dashboard?tab=Events', 'Events & gatherings'],
        ['/org/dashboard?tab=Scholarships', 'Scholarships & funding'],
        ['/org/dashboard?tab=Billing', 'Billing & Plan'],
        ['/org/dashboard/analytics', 'Hiring activity'],
        ['/org/dashboard/templates', 'QA active dashboard job'],
        ['/org/dashboard?tab=Edit%20Profile&section=Identity', 'Identity'],
      ] : role === 'school' ? [
        ['/org/dashboard', 'QA Dashboard School'], ['/org/dashboard?tab=Programs', 'No school programs yet'],
        ['/org/dashboard?tab=Student%20Inquiries', 'No student inquiries yet'],
      ] : role === 'admin' ? [
        ['/admin', 'Admin Dashboard'], ['/admin/jobs', 'QA active dashboard job'], ['/admin/employers', 'QA Dashboard Organization'],
        ['/admin/conferences', 'Conferences'], ['/admin/powwows', 'Pow Wows'],
      ] : [
        ['/profile', 'QA member'], ['/settings', 'Help & Support'], ['/applications', 'Applications'], ['/saved', 'Saved'],
      ];
      for (const [route, expected] of routes) {
        console.log(`Checking ${role} at ${width}px: ${route}`);
        await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.getByText(expected, { exact: false }).filter({ visible: true }).first().waitFor();
        if (route.includes('tab=Jobs') && !route.includes('create=')) await page.getByText('QA post-only dashboard job', { exact: true }).waitFor();
        if (route.includes('create=')) {
          await page.getByRole('heading', { name: 'Post a New Job', exact: true }).waitFor();
          assert.equal(new URL(page.url()).pathname, '/org/dashboard/jobs/new');
        }
        if (route.includes('Talent')) {
          await page.getByPlaceholder('Search by name or skills...').fill('QA route testing');
          await page.getByText('QA member', { exact: true }).first().waitFor();
          assert.equal(new URL(page.url()).pathname, '/org/dashboard/talent');
        }
        if (route.includes('tab=Team')) {
          await page.getByLabel('Role for QA teammate', { exact: true }).waitFor();
          assert.equal(await page.getByRole('button', { name: 'Send Invite' }).count(), 0);
          await page.getByLabel('Role for QA teammate', { exact: true }).selectOption(width === 1440 ? 'admin' : 'member');
          await page.getByText('Role updated', { exact: true }).waitFor();
          assert.equal((await db.doc(`members/${accounts.teammate.uid}`).get()).data().orgRole, width === 1440 ? 'admin' : 'member');
          await checkTeamDenial(width); currentPage = page;
          await checkRemoval(page, width);
        }
        if (route.includes('tab=Events') || route.includes('tab=Scholarships')) {
          const kind = route.includes('Events') ? 'events' : 'scholarships';
          assert.equal(new URL(page.url()).pathname, `/org/dashboard/${kind}`);
          await page.getByRole('heading', { name: expected, exact: true }).waitFor();
          const published = page.getByRole('article').filter({ hasText: `QA published ${kind}` });
          await published.waitFor();
          assert.equal(await published.getByRole('link', { name: 'View public listing' }).getAttribute('href'), `/${kind}/${prefix}-${kind}-active`);
          const privateListing = page.getByRole('article').filter({ hasText: `QA private ${kind}` });
          await privateListing.waitFor();
          assert.equal(await privateListing.getByRole('link').count(), 0);
          assert.equal(await page.getByText(`QA foreign ${kind}`, { exact: true }).count(), 0);
          assert.equal(await page.getByText(`QA private ${kind === 'events' ? 'scholarships' : 'events'}`, { exact: true }).count(), 0);
          await page.getByRole('button', { name: kind === 'events' ? '+ Create event' : '+ Create opportunity', exact: true }).click();
          const title = `QA new private ${kind} ${width}`;
          await page.getByLabel(kind === 'events' ? 'Event title' : 'Opportunity title').fill(title);
          const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/employer/${kind}` && response.request().method() === 'POST');
          await page.getByRole('button', { name: 'Save private draft', exact: true }).click();
          const response = await saved;
          assert.equal(response.status(), 201);
          const record = await response.json();
          const privateRef = db.doc(`organizationOpportunityDrafts/${kind}-${record.id}`); documents.push(privateRef);
          const stored = (await privateRef.get()).data();
          assert.equal(stored.title, title); assert.equal(stored.orgId, accounts.owner.uid); assert.equal(stored.status, 'draft');
          assert.equal((await db.doc(`${kind}/${record.id}`).get()).exists, false);
          await page.getByText('Private draft saved. It is not listed publicly.', { exact: true }).waitFor();
          interactionChecks.push({ check: `${kind}-owned-list-private-draft`, width, passed: true });
        }
        if (route === '/admin/jobs') {
          const active = page.getByRole('row').filter({ hasText: 'QA active dashboard job' });
          assert.equal(await active.getByRole('link', { name: 'View QA active dashboard job' }).getAttribute('href'), `/jobs/${prefix}-active`);
          assert.equal(await page.getByRole('row').filter({ hasText: 'QA draft dashboard job' }).getByRole('link').count(), 0);
        }
        if (route === '/settings') assert.equal(await page.getByRole('button', { name: 'Restart Tour' }).count(), 0);
        if (route === '/admin/conferences' || route === '/admin/powwows') await checkAdminModal(page, route.split('/').at(-1), width);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${role} ${route} overflows at ${width}`);
        const filename = `${role}-${width}-${checks.length}.png`;
        await page.screenshot({ path: path.join(output, filename), fullPage: true });
        checks.push({ role, width, requested: route, reached: new URL(page.url()).pathname + new URL(page.url()).search, screenshot: filename });
      }
      assert.deepEqual(retired, []); assert.deepEqual(missing, []); assert.deepEqual(errors, []);
      await context.close();
    }
  }
  await checkBlockedThemeStorage();
  for (const [source, destination] of [['/member/messages', '/messages'], ['/member/applications', '/applications'], ['/discover', '/jobs']]) {
    const response = await fetch(base + source + '?qa=bookmark', { redirect: 'manual' });
    assert.equal(response.status, 308);
    const location = new URL(response.headers.get('location'), base);
    assert.equal(location.pathname, destination); assert.equal(location.searchParams.get('qa'), 'bookmark');
  }
  assert.deepEqual(runtimeErrors, []);
  console.log(JSON.stringify({ checks: checks.length, authChecks: authChecks.length, interactionChecks: interactionChecks.length, allPassed: true, emulatorsOnly: true }));
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure.txt'), `${error.stack}\nURL: ${currentPage.url()}\n${await currentPage.locator('body').innerText().catch(() => '')}`);
  }
  throw error;
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, authChecks, interactionChecks, runtimeErrors }, null, 2));
  await browser?.close();
  for (const ref of documents) await ref.delete();
  for (const account of Object.values(accounts)) await auth.deleteUser(account.uid);
  await db.terminate(); await deleteApp(app);
}

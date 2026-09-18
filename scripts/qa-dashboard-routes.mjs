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
async function seed(collection, id, data) {
  const ref = db.collection(collection).doc(id); documents.push(ref); await ref.set(data);
}
try {
  for (const role of ['member', 'owner', 'school', 'admin', 'teammate']) {
    const uid = `${prefix}-${role}`, email = `${uid}@example.invalid`;
    accounts[role] = { uid, email };
    await auth.createUser({ uid, email, emailVerified: true, password, displayName: `QA ${role}` });
    const data = { uid, email, displayName: `QA ${role}`, role: role === 'admin' ? 'admin' : 'community', onboardingComplete: true, createdAt: Timestamp.now() };
    if (role === 'owner' || role === 'school' || role === 'teammate') Object.assign(data, { orgId: role === 'school' ? uid : `${prefix}-owner`, employerId: role === 'school' ? uid : `${prefix}-owner`, orgRole: role === 'teammate' ? 'member' : 'owner' });
    if (role === 'member') Object.assign(data, { skills: ['QA route testing'], openToWork: true, location: 'Saskatoon, SK' });
    await seed('users', uid, data); await seed('members', uid, data);
    if (role === 'admin') await auth.setCustomUserClaims(uid, { admin: true, role: 'admin' });
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
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    for (const role of ['owner', 'school', 'member', 'admin']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      const errors = [], missing = [], retired = [];
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.hostname === '127.0.0.1' && [new URL(base).port, '8080', '9099', '9199'].includes(url.port) ? route.continue() : route.abort();
      });
      const page = await context.newPage(); currentPage = page;
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() === 404 && new URL(response.url()).pathname.startsWith('/api/')) missing.push(response.url()); });
      page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/talent')) retired.push(request.url()); });
      await page.goto(base + '/login');
      await page.getByLabel('Email address', { exact: true }).fill(accounts[role].email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(url => !['/login', '/verify-email'].includes(url.pathname), { timeout: 30000 });
      const routes = role === 'owner' ? [
        ['/org/dashboard', 'QA Dashboard Organization'],
        ['/employer/dashboard?tab=Jobs', 'QA active dashboard job'],
        ['/org/dashboard?tab=Talent%20Search', 'Talent Search'],
        ['/org/dashboard?create=job&tab=Jobs', 'Post a New Job'],
        ['/org/dashboard?tab=Team', 'Team Members'],
        ['/org/dashboard?tab=Billing', 'Billing & Plan'],
        ['/org/dashboard/analytics', 'Hiring activity'],
        ['/org/dashboard/templates', 'QA active dashboard job'],
        ['/org/dashboard?tab=Edit%20Profile&section=Identity', 'Identity'],
      ] : role === 'school' ? [
        ['/org/dashboard', 'QA Dashboard School'], ['/org/dashboard?tab=Programs', 'No school programs yet'],
        ['/org/dashboard?tab=Student%20Inquiries', 'No student inquiries yet'],
      ] : role === 'admin' ? [
        ['/admin', 'Admin Dashboard'], ['/admin/jobs', 'QA active dashboard job'], ['/admin/employers', 'QA Dashboard Organization'],
      ] : [
        ['/profile', 'QA member'], ['/settings', 'Help & Support'], ['/applications', 'Applications'], ['/saved', 'Saved'],
      ];
      for (const [route, expected] of routes) {
        await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.getByText(expected, { exact: false }).first().waitFor();
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
        }
        if (route === '/admin/jobs') {
          const active = page.getByRole('row').filter({ hasText: 'QA active dashboard job' });
          assert.equal(await active.getByRole('link', { name: 'View QA active dashboard job' }).getAttribute('href'), `/jobs/${prefix}-active`);
          assert.equal(await page.getByRole('row').filter({ hasText: 'QA draft dashboard job' }).getByRole('link').count(), 0);
        }
        if (route === '/settings') assert.equal(await page.getByRole('button', { name: 'Restart Tour' }).count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${role} ${route} overflows at ${width}`);
        const filename = `${role}-${width}-${checks.length}.png`;
        await page.screenshot({ path: path.join(output, filename), fullPage: true });
        checks.push({ role, width, requested: route, reached: new URL(page.url()).pathname + new URL(page.url()).search, screenshot: filename });
      }
      assert.deepEqual(retired, []); assert.deepEqual(missing, []); assert.deepEqual(errors, []);
      await context.close();
    }
  }
  for (const [source, destination] of [['/member/messages', '/messages'], ['/member/applications', '/applications'], ['/discover', '/jobs']]) {
    const response = await fetch(base + source + '?qa=bookmark', { redirect: 'manual' });
    assert.equal(response.status, 308);
    const location = new URL(response.headers.get('location'), base);
    assert.equal(location.pathname, destination); assert.equal(location.searchParams.get('qa'), 'bookmark');
  }
  console.log(JSON.stringify({ checks: checks.length, allPassed: true, emulatorsOnly: true }));
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure.txt'), `${error.stack}\nURL: ${currentPage.url()}\n${await currentPage.locator('body').innerText().catch(() => '')}`);
  }
  throw error;
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks }, null, 2));
  await browser?.close();
  for (const ref of documents) await ref.delete();
  for (const account of Object.values(accounts)) await auth.deleteUser(account.uid);
  await db.terminate(); await deleteApp(app);
}

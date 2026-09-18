import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { auditRoutes } from '../scripts/audit-public-detail-links.mjs';

const require = createRequire(import.meta.url);
const root = process.env.IOPPS_UI_BASELINE || process.cwd();
function load(relative, overrides = {}) {
  const filename = path.join(root, relative);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id === 'next/navigation') return {
      redirect: location => { throw { location }; },
      notFound: () => { throw { notFound: true }; },
    };
    if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`);
    if (id.startsWith('.')) {
      const relative = path.relative(root, path.resolve(path.dirname(filename), id));
      return load(path.extname(relative) ? relative : relative + '.ts');
    }
    return require(id);
  }, loaded, loaded.exports);
  return loaded.exports;
}

const templates = load('src/lib/email-templates.ts');
for (const [name, args, destination] of [
  ['welcomeEmail', ['QA Member'], '/jobs'],
  ['applicationStatusEmail', ['QA Member', 'QA Job', 'reviewing'], '/applications'],
  ['newMessageEmail', ['QA Member', 'QA Sender'], '/messages'],
  ['eventReminderEmail', ['QA Member', 'QA Event', 'Tomorrow'], '/events'],
  ['jobMatchEmail', ['QA Member', 'QA Job', 'QA Organization'], '/jobs'],
]) {
  test(`${name} links to the current application route`, () => {
    const html = templates[name](...args);
    assert.ok(html.includes(`href="https://www.iopps.ca${destination}"`));
    assert.doesNotMatch(html, /https:\/\/www\.iopps\.ca\/(?:member\/|discover)/);
  });
}

const employerPage = load('src/app/employer/[[...slug]]/page.tsx').default;
test('legacy employer bookmarks preserve tab, checkout selection and repeated query values', async () => {
  for (const [slug, searchParams, location] of [
    [['dashboard'], { tab: 'Jobs' }, '/org/dashboard?tab=Jobs'],
    [['checkout'], { plan: 'growth', cycle: 'annual' }, '/org/checkout?plan=growth&cycle=annual'],
    [['dashboard', 'jobs'], { filter: ['draft', 'active'] }, '/org/dashboard/jobs?filter=draft&filter=active'],
  ]) {
    await assert.rejects(employerPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(searchParams) }), e => e.location === location);
  }
});

test('admin job links reflect native expiry timestamps before JSON serialization', async () => {
  const { Timestamp } = require('firebase-admin/firestore');
  const records = [
    { id: 'expired', active: true, status: 'active', expiresAt: Timestamp.fromDate(new Date('2000-01-01')) },
    { id: 'current', active: true, status: 'active', expiresAt: Timestamp.fromDate(new Date('2099-01-01')) },
    { id: 'draft', active: false, status: 'draft' },
  ];
  const query = { orderBy: () => query, limit: () => query, get: async () => ({ docs: records.map(record => ({ id: record.id, data: () => record })) }) };
  const { GET } = load('src/app/api/admin/jobs/route.ts', {
    '@/lib/server/admin-job-lifecycle': {},
    '@/lib/firebase-admin': { adminDb: { collection: () => query } },
    '@/lib/api-auth': { verifyAdminToken: async () => ({ success: true }) },
  });
  const response = await GET({ nextUrl: new URL('https://example.invalid/api/admin/jobs') });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).jobs.map(job => [job.id, job.publiclyVisible]), [['expired', false], ['current', true], ['draft', false]]);
});

test('legacy employer path segments cannot turn into queries or path traversal', async () => {
  await assert.rejects(employerPage({ params: Promise.resolve({ slug: ['dashboard', 'jobs', 'qa?tab=Billing', 'edit'] }), searchParams: Promise.resolve({}) }), e => e.location === '/org/dashboard/jobs/qa%3Ftab%3DBilling/edit');
  await assert.rejects(employerPage({ params: Promise.resolve({ slug: ['dashboard', '..', 'admin'] }), searchParams: Promise.resolve({}) }), e => e.notFound === true);
  await assert.rejects(employerPage({ params: Promise.resolve({ slug: ['unknown'] }), searchParams: Promise.resolve({}) }), e => e.notFound === true);
});

test('dashboard links use working canonical screens, without the retired talent endpoint', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/org/dashboard/page.tsx'), 'utf8');
  assert.doesNotMatch(source, /fetch\([`"']\/api\/talent/);
  const { getDashboardHref } = load('src/lib/dashboard-navigation.ts');
  assert.equal(getDashboardHref('Talent Search'), '/org/dashboard/talent');
  assert.equal(getDashboardHref('Team'), '/org/dashboard/team');
  assert.equal(getDashboardHref('Jobs'), '/org/dashboard/jobs');
  assert.equal(getDashboardHref('Billing'), '/org/dashboard/billing');
  assert.equal(getDashboardHref('Analytics'), '/org/dashboard?tab=Analytics');
  assert.equal(getDashboardHref('Templates'), '/org/dashboard/jobs');
});

test('dashboard redirects derive from the latest query and create-job takes priority', () => {
  const { getDashboardRedirect } = load('src/lib/dashboard-navigation.ts');
  assert.equal(getDashboardRedirect(new URLSearchParams('create=job&tab=Jobs')), '/org/dashboard/jobs/new');
  assert.equal(getDashboardRedirect(new URLSearchParams('tab=Jobs&filter=draft&filter=active')), '/org/dashboard/jobs?filter=draft&filter=active');
  assert.equal(getDashboardRedirect(new URLSearchParams('tab=Team')), '/org/dashboard/team');
  assert.equal(getDashboardRedirect(new URLSearchParams('tab=Analytics')), undefined);
  assert.equal(getDashboardRedirect(new URLSearchParams('tab=Overview')), undefined);
});

test('team management retains authenticated server updates without claiming unsent invitations', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/org/dashboard/team/page.tsx'), 'utf8');
  assert.match(source, /requiredRole="owner"/);
  assert.match(source, /\/api\/employer\/team/);
  assert.match(source, /method: "PATCH"/);
  assert.match(source, /getIdToken\(/);
  assert.doesNotMatch(source, /Invite sent|setDoc\(|teamInvites/);
});

test('active source navigation and API paths have a root route and do not generate retired URLs', () => {
  assert.deepEqual(auditRoutes(root).findings, []);
});

test('previously sent notification URLs and career links retain permanent compatibility redirects', async () => {
  const redirects = await load('next.config.ts').default.redirects();
  for (const [source, destination] of [
    ['/discover', '/jobs'], ['/member/applications', '/applications'],
    ['/member/messages', '/messages'], ['/careers/:path*', '/jobs/:path*'],
  ]) assert.ok(redirects.some(rule => rule.source === source && rule.destination === destination && rule.permanent));
});

test('analytics classifies the current public org route without counting dashboard or external lookalikes', () => {
  const { navigationEvent } = load('src/lib/analytics/navigation.ts');
  const base = 'https://www.iopps.ca';
  assert.equal(navigationEvent('/org/qa-organization', base), 'employer_profile_click');
  assert.equal(navigationEvent('/org/dashboard', base), 'internal_link_click');
  assert.equal(navigationEvent('/org/dashboard/jobs', base), 'internal_link_click');
  assert.equal(navigationEvent('https://example.invalid/jobs/qa', base), 'outbound_link_click');
  assert.equal(navigationEvent('/jobs/qa', base), 'job_detail_click');
});

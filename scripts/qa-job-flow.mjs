import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Local-only smoke test with explicitly fictional, intercepted API fixtures.
// No production authentication, application writes, emails, or external ATS calls.
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
const parsed = new URL(base);
assert.ok(['127.0.0.1', 'localhost'].includes(parsed.hostname), 'QA must never target production');
const output = path.resolve(process.env.QA_OUTPUT || 'test-results/job-flow-smoke');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.QA_CHROME_EXECUTABLE ? { executablePath: process.env.QA_CHROME_EXECUTABLE } : {}) });
const fixtures = [
  { id: 'qa-explicit-hourly', slug: 'qa-explicit-hourly', title: 'QA Community Coordinator', employerName: 'QA Community Organization', employerId: 'qa-org', location: 'Saskatoon, SK', employmentType: 'Full-time', status: 'active', active: true, description: 'Expected Compensation: The expected hourly hiring range is $23.00 to $27.75 based on a 21-hour work week.', externalUrl: 'https://employer.example/jobs/qa-role', createdAt: new Date().toISOString() },
  { id: 'qa-internal', slug: 'qa-internal', title: 'QA Program Assistant', employerName: 'QA Second Organization', employerId: 'qa-second', orgId: 'qa-second', location: 'Regina, SK', employmentType: 'Part-time', active: true, status: 'active', description: 'Fictional internal application QA fixture.', requiresResume: true, requiresCoverLetter: true, requiresReferences: true },
];
const findings = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.qaFunnelEvents = [];
      window.gtag = (...args) => window.qaFunnelEvents.push(args);
    });
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== parsed.origin) return route.abort();
      if (url.pathname === '/api/jobs') return route.fulfill({ json: { jobs: fixtures, count: fixtures.length } });
      if (url.pathname.startsWith('/api/jobs/')) {
        const job = fixtures.find(item => item.id === decodeURIComponent(url.pathname.split('/')[3]));
        return route.fulfill({ status: job ? 200 : 404, json: job ? { job } : { error: 'Not found' } });
      }
      if (url.pathname === '/api/organizations') return route.fulfill({ json: { orgs: [] } });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
      return route.continue();
    });
    await page.goto(`${base}/jobs`, { waitUntil: 'domcontentloaded' });
    await page.getByText(fixtures[0].title, { exact: true }).waitFor();
    const search = page.getByRole('searchbox', { name: 'Search jobs', exact: true });
    await search.fill('Community Coordinator');
    await page.getByText(fixtures[0].title, { exact: true }).waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes('QA Program Assistant'));
    await page.waitForFunction(() => window.qaFunnelEvents.some(e => e[1] === 'job_search_results' && e[2].result_count === 1));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'jobs must not overflow horizontally');
    await page.screenshot({ path: path.join(output, `jobs-${viewport.width}.png`), fullPage: true });
    await page.goto(`${base}/jobs/qa-explicit-hourly`, { waitUntil: 'domcontentloaded' });
    const apply = page.getByRole('link', { name: 'Apply on employer site', exact: true }).first();
    await apply.waitFor();
    assert.equal(await apply.getAttribute('href'), fixtures[0].externalUrl);
    await page.waitForFunction(() => window.qaFunnelEvents.some(e => e[1] === 'job_detail_view'));
    await apply.click(); // All non-local requests are blocked above; no ATS visit or submission.
    const events = await page.evaluate(() => window.qaFunnelEvents);
    assert.equal(events.filter(e => e[1] === 'job_detail_view').length, 1);
    assert.ok(events.some(e => e[1] === 'external_application_click'));
    assert.equal(events.some(e => e[1] === 'application_submitted'), false);
    await page.screenshot({ path: path.join(output, `detail-${viewport.width}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'detail must not overflow horizontally');
    findings.push({ viewport, search: 'pass', destination: 'pass', funnelEvents: 'pass', externalClickIsNotSubmission: true, horizontalOverflow: false, pageErrors: errors });
    assert.deepEqual(errors, [], 'no client runtime errors');
    await context.close();
  }
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ localFixtures: true, base, findings }, null, 2));
  console.log(JSON.stringify({ localFixtures: true, output, findings }, null, 2));
} finally { await browser.close(); }

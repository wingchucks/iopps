// Built Next/Chrome verification with exclusively fictional browser API responses.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

assert.equal(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'demo-iopps-preview');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.ok(fs.existsSync('.next/BUILD_ID'), 'Build the isolated application first');
for (const key of ['FIREBASE_PRIVATE_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY']) assert.ok(!process.env[key], `Unexpected credential: ${key}`);
const evidence = path.resolve('reports/opportunity-directory-retry/built');
fs.mkdirSync(evidence, { recursive: true });
const reservation = net.createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const base = `http://127.0.0.1:${port}`;
const log = fs.openSync(path.join(evidence, 'server.log'), 'w');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: process.env, stdio: ['ignore', log, log] });
const exit = new Promise(resolve => child.once('exit', code => resolve(code)));
let browser;
const rows = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(`${base}/events`, { signal: AbortSignal.timeout(2000), redirect: 'error' }); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'Owned Next server did not become ready');
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  for (const width of [1280, 390]) for (const kind of ['events', 'scholarships']) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 } });
    const page = await context.newPage(), errors = [], blocked = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    let release, attempts = 0;
    let gate = new Promise(resolve => { release = resolve; });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base) { blocked.push({ origin: url.origin, path: url.pathname }); return route.abort(); }
      if (url.pathname === `/api/${kind}`) {
        assert.equal(request.method(), 'GET');
        requests.push(url.pathname); attempts++;
        if (attempts > 1) await gate;
        if (attempts < 3) return route.fulfill({ status: 503, json: { error: 'Fictional outage' } });
        return route.fulfill({ json: { [kind]: [{ id: 'fictional-recovery', slug: 'fictional-recovery', title: 'Fictional recovered opportunity', description: 'Isolated browser fixture only.', orgName: 'Fictional provider', deadlineType: 'rolling', delivery: 'online' }] } });
      }
      if (url.pathname.startsWith('/api/')) {
        // Unrelated shell APIs never reach a database or delivery provider.
        return route.fulfill({ status: 200, json: url.pathname === '/api/auth/session' ? { authenticated: false } : {} });
      }
      if (request.method() !== 'GET') return route.abort();
      return route.continue();
    });
    const name = `${kind}-${width}`;
    try {
      await page.goto(`${base}/${kind}`);
      await expect(page.getByRole('heading', { name: 'Listings couldn’t load' })).toBeVisible();
      await page.screenshot({ path: path.join(evidence, `${name}-failure.png`), fullPage: true });
      for (const attempt of [2, 3]) {
        await page.getByRole('button', { name: 'Try again' }).click();
        await expect.poll(() => attempts).toBe(attempt);
        await expect(page.getByLabel('Loading listings', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Listings couldn’t load' })).toHaveCount(0);
        await expect(page.getByText('Listings unavailable', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
        await expect(page.getByText('Loading listings…', { exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(evidence, `${name}-loading-${attempt}.png`), fullPage: true });
        release();
        if (attempt === 2) {
          await expect(page.getByRole('heading', { name: 'Listings couldn’t load' })).toBeVisible();
          gate = new Promise(resolve => { release = resolve; });
        }
      }
      await expect(page.getByRole('heading', { name: 'Fictional recovered opportunity' })).toBeVisible();
      await expect(page.getByLabel('Loading listings', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Listings couldn’t load' })).toHaveCount(0);
      assert.deepEqual(requests, Array(3).fill(`/api/${kind}`));
      assert.deepEqual(errors, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      await page.screenshot({ path: path.join(evidence, `${name}-success.png`), fullPage: true });
      rows.push({ kind, width, status: 'passed', sequence: '503 -> retry loading/clear error -> 503 -> retry loading/clear error -> success', requests, pageErrors: errors, blocked });
    } catch (error) {
      rows.push({ kind, width, status: 'failed', error: error.message, requests, pageErrors: errors, blocked });
      await page.screenshot({ path: path.join(evidence, `${name}-failed.png`), fullPage: true });
      throw error;
    } finally { release(); await context.unrouteAll({ behavior: 'wait' }); await context.close(); }
  }
} finally {
  if (browser) await browser.close();
  child.kill();
  await Promise.race([exit, new Promise((_, reject) => setTimeout(() => reject(Error('Owned server failed to stop')), 10000).unref())]);
  fs.closeSync(log);
  let closed = false;
  try { await fetch(`${base}/events`, { signal: AbortSignal.timeout(1000) }); } catch { closed = true; }
  fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ coverage: 'built Next pages, real React hydration/CSS, intercepted fictional APIs; not real provider or emulator data', buildId: fs.readFileSync('.next/BUILD_ID', 'utf8').trim(), rows, ownedPort: port, ownedPortClosed: closed }, null, 2));
  assert.ok(closed, 'Owned port still responds');
}
console.log(JSON.stringify({ passed: rows.filter(row => row.status === 'passed').length, total: rows.length, evidence }));

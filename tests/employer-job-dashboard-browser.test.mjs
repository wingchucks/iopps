import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';
import { goal01BrowserOptions } from '../scripts/qa-goal01-browser-options.mjs';

// Real Jobs page bundle against a local fixture API: session retry, reopening
// with a new closing date, featured drafts and payment refusals.
test('Jobs list recovers sessions, asks for a new closing date and explains publish refusals', async () => {
  const root = process.cwd(), require = createRequire(import.meta.url), dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'jobs-reopen-'));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const auth = put('auth.js', `window.tokenCalls=[];const user={uid:'fictional-owner',getIdToken:async force=>{window.tokenCalls.push(force===true);return 'fictional-token';}};exports.useAuth=()=>({user,signOut:async()=>{window.signedOut=true;}});exports.auth={currentUser:user};`);
  const shell = put('shell.js', `const React=require('react');module.exports=({children})=>React.createElement('div',null,children);`);
  const button = put('button.js', `const React=require('react');module.exports=({children,primary,...props})=>React.createElement('button',{type:'button',...props},children);`);
  const link = put('link.js', `const React=require('react');module.exports=props=>React.createElement('a',props);`);
  const toast = put('toast.js', `exports.useToast=()=>({showToast:(message,type)=>window.notices.push({message,type})});`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';import Page from ${JSON.stringify(path.join(root, 'src/app/org/dashboard/jobs/page.tsx'))};window.notices=[];createRoot(document.getElementById('root')).render(React.createElement(Page));`);
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
  const aliases = { 'next/link': link, '@/lib/auth-context': auth, '@/lib/firebase': auth, '@/lib/toast-context': toast, '@/components/Button': button };
  for (const name of ['OrgRoute', 'AppShell', 'Card', 'OrgDashboardNav', 'Avatar']) aliases['@/components/' + name] = shell;
  aliases['@'] = path.join(root, 'src');
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry, devtool: false, output: { path: dir, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')], alias: aliases }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] } }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString('errors-only'))) : resolve()));

  const jobs = [
    { id: 'closed-job', title: 'Fictional Closed Role', status: 'closed', closingDate: '2020-01-01' },
    { id: 'featured-draft', title: 'Fictional Featured Draft', status: 'draft', featured: true, publication: null },
    { id: 'paid-draft', title: 'Fictional Paid Draft', status: 'draft' },
  ];
  let listCalls = 0;
  const requests = [];
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(dir, 'bundle.js'))); return; }
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.url === '/api/employer/jobs') {
      // The first load finds an expired session; Retry succeeds with a fresh token.
      if (listCalls++ === 0) return json(401, { error: 'Your session has expired. Sign in again to continue.', code: 'session_expired' });
      return json(200, { jobs });
    }
    if (req.url.startsWith('/api/employer/jobs/')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const id = req.url.split('/').pop();
        requests.push({ id, method: req.method, body: body ? JSON.parse(body) : null });
        if (id === 'paid-draft') return json(402, { error: 'A paid posting credit or eligible annual plan is required.', code: 'payment_required' });
        return json(200, { success: true, jobId: id });
      });
      return;
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');
  });
  const proxy = http.createServer((_, res) => { res.writeHead(403); res.end(); });
  proxy.on('connect', (_, socket) => socket.destroy());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch(goal01BrowserOptions({ proxyPort: proxy.address().port, allowedPorts: [server.address().port] }));
    const page = await (await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 900 } })).newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);

    await expect(page.getByRole('alert')).toHaveText('Your session has expired. Sign in again to continue.');
    await expect(page.getByRole('button', { name: 'Sign in again', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Fictional Closed Role', exact: true })).toBeVisible();
    assert.deepEqual(await page.evaluate(() => window.tokenCalls), [false, true], 'Retry forces a token refresh');

    // Reopening a job whose closing date has passed asks for a new date before any request.
    await page.getByRole('button', { name: 'Reopen', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Fictional Closed Role');
    await expect(dialog.getByRole('alert')).toContainText('This date has passed');
    const reopen = dialog.getByRole('button', { name: 'Reopen job', exact: true });
    await expect(reopen).toBeDisabled();
    assert.equal(requests.length, 0);
    await dialog.getByLabel('Closing date (optional)').fill('2099-12-31');
    await reopen.click();
    await expect(dialog).not.toBeVisible();
    assert.deepEqual(requests.shift(), { id: 'closed-job', method: 'PUT', body: { status: 'active', closingDate: '2099-12-31' } });
    await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toHaveCount(1);

    // A featured draft chooses its listing duration in the editor instead of failing with 409.
    const durationLink = page.getByRole('link', { name: 'Choose duration to publish', exact: true });
    await expect(durationLink).toHaveAttribute('href', '/org/dashboard/jobs/featured-draft/edit');
    await expect(page.getByRole('button', { name: 'Activate', exact: true })).toHaveCount(1);

    // A payment refusal is explained beside the job, never as raw JSON.
    await page.getByRole('button', { name: 'Activate', exact: true }).click();
    await expect(page.getByText('A paid posting credit or eligible annual plan is required.', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the job to fix and publish', exact: true })).toHaveAttribute('href', '/org/dashboard/jobs/paid-draft/edit');
    assert.doesNotMatch(await page.locator('body').innerText(), /"error"|payment_required/);
    assert.deepEqual(requests, [{ id: 'paid-draft', method: 'PUT', body: { status: 'active' } }]);
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections(); proxy.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => proxy.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Job editor keeps refusals on the page, offers purchases only to the owner and closes on the Saskatchewan day', async () => {
  const root = process.cwd(), require = createRequire(import.meta.url), dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'job-edit-'));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const auth = put('auth.js', `const user={uid:'fictional-owner',getIdToken:async()=>'fictional-token'};exports.useAuth=()=>({user});exports.auth={currentUser:user};`);
  const shell = put('shell.js', `const React=require('react');module.exports=({children})=>React.createElement('div',null,children);`);
  const button = put('button.js', `const React=require('react');module.exports=({children,primary,...props})=>React.createElement('button',{type:'button',...props},children);`);
  const link = put('link.js', `const React=require('react');module.exports=props=>React.createElement('a',props);`);
  const toast = put('toast.js', `exports.useToast=()=>({showToast:(message,type)=>window.notices.push({message,type})});`);
  const navigation = put('navigation.js', `exports.useParams=()=>({id:'fictional-job'});const router={replace:u=>window.navigations.push(['replace',u]),push:u=>window.navigations.push(['push',u])};exports.useRouter=()=>router;`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';import Page from ${JSON.stringify(path.join(root, 'src/app/org/dashboard/jobs/[id]/edit/page.tsx'))};window.notices=[];window.navigations=[];createRoot(document.getElementById('root')).render(React.createElement(Page));`);
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
  const aliases = { 'next/link': link, 'next/navigation': navigation, '@/lib/auth-context': auth, '@/lib/firebase': auth, '@/lib/toast-context': toast, '@/components/Button': button };
  for (const name of ['OrgRoute', 'AppShell', 'Card']) aliases['@/components/' + name] = shell;
  aliases['@'] = path.join(root, 'src');
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry, devtool: false, output: { path: dir, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')], alias: aliases }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] } }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString('errors-only'))) : resolve()));

  let canPurchase = true;
  const requests = [];
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(dir, 'bundle.js'))); return; }
    const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.url === '/api/employer/jobs/fictional-job') {
      if (req.method === 'GET') return json(200, { job: { id: 'fictional-job', title: 'Fictional Draft Role', status: 'draft', closingDate: '', description: 'Fictional', location: 'Regina, SK' }, readOnly: false, featuredSummary: null, canPurchase });
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        requests.push(parsed);
        if (parsed.status === 'active') return json(402, { error: 'A paid posting credit or eligible annual plan is required.', code: 'payment_required' });
        return json(200, { success: true, jobId: 'fictional-job', featuredSummary: null });
      });
      return;
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');
  });
  const proxy = http.createServer((_, res) => { res.writeHead(403); res.end(); });
  proxy.on('connect', (_, socket) => socket.destroy());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const reginaDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Regina', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch(goal01BrowserOptions({ proxyPort: proxy.address().port, allowedPorts: [server.address().port] }));
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 900 } });
    const open = async () => {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.getByRole('heading', { name: 'Edit Job Posting', exact: true }).waitFor();
      return page;
    };

    let page = await open();
    // A past closing date never reaches the API when publishing.
    await page.getByRole('radio', { name: 'active', exact: true }).check();
    await page.getByLabel('Closing date (optional)').fill('2020-01-01');
    await expect(page.getByText('This date has passed. Choose today or a later date to publish, or clear the date.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    assert.equal(requests.length, 0);
    assert.match((await page.evaluate(() => window.notices)).at(-1).message, /closing date has passed/);

    // An unpaid publish keeps the reason and, for the owner, a purchase that saves the edits first.
    await page.getByRole('button', { name: 'Clear date', exact: true }).click();
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'This job isn’t published yet', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save draft & buy standard post', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.navigations.length)).toBe(1);
    assert.equal(requests.at(-1).status, 'draft', 'the edits are saved as a draft before checkout');
    assert.deepEqual(await page.evaluate(() => window.navigations), [['push', '/org/checkout?plan=standard-post&redirect=%2Forg%2Fdashboard%2Fjobs%2Ffictional-job%2Fedit']]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.close();

    // Other team members are told to ask the owner instead of being sent to an owner-only checkout.
    canPurchase = false;
    page = await open();
    await page.getByRole('radio', { name: 'active', exact: true }).check();
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByText(/Only your organization’s owner can buy posting credits or plans/)).toBeVisible();
    await expect(page.getByRole('button', { name: /buy/i })).toHaveCount(0);

    // Close Position records today's Saskatchewan date.
    const before = reginaDay();
    await page.getByRole('button', { name: 'Close Position', exact: true }).click();
    await expect.poll(() => requests.at(-1)?.status).toBe('closed');
    assert.ok([before, reginaDay()].includes(requests.at(-1).closingDate), JSON.stringify(requests.at(-1)));
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections(); proxy.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => proxy.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

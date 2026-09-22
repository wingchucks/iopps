import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';

// Exact-source component integration. Real React and directory filtering;
// only Next navigation, Link and the unrelated authenticated shell are adapters.
// It is not Next hydration or live-provider coverage.
export async function verifyDirectoryLifecycle(t) {
  const require = createRequire(import.meta.url), root = process.cwd();
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'opportunity-retry-'));
  const evidence = path.join(root, 'reports/opportunity-directory-retry', process.env.IOPPS_SECURITY_BASELINE === 'true' ? 'baseline' : 'candidate');
  fs.mkdirSync(evidence, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const source = 'src/components/opportunities/OpportunityDirectory.tsx';
  const component = process.env.IOPPS_SECURITY_BASELINE === 'true'
    ? put('OpportunityDirectory.tsx', execFileSync('git', ['show', `eff72b45ec8ce040dcd714fd782817c73e412e30:${source}`], { cwd: root }))
    : path.join(root, source);
  const navigation = put('navigation.js', `const React=require('react');const listeners=new Set();let snapshot='';const router={replace:url=>{history.replaceState(null,'',url);snapshot=location.search;listeners.forEach(fn=>fn())}};exports.useRouter=()=>router;exports.usePathname=()=>location.pathname;exports.useSearchParams=()=>new URLSearchParams(React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>snapshot));`);
  const shell = put('shell.js', `const React=require('react');module.exports=({children,href,...props})=>React.createElement(href?'a':'div',{...props,href},children);`);
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';import Directory from ${JSON.stringify(component)};function Fixture(){const [kind,setKind]=React.useState(location.pathname.slice(1));window.setKind=setKind;return React.createElement(Directory,{kind})}createRoot(document.getElementById('root')).render(React.createElement(Fixture));`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry, devtool: false, output: { path: dir, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')], alias: { 'next/navigation': navigation, 'next/link': shell, '@/components/AppShell': shell, '@': path.join(root, 'src') } }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] } }, (err, stats) => err || stats.hasErrors() ? reject(err || Error(stats.toString('errors-only'))) : resolve()));
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'text/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(dir, 'bundle.js'))); }
    else { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const chrome = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined;
  const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : { channel: 'chrome' }) });
  t.after(() => browser.close());
  const base = `http://127.0.0.1:${server.address().port}`, rows = [];
  t.after(() => fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ coverage: 'exact-source React component; fictional intercepted APIs; no Next hydration or CSS coverage', browser: browser.version(), rows }, null, 2)));
  for (const width of [1280, 390]) for (const kind of ['events', 'scholarships']) for (const scenario of ['retry', 'kind-change']) {
    await t.test(`${kind} ${scenario} at ${width}px`, async () => {
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 } });
      const page = await context.newPage(), errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      const other = kind === 'events' ? 'scholarships' : 'events';
      let release, count = 0;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base || route.request().method() !== 'GET') return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        requests.push(url.pathname);
        count++;
        if (count === 1) return route.fulfill({ status: 503, json: { error: 'Fictional temporary outage' } });
        await gate;
        const requestedKind = url.pathname.split('/').pop();
        return route.fulfill({ json: { [requestedKind]: [{ id: 'fictional-recovery', title: 'Fictional recovered opportunity', description: 'Isolated test fixture', deadlineType: 'rolling' }] } });
      });
      const name = `${kind}-${scenario}-${width}`;
      try {
        await page.goto(`${base}/${kind}`);
        await expect(page.getByRole('heading', { name: 'Listings couldn’t load' })).toBeVisible();
        await page.screenshot({ path: path.join(evidence, `${name}-failure.png`), fullPage: true });
        if (scenario === 'retry') await page.getByRole('button', { name: 'Try again' }).click();
        else await page.evaluate(value => window.setKind(value), other);
        await expect.poll(() => requests.length).toBe(2);
        await expect(page.getByLabel('Loading listings', { exact: true })).toBeAttached();
        await expect(page.getByText('Loading listings…', { exact: true })).toBeVisible();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByText('Listings unavailable', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
        await page.screenshot({ path: path.join(evidence, `${name}-loading.png`), fullPage: true });
        release();
        await expect(page.getByRole('heading', { name: 'Fictional recovered opportunity' })).toBeVisible();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByLabel('Loading listings', { exact: true })).toHaveCount(0);
        assert.deepEqual(requests, [`/api/${kind}`, `/api/${scenario === 'retry' ? kind : other}`]);
        assert.deepEqual(errors, []);
        await page.screenshot({ path: path.join(evidence, `${name}-success.png`), fullPage: true });
        rows.push({ kind, scenario, width, status: 'passed', requests, pageErrors: errors });
      } catch (error) {
        rows.push({ kind, scenario, width, status: 'failed', requests, error: error.message, pageErrors: errors });
        await page.screenshot({ path: path.join(evidence, `${name}-assertion-failed.png`), fullPage: true });
        throw error;
      } finally { release(); await context.unrouteAll({ behavior: 'wait' }); await context.close(); }
    });
  }
}

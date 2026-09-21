import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { chromium, expect } from '@playwright/test';

// Exact-source components and production CSS; no Next server, auth SDK or live data.
async function fixture(t) {
  const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'public-navigation-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const source = file => fs.readFileSync(file, 'utf8');
  const compile = file => ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const modules = ['OpportunityHeader', 'Footer', 'AppShell'];
  fs.writeFileSync(path.join(scratch, 'entry.js'), `
import * as React from 'react'; import * as jsx from 'react/jsx-runtime'; import {createRoot} from 'react-dom/client';
const stubs={'react':React,'react/jsx-runtime':jsx,
'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
'next/image':{default:({alt,width,height})=>React.createElement('img',{alt,width,height})},
'next/navigation':{usePathname:()=>location.pathname},
'@/lib/auth-context':{useAuth:()=>({user:null,loading:false})},
'./NavBar':{default:()=>null},'./IconRailSidebar':{default:()=>null}};
const load=fn=>{const exports={};fn(id=>{if(!(id in stubs))throw Error('Unapproved import '+id);return stubs[id]},exports);return exports};
${modules.map(name => `stubs['./${name}']=load(function(require,exports){${compile(`src/components/${name}.tsx`)}});`).join('\n')}
const Component=location.pathname==='/'?stubs['./OpportunityHeader'].default:stubs['./AppShell'].default;
createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement(Component,null,React.createElement('main',null,React.createElement('a',{href:'#after',id:'directory-cta'},'Existing directory CTA'))),React.createElement('button',{id:'after'},'After navigation')));
`);
  const require = createRequire(import.meta.url);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry: path.join(scratch, 'entry.js'), output: { path: scratch, filename: 'bundle.js' }, resolve: { modules: [path.resolve('node_modules')] }, devtool: false }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString('errors-only'))) : resolve()));
  const postcss = require('postcss');
  const tailwind = require('@tailwindcss/postcss');
  const css = (await postcss([tailwind()]).process(source('src/app/globals.css'), { from: path.resolve('src/app/globals.css') })).css;
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'application/javascript'); res.end(fs.readFileSync(path.join(scratch, 'bundle.js'))); return; }
    res.setHeader('content-type', 'text/html');
    res.end(`<!doctype html><html><head><style>${css}\n${source('src/app/opportunity.css')}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  return { page, origin };
}

test('CONTENT-001: public directory shells expose keyboard-usable branded utility links without overflow', async t => {
  const { page, origin } = await fixture(t);
  for (const route of ['/businesses', '/scholarships', '/events']) {
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + route);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toBeVisible();
      await expect(footer).toContainText('IOPPS');
      const utilities = footer.getByRole('navigation', { name: 'Utility navigation' });
      await page.locator('#directory-cta').focus();
      for (const [name, href] of [['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']]) {
        const link = utilities.getByRole('link', { name, exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', href);
        await page.keyboard.press('Tab'); await expect(link).toBeFocused();
        assert.equal(await link.evaluate(el => el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth) >= 2), true);
        assert.ok(fs.existsSync(`src/app${href}/page.tsx`), `${href} is a public page`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await expect(page.locator('#directory-cta')).toHaveAttribute('href', '#after');
    }
  }
  // Keep the change scoped: no new footer in unrelated app flows.
  await page.goto(origin + '/saved');
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
});

test('R-A11Y-01: disclosure Escape restores visible trigger focus at 360/768 without trapping Tab', async t => {
  const { page, origin } = await fixture(t);
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    const trigger = page.locator('.op-menu');
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    for (const key of ['Enter', 'Space']) {
      for (let index = 0; index < 5; index++) {
        await trigger.focus(); await page.keyboard.press(key);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        for (let tab = 0; tab <= index; tab++) await page.keyboard.press('Tab');
        await expect(nav.getByRole('link').nth(index)).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(nav).toBeHidden();
        await expect(trigger).toBeFocused();
        assert.equal(await trigger.evaluate(el => el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth) >= 2), true);
        await page.keyboard.press('Tab'); await expect(page.locator('#after')).toBeFocused();
      }
    }
    await trigger.focus(); await page.keyboard.press('Enter');
    for (let tab = 0; tab < 6; tab++) await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    assert.equal(await nav.getAttribute('role'), null);
  }
});

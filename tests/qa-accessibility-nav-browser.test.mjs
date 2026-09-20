import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { chromium, expect } from '@playwright/test';

// Exact-source React component test; intentionally not authenticated route/data QA.
// No existing server, dotenv, Firebase SDK, credentials or remote requests are used.
test('desktop isolated component browser: notification names/state/keyboard and external navigation', {
  skip: process.env.IOPPS_QA_ACCESSIBILITY_BROWSER !== 'true',
}, async t => {
  const require = createRequire(import.meta.url);
  const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'qa-accessibility-nav-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const evidence = process.env.IOPPS_QA_ACCESSIBILITY_EVIDENCE;
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const source = file => fs.readFileSync(file, 'utf8');
  const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  function namedFunction(file, name) {
    const text = source(file);
    const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    return tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(tree);
  }
  const homeText = source('src/app/page.tsx');
  const hero = homeText.match(/<figcaption>[\s\S]*?<\/figcaption>/)[0];
  const notification = compile(source('src/app/settings/notifications/page.tsx'));
  const admin = compile(`import {useState} from 'react'; const cn = (...values) => values.filter(Boolean).join(' '); ${namedFunction('src/app/admin/settings/page.tsx', 'Toggle')} export default function AdminFixture(){const [checked,setChecked]=useState(false);return <><span>Show Announcement</span><Toggle label="Show Announcement" checked={checked} onChange={setChecked}/><span>Disabled setting</span><Toggle label="Disabled setting" checked={false} disabled onChange={()=>{throw Error('disabled activated')}}/></>}`);
  const header = compile(source('src/components/OpportunityHeader.tsx'));
  const heroModule = compile(`export default function Hero(){ return ${hero}; }`);
  const nav = compile(source('src/lib/navigation.ts'));
  fs.writeFileSync(path.join(scratch, 'entry.js'), `
import * as React from 'react'; import * as jsx from 'react/jsx-runtime'; import {createRoot} from 'react-dom/client';
const user={uid:'fictional-notification-user'};
const categories=Object.fromEntries(['applications','messages','community','events','opportunities'].map(k=>[k,{email:false,push:true,inApp:false}]));
const pass=({children})=>React.createElement('div',null,children);
const stubs={
 'react':React,'react/jsx-runtime':jsx,
 'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
 'next/image':{default:()=>null},
 'next/navigation':{usePathname:()=>'/businesses'},
 '@/lib/auth-context':{useAuth:()=>({user,loading:false})},
 '@/lib/toast-context':{useToast:()=>({showToast:()=>{}})},
 '@/lib/useAccountContext':{useAccountContext:()=>({loading:false,isEmployer:location.search.includes('employer')})},
 '@/lib/firestore/notificationPreferences':{getNotificationPreferences:async()=>({categories,quietHours:{enabled:false,start:'22:00',end:'08:00'}}),updateNotificationPreferences:async(_uid,prefs)=>{window.savedPreferences=prefs}},
 '@/components/ProtectedRoute':{default:pass},'@/components/AppShell':{default:pass},'@/components/Card':{default:pass},'@/components/PageSkeleton':{default:()=>null}
};
const load=fn=>{const exports={};fn(id=>{if(!(id in stubs))throw Error('Unapproved import '+id);return stubs[id]},exports);return exports};
const Notification=load(function(require,exports){${notification}}).default;
const Admin=load(function(require,exports){${admin}}).default;
const Header=load(function(require,exports){${header}}).default;
const Hero=load(function(require,exports){${heroModule}}).default;
const navigation=load(function(require,exports){${nav}});
const SharedNav=()=>React.createElement('nav',{'aria-label':'Shared directory navigation'},navigation.getMemberExploreNavItems().map(i=>React.createElement('a',{key:i.key,href:i.href},i.label)));
createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement(Header),React.createElement(Hero),React.createElement(SharedNav),React.createElement(Notification),React.createElement(Admin)));
`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve, reject) => webpack({ mode: 'development', entry: path.join(scratch, 'entry.js'), output: { path: scratch, filename: 'bundle.js' }, resolve: { modules: [path.resolve('node_modules')] }, devtool: false }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString('errors-only'))) : resolve()));
  const css = source('src/app/opportunity.css');
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'application/javascript'); res.end(fs.readFileSync(path.join(scratch, 'bundle.js'))); return; }
    res.setHeader('content-type', 'text/html');
    res.end(`<!doctype html><html><head><style>${css}\nbody{font-family:Arial;background:white;color:#152d3d}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}[role=switch]{display:inline-block;position:relative;width:48px;height:28px;border-radius:20px;margin:6px;border:1px solid #64748b}[role=switch]:focus-visible{outline:3px solid blue}nav a{margin:8px}h3{margin-bottom:8px}#root{max-width:1100px;margin:auto}</style></head><body><main id="root"></main><script src="/bundle.js"></script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const rows = [];
  for (const audience of ['member', 'employer']) {
    await page.goto(`${origin}/?${audience}`);
    const names = audience === 'member' ? ['Applications', 'Messages', 'Community', 'Events', 'Opportunities'] : ['Applications', 'Messages', 'Team Activity', 'Events', 'Posting Activity'];
    for (const category of names) for (const channel of ['Email', 'Push', 'In-App']) {
      const name = `${category} ${channel}`;
      const control = page.getByRole('switch', { name, exact: true });
      await expect(control).toBeVisible();
      const before = await control.getAttribute('aria-checked');
      await control.focus(); await page.keyboard.press('Space');
      await expect(control).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
      await page.keyboard.press('Enter'); await expect(control).toHaveAttribute('aria-checked', before);
      rows.push({ audience, name, spaceChangesState: true, enterRestoresState: true });
    }
    const quiet = page.getByRole('switch', { name: 'Quiet Hours', exact: true });
    await quiet.click(); await expect(page.getByLabel('From', { exact: true })).toBeVisible();
    await quiet.click(); await expect(page.getByLabel('From', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    assert.equal(await page.evaluate(() => window.savedPreferences.quietHours.enabled), false);
    const announcement = page.getByRole('switch', { name: 'Show Announcement', exact: true });
    await announcement.focus(); await page.keyboard.press('Space'); await expect(announcement).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Disabled setting' })).toBeDisabled();
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Indigenous Businesses', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Shared directory navigation' }).getByRole('link', { name: 'Indigenous Businesses', exact: true })).toHaveAttribute('href', '/businesses');
    const external = page.getByRole('link', { name: /This is IOPPS.*opens in a new tab/ });
    await expect(external).toHaveAttribute('href', 'https://ioppslive.com');
    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
    if (evidence) {
      fs.writeFileSync(path.join(evidence, `accessibility-${audience}-snapshot.txt`), await page.locator('main').ariaSnapshot());
      await page.screenshot({ path: path.join(evidence, `accessibility-${audience}-desktop.png`), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  if (evidence) fs.writeFileSync(path.join(evidence, 'accessibility-browser-results.json'), JSON.stringify({ fixture: 'Exact-source component React; fictional preferences; no route/auth/provider coverage', viewport: { width: 1440, height: 1000 }, rows, errors, externalNavigationNotFollowed: true }, null, 2));
});

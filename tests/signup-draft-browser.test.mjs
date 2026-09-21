import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

// Actual desktop signup TSX + React handlers; fictional auth seam, not Firebase/Next E2E.
test('signup draft restores audited Step 2 after reload without credentials or consent', async t => {
  const require = createRequire(import.meta.url), root = process.cwd();
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'signup-browser-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const navigation = put('navigation.js', `exports.useRouter=()=>({push:url=>window.destination=url});exports.useSearchParams=()=>new URLSearchParams(location.search);`);
  const auth = put('auth.js', `const React=require('react');let user=null;const listeners=new Set();window.calls=[];window.mode='unknown';
    const notify=()=>listeners.forEach(fn=>fn());window.setIdentity=uid=>{user=uid?{uid,email:uid+'@example.invalid',emailVerified:false}:null;notify()};
    exports.useAuth=()=>{React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>user);return {user,
      signUp:async()=>{window.calls.push('create');if(window.mode==='unknown')throw Error('Firebase: private diagnostic secret');if(window.mode==='creation-limit')throw Object.assign(Error('private'),{code:'auth/too-many-requests'});user={uid:'fictional-created',email:'fictional@example.invalid',emailVerified:false,getIdToken:async()=>'fictional-token'};notify();return {user,verificationEmailSent:false,verificationError:'Your account was created, but the verification email couldn’t be sent. Too many attempts. Please wait and try again later.',profileError:'',sessionReady:true}},
      signInWithGoogle:async()=>{window.calls.push('google');throw Error('No real provider permitted')},
      sendVerificationEmail:async()=>{window.calls.push('resend');return true},reloadUser:async()=>false}};`);
  const firebase = put('firebase.js', `exports.storage={};exports.getAppCheckTokenValue=async()=>'';`);
  const storage = put('storage.js', `exports.ref=()=>{throw Error('No storage permitted')};exports.uploadBytes=exports.ref;exports.getDownloadURL=exports.ref;`);
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';import Signup from ${JSON.stringify(path.join(root,'src/app/signup/page.tsx'))};createRoot(document.getElementById('root')).render(React.createElement(Signup));`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve,reject)=>webpack({mode:'development',entry,devtool:false,output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:{'next/navigation':navigation,'firebase/storage':storage,'@/lib/firebase':firebase,'@/lib/auth-context':auth,'@':path.join(root,'src')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve()));
  const server=http.createServer((req,res)=>{
    if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));}
    else if(req.url==='/api/profile'){res.setHeader('content-type','application/json');res.end('{}');}
    else {res.setHeader('content-type','text/html');res.end('<!doctype html><meta charset="utf-8"><style>'+fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8').replace('@import "tailwindcss";','')+'body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/bundle.js"></script>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const browser=await chromium.launch({headless:true,channel:'chrome'});t.after(()=>browser.close());
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
  const escaped=[];await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();escaped.push(route.request().url());return route.abort();});
  const page=await context.newPage(), errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/signup`);
  await page.getByRole('button',{name:/Individual/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await page.getByText('Create your Account',{exact:true}).waitFor();
  await page.getByLabel('Your Name',{exact:false}).fill('Fictional QA');
  await page.getByLabel('Email Address',{exact:false}).fill('fictional@example.invalid');
  await page.locator('#password').fill('Fictional1!');await page.locator('#confirmPassword').fill('Fictional1!');
  await page.getByRole('checkbox').check();
  const stored = await page.evaluate(() => ({ keys: Object.keys(sessionStorage), draft: JSON.parse(sessionStorage.getItem('iopps:signup-draft:v1')), all: [Object.values(sessionStorage), Object.values(localStorage)] }));
  assert.deepEqual(stored.keys, ['iopps:signup-draft:v1']);
  assert.deepEqual(Object.keys(stored.draft).sort(), ['version', 'expiresAt', 'role', 'orgType', 'step'].sort());
  assert.deepEqual({ ...stored.draft, expiresAt: 0 }, { version: 2, expiresAt: 0, role: 'community', orgType: '', step: 2 });
  assert.doesNotMatch(JSON.stringify(stored.all), /Fictional QA|fictional@example|Fictional1|name|email|password|consent/i);
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('iopps:signup-draft:v1')).expiresAt), stored.draft.expiresAt);
  assert.match(await page.locator('body').innerText(), /Step 2 of 3/);
  assert.equal(await page.locator('#name').inputValue(),'');
  assert.equal(await page.locator('#email').inputValue(),'');
  assert.equal(await page.locator('#password').inputValue(),'');
  assert.equal(await page.locator('#confirmPassword').inputValue(),'');
  assert.equal(await page.locator('#signup-consent').isChecked(),false);
  await page.goto(`http://127.0.0.1:${server.address().port}/away`);
  await page.goBack();
  await page.locator('#name').waitFor();
  assert.equal(await page.locator('#name').inputValue(),'');
  // An explicit employer entry must not be replaced by an individual draft.
  await page.goto(`http://127.0.0.1:${server.address().port}/signup?type=employer`);
  await page.getByRole('button',{name:/Business or organization/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Business or organization/}).getAttribute('aria-pressed'),'true');
  // A different signed-in account must never inherit the anonymous form.
  await page.evaluate(()=>window.setIdentity('other'));
  await page.getByRole('button',{name:/Individual/}).waitFor();
  await page.evaluate(()=>window.setIdentity(null));
  await page.getByRole('button',{name:/Individual/}).click();
  await page.getByRole('button',{name:'Continue →',exact:true}).click();
  assert.equal(await page.locator('#name').inputValue(),'');
  assert.equal(await page.locator('#email').inputValue(),'');
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByRole('button',{name:/Business or organization/}).click();
  await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await page.locator('#name').fill('Fictional Employer');
  await page.reload();
  assert.match(await page.locator('body').innerText(), /Step 2 of 6/);
  assert.equal(await page.locator('#name').inputValue(),'');
  assert.equal(await page.locator('#email').inputValue(),'');
  assert.match(await page.locator('body').innerText(), /business name.*after.*email.*verif/i);
  for (const theme of ['light','dark']) for (const width of [360,768,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    const colors=await page.getByText('Role',{exact:true}).evaluate(el=>{
      const cs=getComputedStyle(el);let bg=el.parentElement;
      while(bg && getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;
      return {ink:cs.color,bg:getComputedStyle(bg).backgroundColor,opacity:cs.opacity,transition:cs.transitionDuration};
    });
    const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
    const a=luminance(colors.ink),b=luminance(colors.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    assert.equal(colors.opacity,'1');
    assert.equal(colors.transition,'0s', 'progress text must not fade through low-contrast opacity');
    assert.ok(ratio>=4.5, `${theme}/${width} Role contrast ${ratio}`);
    // Conservative worst case: every mesh/grid layer at its maximum alpha.
    let background=colors.bg.match(/[\d.]+/g).slice(0,3).map(Number);
    for(const [rgb,alpha] of [[[20,184,166],.08],[[14,165,233],.06],[[167,139,250],.04],[[20,184,166],.02],[[20,184,166],.02]])
      background=background.map((c,i)=>c*(1-alpha)+rgb[i]*alpha);
    const overlay=luminance(`rgb(${background.join(',')})`);
    const overlayRatio=(Math.max(a,overlay)+.05)/(Math.min(a,overlay)+.05);
    assert.ok(overlayRatio>=4.5, `mesh worst-case contrast ${overlayRatio}`);
    t.diagnostic(`${theme}/${width}: Role ${ratio.toFixed(3)}:1; mesh lower bound ${overlayRatio.toFixed(3)}:1`);
  }
  // Legacy PII and malformed current drafts are discarded, not migrated.
  await page.goto(`http://127.0.0.1:${server.address().port}/signup`);
  for (const raw of ['{broken', JSON.stringify({ version: 1, expiresAt: Date.now() + 60000, role: 'community', orgType: '', step: 2, name: 'Legacy PII', email: 'legacy@example.invalid' })]) {
    await page.evaluate(raw => sessionStorage.setItem('iopps:signup-draft:v1', raw), raw);
    await page.reload();
    await page.getByRole('button', { name: /Individual/ }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Continue →', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('#name').count(), 0);
    const fresh = await page.evaluate(() => JSON.parse(sessionStorage.getItem('iopps:signup-draft:v1') || 'null'));
    if (fresh) assert.deepEqual({ ...fresh, expiresAt: 0 }, { version: 2, expiresAt: 0, role: '', orgType: '', step: 1 });
  }
  assert.deepEqual(errors,[]);assert.deepEqual(escaped,[]);
});

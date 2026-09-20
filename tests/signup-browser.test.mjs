import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

// Actual desktop signup TSX + React handlers; fictional auth seam, not Firebase/Next E2E.
test('desktop signup consent, safe errors, confirmed creation and verification retry', async t => {
  const require = createRequire(import.meta.url), root = process.cwd();
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'signup-browser-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const navigation = put('navigation.js', `exports.useRouter=()=>({push:url=>window.destination=url});exports.useSearchParams=()=>new URLSearchParams(location.search);`);
  const auth = put('auth.js', `const React=require('react');let user=null;const listeners=new Set();window.calls=[];window.mode='unknown';
    const notify=()=>listeners.forEach(fn=>fn());
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
    else {res.setHeader('content-type','text/html');res.end('<!doctype html><meta charset="utf-8"><style>body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/bundle.js"></script>');}
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
  await page.getByRole('button',{name:'Create Account →',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Please agree'}).waitFor();
  await page.getByRole('button',{name:/Google/}).click();
  assert.deepEqual(await page.evaluate(()=>window.calls),[]);
  for(const [name,href] of [['Terms of Service','/terms'],['Privacy Policy','/privacy']]){
    const link=page.getByRole('link',{name,exact:true});assert.equal(await link.getAttribute('href'),href);assert.equal(await link.getAttribute('target'),'_blank');
  }
  await page.getByRole('checkbox',{name:'I agree to the Terms of Service and Privacy Policy'}).check();
  await page.getByRole('button',{name:'Create Account →',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Signup failed'}).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(),/Firebase|private diagnostic secret/);
  assert.equal(await page.locator('#email').inputValue(),'fictional@example.invalid');
  assert.equal(await page.locator('#signup-consent').isChecked(),true);
  await page.evaluate(()=>window.mode='creation-limit');await page.getByRole('button',{name:'Create Account →',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Too many attempts'}).waitFor();
  await page.evaluate(()=>window.mode='postcreate-limit');await page.getByRole('button',{name:'Create Account →',exact:true}).click();
  await page.getByText('Check your Inbox',{exact:true}).waitFor();
  await page.getByRole('status').filter({hasText:'Your account was created'}).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(),/We've sent a verification link/);
  await page.getByRole('button',{name:'Resend Verification Email',exact:true}).click();
  await page.getByText("We've sent a verification link to fictional@example.invalid.",{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.calls),['create','create','create','resend']);
  assert.deepEqual(errors,[]);assert.deepEqual(escaped,[]);
});

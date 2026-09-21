import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

// Real AuthProvider, signup page and draft helper; only Firebase/network are fictional.
test('unmounted signup draft is invalidated by real provider auth boundaries on another route', async t => {
  const require = createRequire(import.meta.url), root = process.cwd();
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'signup-boundary-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const navigation = put('navigation.js', `exports.useRouter=()=>({push:url=>window.navigate(url)});exports.useSearchParams=()=>new URLSearchParams(location.search);`);
  const firebase = put('firebase.js', `exports.auth={currentUser:null};exports.storage={};exports.getAppCheckTokenValue=async()=>'';`);
  const sdk = put('sdk.js', `const {auth}=require(${JSON.stringify(firebase)});const listeners=new Set();
    const emit=async user=>{auth.currentUser=user;await Promise.all([...listeners].map(fn=>fn(user)))};
    const user=uid=>({uid,email:uid+'@example.invalid',emailVerified:false,getIdToken:async()=>'fictional-token'});
    exports.onAuthStateChanged=(_,fn)=>{listeners.add(fn);fn(auth.currentUser);return()=>listeners.delete(fn)};
    exports.signInWithEmailAndPassword=async()=>{const u=user('other');await emit(u);return {user:u}};
    exports.signOut=async()=>emit(null);
    exports.createUserWithEmailAndPassword=async()=>{const u=user('created');await emit(u);return {user:u}};
    exports.updateProfile=async()=>{};exports.sendEmailVerification=async()=>{};exports.sendPasswordResetEmail=async()=>{};
    exports.signInWithPopup=async()=>{throw Error('No provider access')};exports.GoogleAuthProvider=class {};
    window.emitAuth=uid=>emit(uid?user(uid):null);`);
  const storage = put('storage.js', `exports.ref=()=>{throw Error('No storage permitted')};exports.uploadBytes=exports.ref;exports.getDownloadURL=exports.ref;`);
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';
    import Signup from ${JSON.stringify(path.join(root,'src/app/signup/page.tsx'))};
    import {AuthProvider,useAuth} from ${JSON.stringify(path.join(root,'src/lib/auth-context.tsx'))};
    function Routes(){const [route,setRoute]=React.useState(location.pathname);const auth=useAuth();window.navigate=url=>{history.pushState({},'',url);setRoute(url)};window.testAuth=auth;
      return React.createElement(React.Fragment,null,React.createElement('output',{'data-testid':'identity'},auth.loading?'loading':auth.user?.uid||'anonymous'),route==='/signup'?React.createElement(Signup):React.createElement('h1',null,'Elsewhere'));}
    createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(Routes)));`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve,reject)=>webpack({mode:'development',entry,devtool:false,plugins:[new webpack.DefinePlugin({'process.env.NEXT_PUBLIC_USE_EMULATORS':JSON.stringify('false')})],output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:{'next/navigation':navigation,'firebase/auth':sdk,'firebase/storage':storage,'./firebase':firebase,'@/lib/firebase':firebase,'@':path.join(root,'src')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve()));
  const server=http.createServer((req,res)=>{
    if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));}
    else if(req.url.startsWith('/api/')){res.setHeader('content-type','application/json');res.end('{"sent":true}');}
    else {res.setHeader('content-type','text/html');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const browser=await chromium.launch({headless:true,channel:'chrome'});t.after(()=>browser.close());
  const context=await browser.newContext({serviceWorkers:'block'});
  const escaped=[];await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();escaped.push(route.request().url());return route.abort();});
  const page=await context.newPage(), errors=[];page.on('pageerror',error=>errors.push(error.message));
  const key='iopps:signup-draft:v1';
  await page.goto(`http://127.0.0.1:${server.address().port}/signup`);
  await page.waitForFunction(()=>window.testAuth?.loading===false);
  await page.getByRole('button',{name:/Individual/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();
  await page.locator('#name').fill('Prior Identity');await page.locator('#email').fill('prior@example.invalid');
  await page.locator('#password').fill('Fictional1!');await page.locator('#confirmPassword').fill('Fictional1!');await page.getByRole('checkbox').check();
  const stored=await page.evaluate(key=>sessionStorage.getItem(key),key);
  assert.equal(JSON.parse(stored).name,'Prior Identity');assert.doesNotMatch(stored,/Fictional1|password|token|consent/i);
  await page.reload();await page.locator('#name').waitFor();
  assert.equal(await page.locator('#name').inputValue(),'Prior Identity','initial anonymous provider callback preserves reload recovery');
  await page.evaluate(()=>window.navigate('/elsewhere'));await page.getByRole('heading',{name:'Elsewhere'}).waitFor();
  assert.equal(await page.locator('#name').count(),0,'signup really unmounted');
  // No auth boundary: leaving and returning must still preserve the draft.
  await page.evaluate(()=>window.navigate('/signup'));await page.locator('#name').waitFor();
  assert.equal(await page.locator('#name').inputValue(),'Prior Identity');
  await page.evaluate(()=>window.navigate('/elsewhere'));await page.getByRole('heading',{name:'Elsewhere'}).waitFor();
  await page.evaluate(()=>window.testAuth.signIn('other@example.invalid','fictional'));
  await page.evaluate(()=>window.testAuth.signOut());
  await page.waitForFunction(()=>window.testAuth.loading===false && !window.testAuth.user);
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),null,'auth boundary clears persisted anonymous draft while signup is absent');
  await page.evaluate(()=>window.navigate('/signup'));await page.getByRole('button',{name:/Individual/}).waitFor();
  await page.getByRole('button',{name:/Individual/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();
  assert.equal(await page.locator('#name').inputValue(),'');assert.equal(await page.locator('#email').inputValue(),'');
  assert.equal(await page.locator('#password').inputValue(),'');assert.equal(await page.getByRole('checkbox').isChecked(),false);
  // Current intentional signup must still reach verification with its in-memory fields.
  await page.locator('#name').fill('Current Identity');await page.locator('#email').fill('created@example.invalid');
  await page.locator('#password').fill('Fictional1!');await page.locator('#confirmPassword').fill('Fictional1!');await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:/Create Account/}).click();
  await page.getByText('Inbox',{exact:true}).waitFor();
  assert.match(await page.locator('body').innerText(),/created@example.invalid/);
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),null);
  assert.deepEqual(errors,[]);assert.deepEqual(escaped,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';

// Exact setup component in Chrome, with fictional auth/persistence only.
// Native File, URL.createObjectURL, React rendering and URL revocation are real.
// No Next build, emulator, provider calls, or remote requests.
test('setup File -> native blob URL -> img is not an HTML parsing boundary', {timeout:90000}, async t => {
 const root=process.cwd(), require=createRequire(import.meta.url);
 const scratch=process.env.IOPPS_PHOTO_SCRATCH||process.env.TMPDIR||os.tmpdir();
 fs.mkdirSync(scratch,{recursive:true});
 const dir=fs.mkdtempSync(path.join(scratch,'setup-photo-proof-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const put=(name,text)=>{const file=path.join(dir,name);fs.writeFileSync(file,text);return file};
 const auth=put('auth.js',`const user={uid:'fixture',displayName:'Fixture',photoURL:null,getIdToken:async()=>'fictional'};window.fixtureUser=user;exports.useAuth=()=>({user});`);
 const nav=put('nav.js',`const params=new URLSearchParams(),router={replace(){},push(){}};exports.useRouter=()=>router;exports.useSearchParams=()=>params;`);
 const shell=put('shell.js',`const React=require('react');module.exports=({children})=>React.createElement('div',null,children);`);
 const empty=put('empty.js',`module.exports=()=>null;`);
 const members=put('members.js',`exports.getMemberProfile=async()=>({photoURL:null,interests:[]});exports.updateMemberProfile=()=>{throw Error('unexpected write')};`);
 const firebase=put('firebase.js',`exports.auth={get currentUser(){return window.fixtureUser}};exports.storage={};`);
 const storage=put('storage.js',`exports.ref=exports.uploadBytes=exports.getDownloadURL=()=>{throw Error('unexpected storage call')};`);
 const firebaseAuth=put('firebase-auth.js',`exports.updateProfile=()=>{throw Error('unexpected auth write')};`);
 const loader=put('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
 const source=path.resolve(process.env.IOPPS_PHOTO_SOURCE||'src/app/setup/page.tsx');
 const entry=put('entry.js',`import React from 'react';import {createRoot} from 'react-dom/client';import Setup from ${JSON.stringify(source)};const root=createRoot(document.getElementById('root'));window.unmount=()=>root.unmount();root.render(React.createElement(Setup));`);
 const aliases={'next/navigation':nav,'next/link':shell,'@/lib/auth-context':auth,'@/lib/firebase':firebase,'firebase/storage':storage,'firebase/auth':firebaseAuth,'@/lib/firestore/members':members,'@/components/ProtectedRoute':shell,'@/components/AccountAvatarMenu':empty,'./destination':path.join(root,'src/app/setup/destination.ts'),'@':path.join(root,'src')};
 const {webpack}=require('next/dist/compiled/webpack/webpack');
 await new Promise((resolve,reject)=>webpack({mode:'development',entry,devtool:false,output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:aliases},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve()));
 const server=http.createServer((req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')))}
  else if(req.url==='/api/auth/account'){res.setHeader('content-type','application/json');res.end(JSON.stringify({destination:'/setup'}))}
  else {res.setHeader('content-type','text/html');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>')}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r))});
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'chrome',headless:true});t.after(()=>browser.close());
 const context=await browser.newContext({serviceWorkers:'block'});
 const escaped=[];await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():(escaped.push(route.request().url()),route.abort()));
 const page=await context.newPage();page.setDefaultTimeout(5000);
 await page.addInitScript(()=>{
  window.created=[];window.revoked=[];window.executed=0;
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=file=>{const url=create(file);window.created.push({url,name:file.name,type:file.type});return url};
  URL.revokeObjectURL=url=>{window.revoked.push(url);return revoke(url)};
 });
 await page.goto(base);await page.getByRole('button',{name:'Choose profile photo'}).waitFor();
 const input=page.locator('input[type=file]'),image=page.getByRole('img',{name:'Profile',exact:true});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 // Filename is never interpreted as markup or used as the URL string.
 await input.setInputFiles({name:'"><svg onload="window.executed++">.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelector('img[alt=Profile]')?.naturalWidth>0);
 const first=await image.getAttribute('src');assert.ok(first.startsWith(`blob:${base}/`));
 assert.equal(await page.evaluate(()=>window.executed),0);
 // Both reported sinks use the same browser-minted URL.
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();
 assert.equal(await image.getAttribute('src'),first);
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'Back',exact:true}).click();
 // MIME/size rejection happens before allocating another URL.
 for(const file of [{name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')},{name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024)}]){
  await input.setInputFiles(file);await page.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.created.length),1);assert.equal(await image.getAttribute('src'),first);
 }
 // Lying MIME metadata is not proof of raster content, but img must not execute it.
 for(const payload of ['<svg xmlns="http://www.w3.org/2000/svg" onload="window.executed++"><script>window.executed++</script></svg>','<img src=x onerror="window.executed++"><script>window.executed++</script>']){
  const previous=await image.getAttribute('src');
  await input.setInputFiles({name:'disguised.png',mimeType:'image/png',buffer:Buffer.from(payload)});
  await page.waitForFunction(old=>document.querySelector('img[alt=Profile]')?.src!==old,previous);
  await page.waitForFunction(()=>document.querySelector('img[alt=Profile]')?.complete);
  const current=await image.getAttribute('src');assert.ok(current.startsWith(`blob:${base}/`));
  assert.ok((await page.evaluate(()=>window.revoked)).includes(previous));
  assert.equal(await page.evaluate(()=>window.executed),0);
  assert.equal(await page.locator('#root script').count(),0);
 }
 await page.evaluate(()=>window.unmount());
 assert.deepEqual(await page.evaluate(()=>window.revoked),await page.evaluate(()=>window.created.map(x=>x.url)));
 // Positive control: this browser DOES execute the same image handler in an HTML sink.
 // Constant fixture only; no app input flows into this intentional test control.
 await page.evaluate(()=>{const control=document.createElement('div');control.innerHTML='<img src=x onerror="window.executed++">';document.body.append(control)});
 await page.waitForFunction(()=>window.executed===1);
 assert.deepEqual(escaped,[]);
 console.log(JSON.stringify({source,scope:'real Chrome and setup component; fictional auth/persistence',nativeBlobURLs:3,revoked:3,filenameInjection:false,disguisedContentExecution:false,htmlPositiveControl:true}));
});

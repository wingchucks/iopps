import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createRequire} from 'node:module';
import {chromium} from '@playwright/test';

// Exact React components; fictional identity/persistence and minimal responsive CSS.
// No Next server, emulators, external requests or provider writes.
test('Round5 avatar menu and profile/setup native chooser', {timeout:120000}, async t => {
 const root=process.cwd(), require=createRequire(import.meta.url);
 const dir=fs.mkdtempSync(path.join(process.env.TMPDIR||os.tmpdir(),'round5-avatar-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const put=(name,text)=>{const file=path.join(dir,name);fs.writeFileSync(file,text);return file};
 const auth=put('auth.js',`const React=require('react');const stored=uid=>sessionStorage.getItem('auth-photo:'+uid);let user={uid:'fictional-a',displayName:'Fictional Member',email:'member@example.invalid',photoURL:stored('fictional-a'),getIdToken:async()=>'fictional'};window.fixtureUser=user;const listeners=new Set();window.setUser=uid=>{user={...user,uid,photoURL:stored(uid)};window.fixtureUser=user;listeners.forEach(fn=>fn())};exports.useAuth=()=>({user:React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>user),loading:false,signOut:async()=>{window.signedOut=true}});`);
 const firebaseAuth=put('firebase-auth.js',`window.authWrites=[];exports.updateProfile=async(target,data)=>{if(window.holdAuth)await new Promise(r=>window.releaseAuth=r);if(window.failAuth)throw Error('fictional auth sync failure');Object.assign(target,data);sessionStorage.setItem('auth-photo:'+target.uid,data.photoURL);window.authWrites.push({uid:target.uid,data})};`);
 const nav=put('navigation.js',`const params=new URLSearchParams();const router={push:url=>window.lastPush=url,replace:url=>window.lastPush=url};exports.useRouter=()=>router;exports.useSearchParams=()=>params;exports.usePathname=()=>location.pathname;`);
 const shell=put('shell.js',`const React=require('react');module.exports=({children,href,...props})=>React.createElement(href?'a':'div',{...props,href},children);`);
 const empty=put('empty.js',`module.exports=()=>null;`);
 const members=put('members.js',`window.writes=[];exports.getMemberProfile=async uid=>({uid,displayName:'Fictional Member',email:'member@example.invalid',interests:[],photoURL:sessionStorage.getItem('member-photo:'+uid)});exports.updateMemberProfile=async(uid,data)=>{window.writes.push({uid,data});if(window.failPhoto)throw Error('fictional failure');sessionStorage.setItem('member-photo:'+uid,data.photoURL)};`);
 const storage=put('storage.js',`exports.ref=(_,name)=>name;exports.uploadBytes=async(name,file)=>{window.upload={name,size:file.size};if(window.holdUpload)await new Promise(r=>window.releaseUpload=r)};exports.getDownloadURL=async()=>'/fictional-photo.png';`);
 const firebase=put('firebase.js',`exports.storage={};exports.auth={get currentUser(){return window.fixtureUser}};`);
 const account=put('account.js',`exports.useAccountContext=()=>({hasOrg:false,isAdmin:false});`);
 const theme=put('theme.js',`exports.useTheme=()=>({theme:'light',toggle:()=>{}});`);
 const toast=put('toast.js',`exports.useToast=()=>({showToast:message=>window.toast=message});`);
 const activities=put('activities.js',`exports.getSavedItems=exports.getApplications=exports.getUserRSVPs=async()=>[];`);
 const loader=put('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
 const entry=put('entry.js',`import React from 'react';import {createRoot} from 'react-dom/client';import Nav from ${JSON.stringify(path.join(root,'src/components/NavBar.tsx'))};import Setup from ${JSON.stringify(path.resolve(process.env.IOPPS_AVATAR_SETUP_SOURCE||path.join(root,'src/app/setup/page.tsx')))};import Profile from ${JSON.stringify(path.join(root,'src/app/profile/page.tsx'))};createRoot(document.getElementById('root')).render(React.createElement(location.pathname==='/profile'?Profile:location.pathname==='/setup'?Setup:Nav));`);
 const aliases={'./destination':path.join(root,'src/app/setup/destination.ts'),'next/navigation':nav,'next/link':shell,'next/image':shell,'@/lib/auth-context':auth,'@/lib/theme-context':theme,'@/lib/useAccountContext':account,'@/lib/toast-context':toast,'@/lib/firebase':firebase,'firebase/storage':storage,'firebase/auth':firebaseAuth,'@/lib/firestore/members':members,'@/lib/firestore/savedItems':activities,'@/lib/firestore/applications':activities,'@/lib/firestore/rsvps':activities,'@/components/ProtectedRoute':shell,'@/components/AppShell':shell,'@/components/Footer':empty,'./ThemeToggle':empty,'./NotificationBell':empty,'./ChatButton':empty,'./CreateChooserModal':empty,'@':path.join(root,'src')};
 const {webpack}=require('next/dist/compiled/webpack/webpack');
 await new Promise((resolve,reject)=>webpack({mode:'development',entry,devtool:false,output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:aliases},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve()));
 const server=http.createServer((req,res)=>{if(req.url==='/fictional-photo.png'){res.setHeader('content-type','image/png');return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'))}res.setHeader('content-type',req.url==='/bundle.js'?'text/javascript; charset=utf-8':req.url.startsWith('/api/')?'application/json':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?fs.readFileSync(path.join(dir,'bundle.js')):req.url.startsWith('/api/')?JSON.stringify(req.url==='/api/auth/account'?{destination:'/setup'}:{ok:true}):'<!doctype html><style>.hidden{display:none}@media(min-width:768px){.md\\:flex{display:flex}.md\\:hidden{display:none}}button{min-width:32px;min-height:32px}</style><div id="root"></div><button id="outside" style="position:fixed;bottom:10px;left:10px">Outside</button><script src="/bundle.js"></script>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const ownedPort=server.address().port;t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));const probe=http.createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(ownedPort,'127.0.0.1',()=>probe.close(resolve))});const report=process.env.IOPPS_AVATAR_REPORT_DIR||'reports/round5/remaining-avatar';fs.mkdirSync(report,{recursive:true});fs.writeFileSync(path.join(report,'component-cleanup.json'),JSON.stringify({ownedPort,closed:true}));});
 const browser=await chromium.launch({channel:'chrome',headless:true});t.after(()=>browser.close());
 const context=await browser.newContext({serviceWorkers:'block'});const escaped=[];
 const base=`http://127.0.0.1:${server.address().port}`;
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():(escaped.push(route.request().url()),route.abort()));
 const page=await context.newPage();page.setDefaultTimeout(2500);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let chooserCount=0;page.on('filechooser',()=>chooserCount++);const results=[];
 for(const kind of ['profile','menu','setup','setup-retry','setup-switch','setup-validation','setup-auth-retry','setup-auth-reentry','setup-auth-switch']) await t.test(kind,async()=>{
  await page.setViewportSize({width:1280,height:900});await page.goto(base+(kind==='menu'?'/nav':kind.startsWith('setup')?'/setup':'/'+kind));
  if(kind==='menu') {
   for(const width of [1280,390]) {
    await page.setViewportSize({width,height:900});const button=page.getByRole('button',{name:'Account menu',exact:true});
    await button.click();const menu=page.getByRole('menu',{name:'Account'});await menu.waitFor();assert.equal(await button.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await button.evaluate(el=>el===document.activeElement),true);
    for(const key of ['Enter','Space','ArrowDown']) {await button.press(key);await menu.waitFor();assert.equal(await page.getByRole('menuitem',{name:'My Profile',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('ArrowDown');assert.equal(await page.getByRole('menuitem',{name:'Account Settings',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('End');assert.equal(await page.getByRole('menuitem',{name:'Sign Out',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape')}
    await button.press('ArrowUp');assert.equal(await page.getByRole('menuitem',{name:'Sign Out',exact:true}).evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');
    await button.press('Enter');await page.keyboard.press('Tab');assert.equal(await menu.count(),0);
    await button.click();await page.locator('#outside').click();assert.equal(await menu.count(),0);
    await button.click();await button.click();assert.equal(await menu.count(),0);
    await button.click();await page.evaluate(()=>window.setUser('fictional-b'));await menu.waitFor({state:'detached'});
    await button.click();assert.equal(await page.getByRole('menuitem',{name:'Account Settings',exact:true}).getAttribute('href'),'/settings/account');await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();await page.waitForFunction(()=>window.signedOut===true);assert.equal(await menu.count(),0);
    await button.click();await page.getByRole('menuitem',{name:'My Profile',exact:true}).click();assert.equal(await menu.count(),0);await page.goto(base+'/nav');
    results.push({kind,width,click:true,keyboard:true,dismissal:true});
   }
  } else {
   const button=page.getByRole('button',{name:kind==='profile'?'Edit profile photo':'Choose profile photo',exact:true});
   for(const key of ['click','Enter','Space']) {const before=chooserCount;const event=page.waitForEvent('filechooser');if(key==='click')await button.click();else await button.press(key);await event;assert.equal(chooserCount,before+1)}
   if(kind.startsWith('setup')) {
    const accountButton=page.getByRole('button',{name:'Account menu',exact:true});
    await accountButton.click();await page.getByRole('menu',{name:'Account'}).waitFor();await page.keyboard.press('Escape');
    assert.equal(await accountButton.evaluate(el=>el===document.activeElement),true);
    const select=async file=>{const event=page.waitForEvent('filechooser');await button.click();await (await event).setFiles(file)};
    if(kind==='setup-validation') {
     for(const file of [{name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('text')},{name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024)}]) {
      await select(file);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/under 5MB/);
     }
     assert.deepEqual(await page.evaluate(()=>window.writes),[]);assert.equal(await page.evaluate(()=>window.upload),undefined);
    } else {
     await select({name:'fictional.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=','base64')});
     await page.getByRole('img',{name:'Profile',exact:true}).waitFor();
     if(kind==='setup-retry')await page.evaluate(()=>window.failPhoto=true);
     if(kind==='setup-auth-retry'||kind==='setup-auth-reentry')await page.evaluate(()=>window.failAuth=true);
     if(kind==='setup-auth-switch')await page.evaluate(()=>window.holdAuth=true);
     if(kind==='setup-switch')await page.evaluate(()=>window.holdUpload=true);
     await page.getByRole('button',{name:'Skip for now'}).click();
     if(kind==='setup-retry') {
      await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/profile was saved, but your photo/);
      assert.equal(await page.evaluate(()=>window.lastPush),undefined);await page.evaluate(()=>window.failPhoto=false);
      await page.getByRole('button',{name:'Skip for now'}).click();
     }
     if(kind==='setup-auth-retry'||kind==='setup-auth-reentry') {
      await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/profile and photo were saved, but your account photo/);
      assert.equal(await page.evaluate(()=>window.lastPush),undefined);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('member-photo:fictional-a')),'/fictional-photo.png');
      if(kind==='setup-auth-reentry'){await page.reload();await page.getByRole('button',{name:'Skip for now'}).waitFor()}else await page.evaluate(()=>window.failAuth=false);
      await page.getByRole('button',{name:'Skip for now'}).click();
     }
     if(kind==='setup-auth-switch') {
      await page.waitForFunction(()=>typeof window.releaseAuth==='function');await page.evaluate(()=>window.setUser('fictional-b'));
      await page.getByRole('button',{name:'Choose profile photo'}).waitFor();await page.evaluate(()=>window.releaseAuth());
      await page.waitForFunction(()=>window.authWrites.length===1);assert.equal(await page.evaluate(()=>window.lastPush),undefined);
      assert.equal(await page.evaluate(()=>window.fixtureUser.photoURL),null);assert.equal(await accountButton.locator('img').count(),0);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('member-photo:fictional-b')),null);
     } else if(kind==='setup-switch') {
      await page.waitForFunction(()=>typeof window.releaseUpload==='function');await page.evaluate(()=>window.setUser('fictional-b'));
      await page.getByRole('button',{name:'Choose profile photo'}).waitFor();await page.evaluate(()=>window.releaseUpload());
      await page.waitForTimeout(50);assert.deepEqual(await page.evaluate(()=>window.writes),[]);assert.equal(await page.evaluate(()=>window.lastPush),undefined);
      assert.equal(await page.getByRole('img',{name:'Profile',exact:true}).count(),0);
     } else {
      await page.waitForFunction(()=>window.lastPush);const writes=await page.evaluate(()=>window.writes);
      if(kind!=='setup-auth-reentry') {
       assert.deepEqual(writes.at(-1),{uid:'fictional-a',data:{photoURL:'/fictional-photo.png'}});
       assert.equal(await page.evaluate(()=>window.upload.name),'avatars/fictional-a.png');
      } else {assert.deepEqual(writes,[]);assert.equal(await page.evaluate(()=>window.upload),undefined)}
      assert.equal(await page.evaluate(()=>window.fixtureUser.photoURL),'/fictional-photo.png');
      assert.equal(await accountButton.locator('img').getAttribute('src'),'/fictional-photo.png');
      await page.goto(base+'/nav');
      for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.equal(await page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).locator('img').getAttribute('src'),'/fictional-photo.png')}
      await page.reload();assert.equal(await page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).locator('img').getAttribute('src'),'/fictional-photo.png');
      await page.goto(base+'/setup');assert.equal(await page.getByRole('button',{name:'Account menu',exact:true}).locator('img').getAttribute('src'),'/fictional-photo.png');
     }
    }
   }
   results.push({kind,chooserClicksAndKeyboard:true});
  }
  await page.evaluate(()=>sessionStorage.clear());
 });
 assert.deepEqual(errors,[]);assert.deepEqual(escaped,[]);
 const report=process.env.IOPPS_AVATAR_REPORT_DIR||'reports/round5/remaining-avatar';
 fs.mkdirSync(report,{recursive:true});fs.writeFileSync(path.join(report,'browser-results.json'),JSON.stringify({scope:'Real React/Chrome, fictional adapters, minimal CSS; not Next hydration or provider persistence',results,errors,escaped},null,2));
});

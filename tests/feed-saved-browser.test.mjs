import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

// Desktop component/hook fixtures, not production Firebase or full Next routing.
test('desktop feed uniqueness and authenticated save intent retries/account isolation', { timeout: 60000 }, async t => {
  const require = createRequire(import.meta.url), root = process.cwd();
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'feed-saved-browser-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (name, text) => { const file = path.join(dir, name); fs.writeFileSync(file, text); return file; };
  const navigation = put('navigation.js', `const React=require('react');const listeners=new Set();let snapshot=location.search;
    const publish=()=>{snapshot=location.search;listeners.forEach(fn=>fn())};
    const router={push:url=>{window.lastPush=url},replace:url=>{history.replaceState(null,'',url);publish()}};
    window.navigate=url=>{history.replaceState(null,'',url);publish()};
    exports.useRouter=()=>router;exports.usePathname=()=>'/jobs/fixture';
    exports.useSearchParams=()=>new URLSearchParams(React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>snapshot));`);
  const auth = put('auth.js', `const React=require('react');const listeners=new Set();let uid='';window.setUser=value=>{uid=value;listeners.forEach(fn=>fn())};exports.useAuth=()=>{const id=React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>uid);return {user:id?{uid:id}:null,loading:false}};`);
  const saves = put('saves.js', `window.saved={alice:['existing'],bob:['bob-existing']};window.writes=[];window.offline=false;window.hold=false;
    exports.isPostSaved=async(uid,id)=>window.saved[uid].includes(id);
    exports.savePost=async(uid,id)=>{window.writes.push([uid,id]);if(window.offline)throw Error('offline');if(window.hold)await new Promise(resolve=>window.release=resolve);if(!window.saved[uid].includes(id))window.saved[uid].push(id)};
    exports.unsavePost=async(uid,id)=>{window.saved[uid]=window.saved[uid].filter(value=>value!==id)};`);
  const shell = put('shell.js', `const React=require('react');module.exports=({children,href,className,style})=>React.createElement(href?'a':'div',{href,className,style},children);`);
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';import Feed from ${JSON.stringify(path.join(root,'src/app/feed/page.tsx'))};import {useJobSave} from ${JSON.stringify(path.join(root,'src/hooks/useJobSave.ts'))};
    const job={id:'fixture',title:'Fictional job'};function Save(){const state=useJobSave(job);return React.createElement('main',null,React.createElement('button',{onClick:state.handleSave,disabled:state.saving,'aria-pressed':state.saved},state.saved?'Saved':'Save job'),state.saveError&&React.createElement('p',{role:'alert'},state.saveError))};createRoot(document.getElementById('root')).render(React.createElement(location.pathname==='/feed'?Feed:Save));`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve,reject)=>webpack({mode:'development',entry,devtool:false,output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:{'next/navigation':navigation,'next/link':shell,'@/components/AppShell':shell,'@/components/Card':shell,'@/lib/auth-context':auth,'@/lib/firestore/savedItems':saves,'@':path.join(root,'src')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve()));
  const job = {id:'job-a',slug:'job-a',title:'Same title',employerName:'Fictional employer',featured:true,createdAt:'2026-09-01'};
  const server=http.createServer((req,res)=>{
    if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));}
    else if(req.url.startsWith('/api/')){res.setHeader('content-type','application/json');res.end(JSON.stringify(req.url.startsWith('/api/jobs')?{jobs:[job,{...job},{...job,id:'job-b',slug:'job-b',featured:false}]}:req.url.startsWith('/api/events')?{events:[{id:'job-a',title:'Distinct event'}]}:{scholarships:[]}));}
    else {res.setHeader('content-type','text/html');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  const browser=await chromium.launch({headless:true,channel:'chrome'});t.after(()=>browser.close());
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage(), errors=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/feed');await page.getByRole('heading',{name:'Same title'}).first().waitFor();
  assert.equal(await page.locator('a[href="/jobs/job-a"]').count(),1);
  assert.equal(await page.locator('a[href="/jobs/job-b"]').count(),1);
  assert.equal(await page.locator('a[href="/events/job-a"]').count(),1);
  await page.goto(base+'/jobs/fixture');await page.getByRole('button',{name:'Save job'}).click();
  const next=await page.evaluate(()=>window.lastPush);assert.ok(next.includes('save%3D1'),next);
  assert.deepEqual(await page.evaluate(()=>window.writes),[]);
  await page.evaluate(()=>{window.offline=true;window.navigate('/jobs/fixture?save=1');window.setUser('alice')});
  await page.getByRole('alert').waitFor();assert.equal(new URL(page.url()).searchParams.get('save'),'1');
  await page.evaluate(()=>window.offline=false);await page.getByRole('button',{name:'Save job'}).click();
  await page.waitForFunction(()=>!location.search.includes('save=1'));
  assert.deepEqual(await page.evaluate(()=>window.saved.alice),['existing','fixture']);
  assert.equal(await page.getByRole('button',{name:'Saved'}).getAttribute('aria-pressed'),'true');
  // Begin a fresh intent for alice, then sign out and switch while persistence is held.
  await page.evaluate(()=>{window.hold=true;window.navigate('/jobs/fixture?save=1')});
  await page.waitForFunction(()=>typeof window.release==='function');
  await page.evaluate(()=>window.setUser(''));await page.getByRole('button',{name:'Save job'}).waitFor();
  await page.evaluate(()=>window.setUser('bob'));await page.waitForTimeout(100);
  await page.evaluate(()=>window.release());await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(()=>window.saved.bob),['bob-existing']);
  assert.equal(new URL(page.url()).searchParams.get('save'),'1');
  assert.equal(await page.getByRole('button',{name:'Save job'}).getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

// Exact jobs component + real React in Chrome; only routing/data/shell boundaries
// are fixtures. Deferred URL publication exercises the controlled-input race.
test('jobs: normal typing, interleaving, cancellation, URL and readable copy', { skip: process.env.IOPPS_TEST_JOBS_BROWSER !== 'true' }, async t => {
  const require = createRequire(import.meta.url);
  const root = process.cwd();
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'jobs-browser-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (name, source) => { const file = path.join(dir, name); fs.writeFileSync(file, source); return file; };
  const navigation = put('navigation.js', `const React=require('react');let snapshot=location.search;const listeners=new Set();let timer;
    const publish=()=>{snapshot=location.search;listeners.forEach(fn=>fn())};
    for(const method of ['replaceState','pushState']){const original=history[method].bind(history);history[method]=(...args)=>{original(...args);clearTimeout(timer);timer=setTimeout(publish,180)}}
    addEventListener('popstate',()=>{clearTimeout(timer);publish()});
    exports.useSearchParams=()=>new URLSearchParams(React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>snapshot));`);
  const shell = put('shell.js', `const React=require('react');module.exports=({children,href,...props})=>React.createElement(href?'a':'div',{...props,href},children);`);
  const analytics = put('analytics.js', 'exports.trackJobFunnelEvent=()=>{};');
  const loader = put('loader.cjs', `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
  const entry = put('entry.js', `import React from 'react';import {createRoot} from 'react-dom/client';import Jobs from ${JSON.stringify(path.join(root,'src/app/jobs/page.tsx'))};const root=createRoot(document.getElementById('root'));root.render(React.createElement(Jobs));window.unmountJobs=()=>root.unmount();`);
  const { webpack } = require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve,reject) => webpack({mode:'development',entry,devtool:false,output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules'),'node_modules'],alias:{'next/navigation':navigation,'next/link':shell,'@/components/OpportunityHeader':shell,'@/components/EmployerLogo':shell,'@/lib/job-funnel-analytics':analytics,'@':path.join(root,'src')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve()));
  const jobs = Array.from({length:350}, (_,i)=>({id:`fixture-${i}`,title:i===0?'Registered nurse':'Worker',employerName:'Fictional employer',location:'Saskatoon, SK',createdAt:new Date(Date.now()-87*86400000).toISOString()}));
  jobs[1].employerName='FNHA';jobs[1].employerId='fnha-short';
  jobs[2].employerName='First Nations Health Authority';jobs[2].employerId='fnha-long';
  const server=http.createServer((req,res)=>{
    if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));}
    else if(req.url==='/api/jobs'){res.setHeader('content-type','application/json');res.end(JSON.stringify({jobs}));}
    else if(req.url==='/api/organizations'){res.setHeader('content-type','application/json');res.end('{"orgs":[]}');}
    else {res.setHeader('content-type','text/html');res.end('<!doctype html><div id="root"></div><script>window.process={env:{}}</script><script src="/bundle.js"></script>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const browser=await chromium.launch({headless:true,channel:'chrome'});t.after(()=>browser.close());
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=`http://127.0.0.1:${server.address().port}/jobs`;
  await page.goto(base+'?page=2&keep=1#results');
  const q=page.getByLabel('Search jobs',{exact:true}),loc=page.getByLabel('Filter jobs by city or province');
  await page.waitForTimeout(700);
  assert.deepEqual(errors,[], 'fixture must mount without errors');
  assert.ok((await page.locator('body').innerText()).includes('350 jobs found'), (await page.locator('body').innerText()).slice(-1200));
  assert.equal(await page.getByText('Page 2 of 15',{exact:true}).textContent(),'Page 2 of 15');
  assert.equal(await page.getByText('Added to IOPPS 87 days ago',{exact:true}).first().textContent(),'Added to IOPPS 87 days ago');
  assert.equal(await page.getByText('350 jobs found',{exact:true}).evaluate(el=>el.childNodes.length),1,'count copy is one explicitly spaced text value');
  assert.equal(await page.getByText('Page 2 of 15',{exact:true}).evaluate(el=>el.childNodes.length),1,'pagination copy is one explicitly spaced text value');
  assert.equal(await page.getByText('Added to IOPPS 87 days ago',{exact:true}).first().evaluate(el=>el.childNodes.length),1,'age copy is one explicitly spaced text value');
  await q.pressSequentially('nurse',{delay:100});
  assert.equal(await q.inputValue(),'nurse','normal-speed search typing must retain every character');
  assert.equal(new URL(page.url()).searchParams.get('q'),null,'typing is immediate, URL waits for debounce');
  await loc.pressSequentially('Saskatoon',{delay:100});
  assert.equal(await loc.inputValue(),'Saskatoon','normal-speed location typing must retain every character');
  assert.equal(new URL(page.url()).searchParams.get('location'),null,'location also waits for debounce');
  await page.waitForTimeout(650);
  assert.equal(new URL(page.url()).searchParams.get('q'),'nurse');
  assert.equal(new URL(page.url()).searchParams.get('location'),'Saskatoon');
  assert.equal(new URL(page.url()).searchParams.has('page'),false);
  assert.equal(new URL(page.url()).searchParams.get('keep'),'1');
  assert.equal(new URL(page.url()).hash,'#results');
  assert.equal(await page.getByText('1 job found',{exact:true}).textContent(),'1 job found');
  await page.getByRole('button',{name:'Clear all filters',exact:true}).click();await page.waitForTimeout(250);
  await q.pressSequentially('nu',{delay:80});await loc.pressSequentially('Saska',{delay:80});await q.press('End');await q.pressSequentially('rse',{delay:80});await loc.press('End');await loc.pressSequentially('toon',{delay:80});
  assert.equal(await q.inputValue(),'nurse');assert.equal(await loc.inputValue(),'Saskatoon');await page.waitForTimeout(650);
  assert.equal(new URL(page.url()).searchParams.get('q'),'nurse');assert.equal(new URL(page.url()).searchParams.get('location'),'Saskatoon');
  // Clear must cancel a pending edit, not resurrect it when the timer expires.
  await q.pressSequentially(' pending',{delay:20});await page.getByRole('button',{name:'Clear all filters',exact:true}).click();await page.waitForTimeout(700);
  assert.equal(await q.inputValue(),'');assert.equal(await loc.inputValue(),'');assert.equal(new URL(page.url()).searchParams.has('q'),false);
  // Explicit navigation/back supersedes drafts and pending commits.
  await page.evaluate(()=>history.pushState(null,'','?q=Worker&location=Regina'));await page.waitForTimeout(250);
  assert.equal(await q.inputValue(),'Worker');assert.equal(await loc.inputValue(),'Regina');
  await q.pressSequentially('pending',{delay:20});await page.goBack();await page.waitForTimeout(700);
  assert.equal(await q.inputValue(),'');assert.equal(await loc.inputValue(),'');
  // Enter flushes both drafts without waiting for the debounce.
  await q.pressSequentially('nurse',{delay:20});await loc.pressSequentially('Saskatoon',{delay:20});await loc.press('Enter');
  assert.equal(new URL(page.url()).searchParams.get('q'),'nurse');assert.equal(new URL(page.url()).searchParams.get('location'),'Saskatoon');
  await page.getByRole('button',{name:'Clear all filters',exact:true}).click();await page.waitForTimeout(250);
  await page.locator('summary').click();
  const employer=page.getByLabel('Employer',{exact:true});
  assert.equal(await employer.locator('option').count(),3,'all employers + fictional + one canonical FNHA');
  await employer.selectOption({label:'First Nations Health Authority'});await page.waitForTimeout(250);
  assert.equal(await page.getByText('2 jobs found',{exact:true}).textContent(),'2 jobs found');
  assert.equal(await page.locator('.job-rich-card').count(),2);
  await page.getByRole('button',{name:'Clear all filters',exact:true}).click();
  // Typing immediately after clear survives the delayed clear acknowledgement.
  await q.pressSequentially('nu',{delay:60});await page.waitForTimeout(450);
  // The 'nu' URL write is now in flight while newer text is being typed.
  await q.press('End');await q.pressSequentially('rse',{delay:70});
  assert.equal(await q.inputValue(),'nurse');await page.waitForTimeout(650);
  assert.equal(new URL(page.url()).searchParams.get('q'),'nurse');
  await loc.pressSequentially('Saskatoon',{delay:20});
  await page.getByLabel('Filter jobs by employment type').selectOption('Full-time');
  await page.waitForTimeout(650);
  assert.equal(await loc.inputValue(),'Saskatoon');
  assert.equal(new URL(page.url()).searchParams.get('type'),'Full-time');
  assert.equal(new URL(page.url()).searchParams.get('q'),'nurse');
  assert.equal(new URL(page.url()).searchParams.get('location'),'Saskatoon');
  await page.getByRole('button',{name:'Clear job search',exact:true}).click();
  assert.equal(await q.inputValue(),'');
  assert.equal(new URL(page.url()).searchParams.get('q'),null);
  assert.equal(new URL(page.url()).searchParams.get('location'),'Saskatoon');
  await q.pressSequentially('pending',{delay:20});
  const beforeUnmount=page.url();await page.evaluate(()=>window.unmountJobs());await page.waitForTimeout(650);
  assert.equal(page.url(),beforeUnmount,'unmount cancels pending URL writes');
  assert.deepEqual(errors,[]);
});

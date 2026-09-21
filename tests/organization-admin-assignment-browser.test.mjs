import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {chromium} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import {createAssignmentStore} from '../src/lib/server/organization-admin-assignment-firestore.ts';
import {handleAssignmentRequest} from '../src/lib/server/organization-admin-assignment-request.ts';

test('local browser: desktop/mobile review, exact confirmation, cancel/focus, apply/readback and errors', {skip:process.env.IOPPS_TEST_ASSIGNMENT_BROWSER!=='true'},async t=>{
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
  const output=path.resolve('output/playwright/organization-admin-assignment');fs.mkdirSync(output,{recursive:true});
  t.after(()=>{for(const name of ['component.js','entry.js','bundle.js'])fs.rmSync(path.join(output,name),{force:true});});
  const source=fs.readFileSync('src/components/admin/OrganizationAdminAssignment.tsx','utf8');
  fs.writeFileSync(path.join(output,'component.js'),ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  fs.writeFileSync(path.join(output,'entry.js'),`import React from 'react';import {createRoot} from 'react-dom/client';import Component from './component.js';createRoot(document.getElementById('root')).render(React.createElement(Component,{orgId:'batc',getToken:async()=>'local-fixture',onApplied:async()=>{window.refreshed=true}}));`);
  const require=createRequire(import.meta.url);const {webpack}=require('next/dist/compiled/webpack/webpack');
  await new Promise((resolve,reject)=>{webpack({mode:'development',entry:path.join(output,'entry.js'),output:{path:output,filename:'bundle.js'},devtool:false},(err,stats)=>err||stats.hasErrors()?reject(err||Error(stats.toString('errors-only'))):resolve());});
  // Webpack emits static/css; Turbopack emits static/chunks. Read real build assets in either layout.
  const cssDirectory=path.join(process.env.IOPPS_BUILD_DIRECTORY || '.next','static');
  const cssFiles=fs.readdirSync(cssDirectory,{recursive:true}).filter(f=>f.endsWith('.css')).sort();
  assert.ok(cssFiles.length,'Build-generated app styles are required');
  const css=cssFiles.map(f=>fs.readFileSync(path.join(cssDirectory,f),'utf8')).join('\n');
  const id='demo-batc-browser-'+Date.now();const app=initializeApp({projectId:id},id);const db=getFirestore(app);const auth=getAuth(app);
  t.after(async()=>{await db.terminate();await deleteApp(app);});
  await auth.createUser({uid:'pete',email:'Admin.QA@example.test'});
  await db.doc('users/pete').set({email:'Admin.QA@example.test',role:'community'});
  await db.doc('employers/batc').set({disabled:true,status:'disabled',ownerId:'original',onboardingComplete:true,logo:'/fixture.png',description:'Fixture',contactEmail:'fixture@example.test'});
  await db.doc('organizations/batc').set({disabled:true,status:'disabled',ownerId:'original',onboardingComplete:true,logo:'/fixture.png',description:'Fixture',contactEmail:'fixture@example.test'});
  const server=http.createServer(async(req,res)=>{
    try {
      if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(output,'bundle.js')));return;}
      if(req.url==='/styles.css'){res.setHeader('content-type','text/css');res.end(css);return;}
      if(req.url==='/api/admin/employers/batc/administrator'){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const request=new Request('http://localhost'+req.url,{method:'POST',headers:req.headers,body:Buffer.concat(chunks)});
        const result=await handleAssignmentRequest(request,'batc',{authorize:async()=>req.headers.authorization==='Bearer local-fixture'?{actor:'local-superadmin'}:{response:Response.json({error:'Unauthorized'},{status:401})},getSecret:()=> 'local-test-only-secret-material-32-bytes',getStore:desired=>createAssignmentStore(db,auth,desired)});
        res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
      }
      res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body style="padding:24px"><main id="root" style="max-width:850px;margin:auto"></main><script src="/bundle.js"></script></body></html>');
    }catch{res.statusCode=500;res.end('{}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});t.after(()=>browser.close());
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const url=`http://127.0.0.1:${server.address().port}`;
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});await page.goto(url);
    await page.getByLabel('Exact existing user email').fill('Admin.QA@example.test');
    assert.equal(await page.getByRole('button',{name:'Review assignment',exact:true}).isDisabled(),true);
    await page.getByLabel('Organization role',{exact:true}).selectOption('admin');
    await page.getByLabel('Enable this organization',{exact:false}).check();
    await page.getByRole('button',{name:'Review assignment',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'visible'});
    assert.match(await page.getByRole('row').filter({hasText:'Employer public visibility'}).innerText(),/hidden/);
    assert.match(await page.getByRole('row').filter({hasText:'Organization public visibility'}).innerText(),/hidden/);
    assert.equal(await page.getByRole('button',{name:'Confirm assignment',exact:true}).isDisabled(),true);
    await page.getByLabel('Exact assignment confirmation').fill('incorrect');
    assert.equal(await page.getByRole('button',{name:'Confirm assignment',exact:true}).isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(output,`review-${width}.png`)});
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.equal(await page.getByRole('button',{name:'Review assignment',exact:true}).evaluate(el=>document.activeElement===el),true);
  }
  await page.getByRole('button',{name:'Review assignment',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'visible'});
  const exact='ASSIGN Admin.QA@example.test TO batc AS admin ENABLE YES';
  await page.getByLabel('Exact assignment confirmation').fill(exact);
  await page.getByRole('button',{name:'Confirm assignment',exact:true}).click();
  await page.getByRole('status').waitFor();
  assert.match(await page.getByRole('status').innerText(),/verified by independent readback/);
  assert.equal(await page.evaluate(()=>window.refreshed),true);
  assert.equal((await db.doc('members/pete').get()).data().orgRole,'admin');
  await page.screenshot({path:path.join(output,'readback-mobile.png')});
  await page.getByLabel('Exact existing user email').fill('missing@example.test');
  await page.getByRole('button',{name:'Review assignment',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/not found/);
  assert.deepEqual(errors,[]);
});

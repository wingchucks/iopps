// Built Next + real demo Auth. Template rendering uses a memory-only delivery adapter.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

import {startIsolatedQaServer} from '../../scripts/local-qa-server.mjs';
import {mailApiHarness} from '../helpers/goal01-mail-api.mjs';
import {goal01BrowserOptions} from '../../scripts/qa-goal01-browser-options.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [k,v] of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}))assert.equal(process.env[k],v);
const output=path.resolve(process.env.MISSION_OUTPUT || 'reports/autonomous-mission/goal01-'+Date.now());await fs.mkdir(output,{recursive:true});
const prefix='mission-auth-'+crypto.randomUUID(),app=initializeApp({projectId:'demo-iopps-preview'},prefix),auth=getAuth(app),db=getFirestore(app);
const cleanupPaths=[];
const rows=[],users=[],emails=[],cleanup=[],blocked=[],consoleRows=[],pageErrors=[],httpErrors=[],requestFailures=[],timeline=[],warnings=[];let activeCheck='startup',pageSequence=0;
const password='Fictional-only-2026!',changed='Fictional-changed-2026!';let browser,server,page,mailApi,denyProxy;
const scrub=s=>String(s).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"'<]+/gi,'$1[REDACTED]');
const save=async(name,data)=>fs.writeFile(path.join(output,name+'.json'),JSON.stringify(data,null,2));
async function check(name,fn){activeCheck=name;try{await fn();rows.push({name,status:'pass'});}catch(e){rows.push({name,status:'fail',error:scrub(e.message)});if(page&&!page.isClosed()){await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:true});await fs.writeFile(path.join(output,name+'-dom.txt'),scrub(await page.locator('body').ariaSnapshot()));}}await save('results',{rows});}
async function shot(name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});await fs.writeFile(path.join(output,name+'-dom.txt'),scrub(await page.locator('body').ariaSnapshot()));}
async function context(width){
 const c=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 // Explicitly approved fictional peripheral feed; not real YouTube coverage.
 if(process.env.GOAL01_FICTIONAL_YOUTUBE==='true')await c.route(server.base+'/api/livestreams/youtube',async route=>{
  if(route.request().method()!=='GET')return route.continue();
  timeline.push({time:Date.now(),check:activeCheck,event:'fictional-youtube-feed',path:'/api/livestreams/youtube'});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({live:null,upcoming:[],recent:[],selected:null,fixture:'fictional-auth-QA-only'})});
 });
 await c.addInitScript(()=>{for(const event of ['beforeunload','pagehide'])window.addEventListener(event,()=>console.info('__goal01_lifecycle__'+event));});
 // Loopback goes directly to the owned services; the browser proxy denies every external destination.
 await c.routeWebSocket('**/*',s=>s.close());
 c.on('page',p=>{
  const pageId=++pageSequence;p.__missionPageId=pageId;
  const meta=()=>({pageId,time:Date.now(),check:activeCheck,page:p.url().startsWith('http')?new URL(p.url()).pathname:p.url()});
  const req=r=>({path:new URL(r.url()).pathname,method:r.method(),resourceType:r.resourceType(),navigation:r.isNavigationRequest(),rsc:r.headers()['rsc']||null,prefetch:r.headers()['next-router-prefetch']||r.headers()['purpose']||null,segment:r.headers()['next-router-segment-prefetch']||null,redirectedFrom:r.redirectedFrom()?scrub(r.redirectedFrom().url()):null});
  p.on('close',()=>timeline.push({...meta(),event:'page-closed'}));
  p.on('framenavigated',frame=>{if(frame===p.mainFrame())timeline.push({...meta(),event:'navigation'});});
  p.on('request',r=>timeline.push({...meta(),event:'request',...req(r)}));
  p.on('pageerror',e=>pageErrors.push(scrub(e.message)));
  p.on('console',m=>{if(m.text().startsWith('__goal01_lifecycle__'))timeline.push({...meta(),event:m.text().slice('__goal01_lifecycle__'.length)});if(['error','warning'].includes(m.type())){const row={...meta(),type:m.type(),message:scrub(m.text()),location:{...m.location(),url:scrub(m.location().url)}};if(m.type()==='error')consoleRows.push(row);else warnings.push(row);}});
  p.on('response',r=>{const row={...meta(),status:r.status(),...req(r.request())};timeline.push({...row,event:'response'});if(r.status()>=400)httpErrors.push(row);});
  p.on('requestfailed',r=>{const row={...meta(),...req(r),error:r.failure()?.errorText};requestFailures.push(row);timeline.push({...row,event:'requestfailed'});});
 });return c;
}
async function form(email,role){await page.goto(server.base+'/signup');const choice=page.getByRole('button',{name:role==='organization'?/Business or organization/:/Individual/});await choice.click();await expect(choice).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.locator('#name').fill('Fictional Mission '+role);await page.locator('#email').fill(email);await page.locator('#password').fill(password);await page.locator('#confirmPassword').fill(password);await page.locator('#signup-consent').check();await page.getByRole('button',{name:'Create Account →',exact:true}).click();}
async function login(email,pw){await page.goto(server.base+'/login');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(pw);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(u=>!['/login','/verify-email'].includes(u.pathname));await expect.poll(async()=>(await page.context().cookies()).some(c=>c.name==='__session'&&!!c.value)).toBe(true);}
// The SDK emulator issuance is checked separately; inbox uses actual API output.
async function inbox(c,email,reset=false){
 const result=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();
 assert.ok(result.oobCodes.some(v=>v.email===email&&v.requestType===(reset?'PASSWORD_RESET':'VERIFY_EMAIL')),'Actual client request issued an emulator action');
 const identity=await auth.getUserByEmail(email);
 const captured=await mailApi.exercise({email,uid:identity.uid,password,reset});
 const inbox=await c.newPage();
 await inbox.route(server.base+'/__mission_inbox',r=>r.fulfill({contentType:'text/html',body:captured.html}));
 await inbox.goto(server.base+'/__mission_inbox');
 await expect(inbox.getByRole('heading',{name:reset?'Reset your IOPPS password':'Confirm your IOPPS account',exact:true})).toBeVisible();
 const a=inbox.getByRole('link',{name:reset?'Reset password':'Confirm Email',exact:true});
 const action=new URL(await a.getAttribute('href'));assert.equal(action.pathname,'/auth/action');
 if(reset){
  assert.equal(action.origin,'https://iopps.ca');
  // Intercept the exact generated destination BEFORE network, redirect only origin
  // to the owned build. Preserve the issued code/continuation in memory.
  await inbox.route(action.href,r=>r.fulfill({status:307,headers:{location:server.base+action.pathname+action.search}}));
 }
 await a.click();await inbox.unrouteAll({behavior:'wait'});return inbox;
}
try{
 server=await startIsolatedQaServer();server.base=server.base.replace('127.0.0.1','localhost');mailApi=mailApiHarness({auth,db,app,base:server.base,prefix});denyProxy=http.createServer((req,res)=>{const u=new URL(req.url);if(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)){const requestId=crypto.randomUUID();const meta=()=>({time:Date.now(),check:activeCheck,requestId,path:u.pathname,method:req.method,reusedSocket:upstream.reusedSocket,clientAborted:req.aborted,responseDestroyed:res.destroyed,responseFinished:res.writableFinished,headersSent:res.headersSent});const upstream=http.request({protocol:'http:',hostname:'127.0.0.1',port:u.port==='8080'?8080:u.port==='9099'?9099:u.port==='9199'?9199:Number(new URL(server.base).port),path:u.pathname+u.search,agent:false,method:req.method,headers:{...req.headers,host:u.host}},reply=>{timeline.push({...meta(),event:'proxy-upstream-response',status:reply.statusCode,cors:reply.headers['access-control-allow-origin']||null});res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',error=>{timeline.push({...meta(),event:'proxy-upstream-error',code:error.code});if(!res.destroyed){timeline.push({...meta(),event:'proxy-generated-502'});res.writeHead(502);res.end();}});req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);return;}blocked.push({host:u.host,path:u.pathname,policy:'proxy-denied'});res.writeHead(403,{'Connection':'close'});res.end();});denyProxy.on('connect',(req,socket)=>{blocked.push({host:req.url,path:'CONNECT',policy:'proxy-denied'});socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});await new Promise(resolve=>denyProxy.listen(0,'127.0.0.1',resolve));browser=await chromium.launch(goal01BrowserOptions({proxyPort:denyProxy.address().port,allowedPorts:[new URL(server.base).port,8080,9099,9199]}));
 await check('transport-route-auth-boundaries',async()=>{
  for(const target of ['/profile','/profile.rsc','/_next/data/fictional/profile.json']){
   const response=await fetch(server.base+target,{redirect:'manual'});
   assert.equal(response.status,307,target);
   const destination=response.headers.get('location')||response.headers.get('x-nextjs-redirect');
   assert.ok(destination&&new URL(destination,server.base).pathname==='/login',target+' must retain auth redirect');
  }
 });
 await check('auth-redirect-rsc-prefetch',async()=>{
  for(const target of ['/org/dashboard','/profile','/org/checkout']){
   const headers={rsc:'1','next-router-prefetch':'1','next-router-segment-prefetch':target+'/__PAGE__'};
   const response=await fetch(server.base+target,{headers});
   assert.equal(new URL(response.url).pathname,'/login');
   assert.equal(response.status,204,'obsolete auth-redirect segment prefetch must be cancelled');
   assert.equal(await response.text(),'');
   assert.equal(response.headers.get('cache-control'),'private, no-store');
   const document=await fetch(server.base+target);
   assert.equal(new URL(document.url).pathname,'/login');assert.equal(document.status,200);
   const rsc=await fetch(server.base+'/login',{headers:{rsc:'1','next-router-prefetch':'1'}});
   assert.equal(rsc.status,200);assert.match(rsc.headers.get('content-type'),/text\/x-component/);
  }
 });
 for(const [role,width] of [['community',1440],['organization',390]]){
 const c=await context(width);page=await c.newPage();page.setDefaultTimeout(12000);const email=prefix+'-'+role+'@example.invalid';emails.push(email);let user;
 await check(role+'-signup-role',async()=>{await form(email,role);await expect(page.getByRole('heading',{name:'Check your Inbox',exact:true})).toBeVisible();user=await auth.getUserByEmail(email);users.push(user.uid);assert.equal(user.emailVerified,false);if(role==='organization')assert.equal((await db.doc('users/'+user.uid).get()).data().signupIntent,'organization');await shot(role+'-signup');});
 if(!user){await c.close();continue;}
 await check(role+'-unverified-gate',async()=>{await page.goto(server.base+'/profile');await page.waitForURL(u=>u.pathname==='/verify-email');await expect(page.getByText('Click the link in your email to verify your account. This page will automatically update once verified.',{exact:true})).toBeVisible();await shot(role+'-gate');});
 await check(role+'-email-click',async()=>{page=await inbox(c,email);await expect(page.getByRole('heading',{name:'Email verified',exact:true})).toBeVisible();assert.equal((await auth.getUser(user.uid)).emailVerified,true);await shot(role+'-verified');});
 await check(role+'-exact-verification-copy',async()=>{await expect(page.getByRole('heading',{name:'Email verified',exact:true})).toBeVisible();await expect(page.locator('section').getByRole('status')).toHaveText('Your email address is confirmed.');});
 await check(role+'-logout-route',async()=>{await page.goto(server.base+'/logout');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(u=>u.pathname==='/');assert.equal((await c.cookies()).some(v=>v.name==='__session'&&!!v.value),false);});
 await check(role+'-duplicate-inline',async()=>{await form(email,role);await expect(page.getByText('This email is already registered. Please sign in or reset your password.',{exact:true})).toBeVisible();await shot(role+'-duplicate');});
 await check(role+'-reset-email-click-login',async()=>{await page.goto(server.base+'/forgot-password');await page.locator('input[type=email]').fill(email);await page.locator('button[type=submit]').click();await expect(page.getByRole('heading',{name:'Check your email',exact:true})).toBeVisible();page=await inbox(c,email,true);await expect(page.getByRole('heading',{name:'Choose a new password',exact:true})).toBeVisible();await page.getByLabel('New password',{exact:true}).fill(changed);await page.getByLabel('Confirm new password',{exact:true}).fill(changed+'x');await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.locator('section').getByRole('alert')).toHaveText('Your passwords do not match.');await page.getByLabel('Confirm new password',{exact:true}).fill(changed);await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.getByRole('heading',{name:'Password updated',exact:true})).toBeVisible();await shot(role+'-reset');await login(email,changed);});
 await check(role+'-account-menu-signout',async()=>{await page.goto(server.base+'/org/plans');await page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).click();await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();await page.waitForURL(u=>u.pathname==='/login'||u.pathname==='/');await expect(page.getByRole('heading',{name:'Sign in to IOPPS',exact:true}).or(page.getByRole('link',{name:'Sign In',exact:true}).filter({visible:true}).first())).toBeVisible();await expect.poll(async()=>(await c.cookies()).some(v=>v.name==='__session'&&!!v.value)).toBe(false);const sameTabProbe=process.env.GOAL01_SAME_TAB_PROBE==='true';timeline.push({pageId:page.__missionPageId,time:Date.now(),check:activeCheck,event:sameTabProbe?'protected-check-hard-unload-probe':'protected-check-new-tab'});if(!sameTabProbe)page=await c.newPage();await page.goto(server.base+'/profile');await page.waitForURL(u=>u.pathname==='/login');await expect(page.getByRole('heading',{name:'Sign in to IOPPS',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Sign In',exact:true})).toBeEnabled();await shot(role+'-signed-out-login');});
 await c.close();
 }
 await check('no-page-errors',async()=>assert.deepEqual(pageErrors,[]));
 const duplicateHttp=r=>r.status===400&&r.path==='/identitytoolkit.googleapis.com/v1/accounts:signUp'&&['community-duplicate-inline','organization-duplicate-inline'].includes(r.check)&&rows.some(v=>v.name===r.check&&v.status==='pass');
 await check('no-unexpected-http-errors',async()=>assert.deepEqual(httpErrors.filter(r=>!duplicateHttp(r)),[]));
 await check('no-unexpected-console-errors',async()=>assert.deepEqual(consoleRows.filter(r=>!(r.message==='Failed to load resource: the server responded with a status of 400 (Bad Request)'&&new URL(r.location.url).pathname==='/identitytoolkit.googleapis.com/v1/accounts:signUp'&&httpErrors.some(h=>h.check===r.check&&duplicateHttp(h)))),[]));
}catch(e){rows.push({name:'infrastructure',status:'fail',error:scrub(e.stack)});}
finally{
 if(browser)await browser.close();
 if(denyProxy){denyProxy.closeAllConnections();await new Promise(resolve=>denyProxy.close(resolve));}
 // Recover identities even if creation succeeded before assertion/acknowledgement.
 for(const email of emails){try{const u=await auth.getUserByEmail(email);if(!users.includes(u.uid))users.push(u.uid);}catch(e){if(e.code!=='auth/user-not-found')throw e;}}
 if(mailApi){await save('mail-api',mailApi.audit);cleanup.push(...await mailApi.cleanup());}
 for(const uid of users){for(const collection of ['users','members','organizations','employers']){const ref=db.doc(collection+'/'+uid);await ref.delete();cleanup.push({path:ref.path,absent:!(await ref.get()).exists});}await auth.deleteUser(uid);let absent=false;try{await auth.getUser(uid);}catch(e){absent=e.code==='auth/user-not-found';}assert.equal(absent,true);cleanup.push({uid,absent});}
 for(const p of cleanupPaths){const ref=db.doc(p);await ref.delete();const absent=!(await ref.get()).exists;assert.equal(absent,true);cleanup.push({path:p,absent});}
 if(server){await fs.writeFile(path.join(output,'server.log'),scrub(server.getLogs()));await server.stop();await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(Number(new URL(server.base).port),'127.0.0.1',()=>s.close(resolve));});}
 await db.terminate();await deleteApp(app);await save('cleanup',{fixtures:cleanup,browserStopped:!browser?.isConnected(),serverStopped:true,denyProxyStopped:!denyProxy?.listening});await save('network',{blocked,pageErrors,consoleRows,warnings,httpErrors,requestFailures,timeline});await save('results',{prefix,rows,limitations:[...(process.env.GOAL01_FICTIONAL_YOUTUBE==='true'?['YouTube feed is an explicitly approved fictional empty fixture for auth QA. Real isolated feed503 remains documented; no provider certification.']:[]),'SDK emulator issuance plus actual production verification/reset route logic with real emulator tokens, reservations and OOB codes. Exact app mail transport is memory-only; AppCheck issuer is fictional. Reset origin is intercepted to loopback. No real delivery or hosted-provider certification.','Role signup is Auth account plus organization intent, not completed organization creation (Goal3).','Goals2-8 unexecuted.']});
}
console.log(JSON.stringify({output,pass:rows.filter(r=>r.status==='pass').length,fail:rows.filter(r=>r.status==='fail').length}));process.exitCode=rows.some(r=>r.status==='fail')?1:0;

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
import {goal01BrowserOptions} from '../../scripts/qa-goal01-browser-options.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [k,v] of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}))assert.equal(process.env[k],v);
const output=path.resolve(process.env.MISSION_OUTPUT || 'reports/autonomous-mission/goal02-'+Date.now());await fs.mkdir(output,{recursive:true});
const prefix='mission-onboarding-'+crypto.randomUUID(),app=initializeApp({projectId:'demo-iopps-preview'},prefix),auth=getAuth(app),db=getFirestore(app);
const cleanupPaths=[];
const pendingApi=new Set();
const rows=[],users=[],cleanup=[],blocked=[],consoleRows=[],pageErrors=[],httpErrors=[],requestFailures=[],timeline=[],warnings=[];let activeCheck='startup',pageSequence=0;
const password='Fictional-only-2026!';let browser,server,page,denyProxy;
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
 // Observe actual requests, without substituting a response. Both AppShell
 // account owners must resolve before the harness leaves a fresh document.
 await c.addInitScript(()=>{window.__goal02AccountChecks=0;const original=window.fetch;window.fetch=async function(...args){const response=await original.apply(this,args);if(new URL(response.url,location.href).pathname==='/api/employer/check'&&response.ok)window.__goal02AccountChecks++;return response;};});
 // Loopback goes directly to the owned services; the browser proxy denies every external destination.
 await c.routeWebSocket('**/*',s=>s.close());
 c.on('page',p=>{
  const pageId=++pageSequence;p.__missionPageId=pageId;
  const meta=()=>({pageId,time:Date.now(),check:activeCheck,page:p.url().startsWith('http')?new URL(p.url()).pathname:p.url()});
  const req=r=>({path:new URL(r.url()).pathname,method:r.method(),resourceType:r.resourceType(),navigation:r.isNavigationRequest(),rsc:r.headers()['rsc']||null,prefetch:r.headers()['next-router-prefetch']||r.headers()['purpose']||null,segment:r.headers()['next-router-segment-prefetch']||null,redirectedFrom:r.redirectedFrom()?scrub(r.redirectedFrom().url()):null});
  p.on('close',()=>timeline.push({...meta(),event:'page-closed'}));
  p.on('framenavigated',frame=>{if(frame===p.mainFrame())timeline.push({...meta(),event:'navigation'});});
  p.on('request',r=>{if(r.method()==='GET'&&new URL(r.url()).pathname.startsWith('/api/'))pendingApi.add(r);timeline.push({...meta(),event:'request',...req(r)});});
  p.on('requestfinished',r=>pendingApi.delete(r));
  p.on('requestfailed',r=>pendingApi.delete(r));
  p.on('pageerror',e=>pageErrors.push(scrub(e.message)));
  p.on('console',m=>{if(m.text().startsWith('__goal01_lifecycle__'))timeline.push({...meta(),event:m.text().slice('__goal01_lifecycle__'.length)});if(['error','warning'].includes(m.type())){const row={...meta(),type:m.type(),message:scrub(m.text()),location:{...m.location(),url:scrub(m.location().url)}};if(m.type()==='error')consoleRows.push(row);else warnings.push(row);}});
  p.on('response',r=>{const row={...meta(),status:r.status(),...req(r.request())};timeline.push({...row,event:'response'});if(r.status()>=400)httpErrors.push(row);});
  p.on('requestfailed',r=>{const row={...meta(),...req(r),error:r.failure()?.errorText};requestFailures.push(row);timeline.push({...row,event:'requestfailed'});});
 });return c;
}

async function account(width,extra={}) {
 const u=await auth.createUser({email:prefix+'-'+width+'-'+users.length+'@example.invalid',password,emailVerified:true,displayName:'Fictional Auth Name'});users.push(u.uid);
 await db.doc('users/'+u.uid).set({uid:u.uid,email:u.email,displayName:u.displayName,role:'community',...extra});return u;
}
async function login(u) {await navigate(server.base+'/login');await page.getByLabel('Email address',{exact:true}).fill(u.email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');await expect.poll(async()=>(await page.context().cookies()).some(c=>c.name==='__session'&&!!c.value)).toBe(true);}
async function logout() {await navigate(server.base+'/logout');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(server.base+'/');await expect.poll(async()=>(await page.context().cookies()).some(c=>c.name==='__session'&&!!c.value)).toBe(false);}
async function next(){await page.getByRole('button',{name:'Continue',exact:true}).click();}
async function ready(){
 const pathname=new URL(page.url()).pathname;
 if(pathname==='/feed')await expect(page.getByRole('heading',{name:'No opportunities yet',exact:true})).toBeVisible();
 if(pathname==='/profile')await expect(page.getByRole('button',{name:'Edit Profile',exact:true})).toBeVisible();
 if(pathname==='/settings/account')await expect(page.getByRole('heading',{name:'Account',exact:true})).toBeVisible();
 if(['/feed','/profile','/settings/account'].includes(pathname))await expect.poll(()=>page.evaluate(()=>window.__goal02AccountChecks),{timeout:10000}).toBeGreaterThanOrEqual(2);
 try {await expect.poll(()=>pendingApi.size,{timeout:10000}).toBe(0);}catch(error){timeline.push({event:'pending-api-timeout',check:activeCheck,pending:[...pendingApi].map(r=>({path:new URL(r.url()).pathname,method:r.method(),resourceType:r.resourceType()}))});throw error;}
}
async function navigate(url){if(page.url().startsWith('http'))await ready();timeline.push({time:Date.now(),check:activeCheck,event:'harness-navigation',path:new URL(url).pathname});await page.goto(url);}
async function step(number,width){const counter=page.getByText(new RegExp('^Step '+number+' of 5'));await expect(counter).toHaveCount(1);if(width<1000)await expect(counter).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
try {
 server=await startIsolatedQaServer();server.base=server.base.replace('127.0.0.1','localhost');denyProxy=http.createServer((req,res)=>{const u=new URL(req.url);if(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)){const requestId=crypto.randomUUID();const meta=()=>({time:Date.now(),check:activeCheck,requestId,path:u.pathname,method:req.method,reusedSocket:upstream.reusedSocket,clientAborted:req.aborted,responseDestroyed:res.destroyed,responseFinished:res.writableFinished,headersSent:res.headersSent});const upstream=http.request(u,{agent:false,method:req.method,headers:{...req.headers,host:u.host}},reply=>{timeline.push({...meta(),event:'proxy-upstream-response',status:reply.statusCode,cors:reply.headers['access-control-allow-origin']||null});res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',error=>{timeline.push({...meta(),event:'proxy-upstream-error',code:error.code});if(!res.destroyed){timeline.push({...meta(),event:'proxy-generated-502'});res.writeHead(502);res.end();}});req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);return;}blocked.push({host:u.host,path:u.pathname,policy:'proxy-denied'});res.writeHead(403,{'Connection':'close'});res.end();});denyProxy.on('connect',(req,socket)=>{blocked.push({host:req.url,path:'CONNECT',policy:'proxy-denied'});socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});await new Promise(resolve=>denyProxy.listen(0,'127.0.0.1',resolve));browser=await chromium.launch(goal01BrowserOptions({proxyPort:denyProxy.address().port,allowedPorts:[new URL(server.base).port,8080,9099,9199]}));

 for(const width of [1440,390]){
  const c=await context(width);page=await c.newPage();page.setDefaultTimeout(10000);
  const u=await account(width);
  await check(width+'-new-profile-completion',async()=>{
   assert.equal((await db.doc('members/'+u.uid).get()).exists,false);
   await login(u);await page.waitForURL('**/setup');await expect(page.getByRole('heading',{name:'Hey Fictional Auth Name!',exact:true})).toBeVisible();
   await page.getByPlaceholder('e.g. Muskoday First Nation').fill('Fictional community');
   for(let n=1;n<=5;n++){await step(n,width);if(n<5)await next();}
   const response=page.waitForResponse(r=>r.url().endsWith('/api/profile/setup')&&r.request().method()==='POST');await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();assert.equal((await response).status(),200);await page.waitForURL('**/feed');
   assert.equal((await db.doc('users/'+u.uid).get()).data().setupComplete,true);assert.equal((await db.doc('members/'+u.uid).get()).data().community,'Fictional community');
   await logout();await login(u);await page.waitForURL('**/feed');await navigate(server.base+'/dashboard');await page.waitForURL('**/feed');await shot(width+'-durable-completion');
  });
  await check(width+'-completion-flag-independent-of-member-existence',async()=>{
   // Owned fixture differential: completion must remain authoritative without a member record.
   await db.doc('members/'+u.uid).delete();assert.equal((await db.doc('members/'+u.uid).get()).exists,false);
   await logout();await login(u);await page.waitForURL('**/feed');await navigate(server.base+'/dashboard');await page.waitForURL('**/feed');
  });
  const stored={uid:u.uid,email:u.email,displayName:'Fictional Saved Member Name',community:'Saved community',location:'Saved town',bio:'Saved biography',languages:'Saved languages',headline:'Saved headline',skills:['Writing','Testing'],interests:['jobs'],targetRoles:['Coordinator','Developer']};
  await db.doc('members/'+u.uid).set(stored);await navigate(server.base+'/setup');await expect(page.getByPlaceholder('e.g. Muskoday First Nation')).toHaveValue(stored.community);
  await check(width+'-saved-name-prefill',async()=>{await expect(page.getByRole('heading',{name:'Hey '+stored.displayName+'!',exact:true})).toBeVisible();});
  await check(width+'-direct-prefill-basics-languages',async()=>{await step(1,width);await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toHaveValue(stored.location);await next();await step(2,width);await expect(page.getByPlaceholder('e.g. Cree, Michif, English, French')).toHaveValue(stored.languages);await next();await step(3,width);await expect(page.getByPlaceholder('e.g. Software Developer | Treaty 6')).toHaveValue(stored.headline);await expect(page.getByPlaceholder('A few words about yourself...')).toHaveValue(stored.bio);await expect(page.getByPlaceholder('e.g. Project Management, Web Development')).toHaveValue('Writing, Testing');});
  await check(width+'-target-roles-prefill-edit',async()=>{await expect(page.getByLabel('Target Roles',{exact:true})).toHaveValue('Coordinator, Developer');await page.getByLabel('Target Roles',{exact:true}).fill('Coordinator, Researcher');});
  await next();await step(4,width);
  await check(width+'-interest-accessible-prefill-toggle',async()=>{const choice=page.getByRole('button',{name:/Jobs/});await expect(choice).toHaveAttribute('aria-pressed','true');await choice.click();await expect(choice).toHaveAttribute('aria-pressed','false');await choice.click();await expect(choice).toHaveAttribute('aria-pressed','true');});
  await next();await step(5,width);
  await check(width+'-edited-profile-persistence',async()=>{const response=page.waitForResponse(r=>r.url().endsWith('/api/profile/setup')&&r.request().method()==='POST');await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();assert.equal((await response).status(),200);await page.waitForURL('**/feed');const saved=(await db.doc('members/'+u.uid).get()).data();for(const field of ['displayName','community','location','bio','languages','headline','skills','interests'])assert.deepEqual(saved[field],stored[field],field);assert.deepEqual(saved.targetRoles,['Coordinator','Researcher']);await navigate(server.base+'/setup');await next();await next();await expect(page.getByLabel('Target Roles',{exact:true})).toHaveValue('Coordinator, Researcher');});
  await check(width+'-setup-menu-actual-navigation',async()=>{
   for(const [name,destination] of [['My Profile','/profile'],['Account Settings','/settings/account'],['Sign Out','/logout']]){
    await navigate(server.base+'/setup');const trigger=page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true});await trigger.focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'My Profile',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await trigger.click();await page.getByRole('menuitem',{name,exact:true}).click();await page.waitForURL(server.base+destination);await shot(width+'-menu-'+name.replaceAll(' ','-'));
   }await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(server.base+'/');
  });
  await check(width+'-legacy-headline-backspace',async()=>{
   await db.doc('members/'+u.uid).update({headline:'h'.repeat(100)});await login(u);await page.waitForURL('**/feed');await navigate(server.base+'/setup');await next();await next();const headline=page.getByPlaceholder('e.g. Software Developer | Treaty 6');await expect(headline).toHaveValue('h'.repeat(100));await headline.focus();await headline.press('End');await headline.press('Backspace');await expect(headline).toHaveValue('h'.repeat(99));await logout();
  });
  await check(width+'-organization-intent-routing',async()=>{const org=await account(width,{signupIntent:'organization'});await login(org);await page.waitForURL(u=>u.pathname==='/signup'&&u.searchParams.get('resume')==='organization');await navigate(server.base+'/setup');await page.waitForURL(u=>u.pathname==='/signup'&&u.searchParams.get('resume')==='organization');await expect(page.getByRole('heading',{name:/Hey Fictional/})).toHaveCount(0);await logout();});
  const employer=await account(width,{role:'employer'}),orgRef=db.doc('organizations/'+employer.uid);
  await db.doc('users/'+employer.uid).update({orgId:employer.uid,employerId:employer.uid,orgRole:'owner'});
  const organization={id:employer.uid,name:'Fictional Onboarding Organization',type:'business',ownerId:employer.uid,email:employer.email,contactEmail:employer.email,description:'',onboardingComplete:false,status:'approved',communityAffiliation:'Saved affiliation',website:'https://fictional.example.invalid',services:['Training']};
  await orgRef.set(organization);await db.doc('employers/'+employer.uid).set(organization);
  await check(width+'-organization-no-logo-four-steps',async()=>{
   await login(employer);await page.waitForURL(u=>u.pathname==='/org/onboarding');await expect(page.getByText('Organization Logo (optional for workspace)',{exact:true})).toBeVisible();await page.getByLabel('Description',{exact:true}).fill('Fictional organization description');
   await page.getByLabel('Community Affiliation',{exact:true}).fill('');
   for(let n=1;n<=4;n++){
    await expect(page.getByText(new RegExp('^Step '+n+' of 4'))).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await shot(width+'-org-step-'+n);
    if(n===2)await page.getByLabel('Website',{exact:true}).fill('');
    if(n===3)await page.getByRole('button',{name:/^(?:✓ )?Training$/}).click();
    if(n<4)await page.getByRole('button',{name:'Next',exact:true}).click();
   }
   const completed=page.waitForResponse(r=>r.url().endsWith('/api/employer/onboarding/complete')&&r.request().method()==='POST');await page.getByRole('button',{name:/Finish|Complete/}).click();assert.equal((await completed).status(),200);await page.waitForURL(u=>u.pathname==='/org/plans');
   for(const collection of ['organizations','employers','users','members'])assert.equal((await db.doc(collection+'/'+employer.uid).get()).data().onboardingComplete,true);
   const saved=(await orgRef.get()).data();assert.ok(!saved.logoUrl&&!saved.logo);assert.equal(saved.description,'Fictional organization description');
   await expect(page.getByRole('heading',{name:'Promotion Plans',exact:true})).toBeVisible();await page.getByRole('link',{name:/Back to Dashboard/}).click();await page.waitForURL(u=>u.pathname==='/org/dashboard');await expect(page.getByRole('button',{name:'Post a Job',exact:true}).first()).toBeVisible();await expect(page.getByText('Upload a logo.',{exact:true})).toBeVisible();await shot(width+'-org-no-logo-completed');
  });
  await check(width+'-organization-cleared-optionals-persist',async()=>{const saved=(await orgRef.get()).data();assert.equal(saved.communityAffiliation,'');assert.equal(saved.website,'');assert.deepEqual(saved.services,[]);});
  await logout();
  await c.close();
 }
 await check('no-page-errors',async()=>assert.deepEqual(pageErrors,[]));
 await check('no-unexpected-http-errors',async()=>assert.deepEqual(httpErrors,[]));
 await check('no-unexpected-console-errors',async()=>assert.deepEqual(consoleRows,[]));
} catch(e){rows.push({name:'infrastructure',status:'fail',error:scrub(e.stack)});}
finally {
 if(browser)await browser.close();
 if(denyProxy){denyProxy.closeAllConnections();await new Promise(resolve=>denyProxy.close(resolve));}
 for(const uid of users){for(const subcollection of ['activity','listingReviews']){const collection=db.doc('organizations/'+uid).collection(subcollection);const own=await collection.get();for(const doc of own.docs){await doc.ref.delete();const absent=!(await doc.ref.get()).exists;assert.equal(absent,true);cleanup.push({path:doc.ref.path,absent});}assert.equal((await collection.get()).empty,true);}for(const collection of ['users','members','organizations','employers']){const ref=db.doc(collection+'/'+uid);await ref.delete();const absent=!(await ref.get()).exists;assert.equal(absent,true);cleanup.push({path:ref.path,absent});}await auth.deleteUser(uid);let absent=false;try{await auth.getUser(uid);}catch(e){absent=e.code==='auth/user-not-found';}assert.equal(absent,true);cleanup.push({uid,absent});}
 for(const p of cleanupPaths){const ref=db.doc(p);await ref.delete();const absent=!(await ref.get()).exists;assert.equal(absent,true);cleanup.push({path:p,absent});}
 if(server){await fs.writeFile(path.join(output,'server.log'),scrub(server.getLogs()));await server.stop();await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(Number(new URL(server.base).port),'127.0.0.1',()=>s.close(resolve));});}
 await db.terminate();await deleteApp(app);await save('cleanup',{fixtures:cleanup,browserStopped:!browser?.isConnected(),serverStopped:true,denyProxyStopped:!denyProxy?.listening});await save('network',{blocked,pageErrors,consoleRows,warnings,httpErrors,requestFailures,timeline});await save('results',{prefix,rows,limitations:['Fictional YouTube empty feed only; real provider not certified. Demo Auth and Firestore persistence, real built Next and Chrome. No live mail or hosted AppCheck. Organization creation is Goal3; Goal2 uses exact seeded fixtures.']});
}
console.log(JSON.stringify({output,pass:rows.filter(r=>r.status==='pass').length,fail:rows.filter(r=>r.status==='fail').length}));process.exitCode=rows.some(r=>r.status==='fail')?1:0;

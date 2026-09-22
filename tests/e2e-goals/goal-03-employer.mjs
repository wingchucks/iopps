// Goal3: built Next + installed Chrome + demo emulators; no live providers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {createHash} from 'node:crypto';
import {restoreSignupSecurityLimits} from '../../scripts/qa-signup-security-fixture.mjs';

import {startIsolatedQaServer} from '../../scripts/local-qa-server.mjs';
import {goal01BrowserOptions} from '../../scripts/qa-goal01-browser-options.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [k,v] of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}))assert.equal(process.env[k],v);
const output=path.resolve(process.env.MISSION_OUTPUT || 'reports/autonomous-mission/goal03-'+Date.now());await fs.mkdir(output,{recursive:true});
const prefix='mission-employer-'+crypto.randomUUID(),app=initializeApp({projectId:'demo-iopps-preview'},prefix),auth=getAuth(app),db=getFirestore(app);
const docs=new Map();const remember=ref=>{docs.set(ref.path,ref);return ref;};
const securityBaseline=new Map((await db.collection('signup_security_limits').get()).docs.map(d=>[d.id,d.data()]));
const securitySeeds=[];const providerBlocks=[];
const pendingApi=new Set();
const rows=[],users=[],cleanup=[],blocked=[],consoleRows=[],pageErrors=[],httpErrors=[],requestFailures=[],timeline=[],warnings=[];let activeCheck='startup',pageSequence=0;
const password='Fictional-only-2026!';let browser,server,page,denyProxy;
const scrub=s=>String(s).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"'<]+/gi,'$1[REDACTED]');
const save=async(name,data)=>fs.writeFile(path.join(output,name+'.json'),JSON.stringify(data,null,2));
async function check(name,fn){activeCheck=name;try{await fn();rows.push({name,status:'pass'});}catch(e){rows.push({name,status:'fail',error:scrub(e.message)});if(page&&!page.isClosed()){await page.screenshot({path:path.join(output,name+'-failure.png'),fullPage:true});await fs.writeFile(path.join(output,name+'-dom.txt'),scrub(await page.locator('body').ariaSnapshot()));}}await save('results',{rows});return rows.at(-1).status==='pass';}
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
 await c.addInitScript(()=>{window.__goal03AccountChecks=0;const original=window.fetch;window.fetch=async function(...args){const response=await original.apply(this,args);if(new URL(response.url,location.href).pathname==='/api/employer/check'&&response.ok)window.__goal03AccountChecks++;return response;};});
 // Loopback goes directly to the owned services; the browser proxy denies every external destination.
 await c.routeWebSocket('**/*',s=>s.close());
 c.on('page',p=>{
  const pageId=++pageSequence;p.__missionPageId=pageId;
  const meta=()=>({pageId,time:Date.now(),check:activeCheck,page:p.url().startsWith('http')?new URL(p.url()).pathname:p.url()});
  const req=r=>({path:new URL(r.url()).pathname,method:r.method(),resourceType:r.resourceType(),navigation:r.isNavigationRequest(),rsc:r.headers()['rsc']||null,prefetch:r.headers()['next-router-prefetch']||r.headers()['purpose']||null,segment:r.headers()['next-router-segment-prefetch']||null,redirectedFrom:r.redirectedFrom()?scrub(r.redirectedFrom().url()):null});
  p.on('close',()=>{const pending=[...pendingApi].filter(r=>r.frame().page()===p);timeline.push({...meta(),event:'page-closed',pending:pending.map(r=>({path:new URL(r.url()).pathname,method:r.method()}))});for(const r of pending)pendingApi.delete(r);});
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

async function ready(){
 const pathname=new URL(page.url()).pathname;
 if(pathname==='/feed')await expect(page.getByRole('heading',{name:'Jobs near your next step',exact:true})).toBeVisible();
 if(pathname.startsWith('/org/dashboard'))await expect.poll(()=>page.evaluate(()=>window.__goal03AccountChecks),{timeout:10000}).toBeGreaterThanOrEqual(3);
 if(['/feed','/messages'].includes(pathname))await expect.poll(()=>page.evaluate(()=>window.__goal03AccountChecks),{timeout:10000}).toBeGreaterThanOrEqual(2);
 try {await expect.poll(()=>pendingApi.size,{timeout:10000}).toBe(0);}catch(error){timeline.push({event:'pending-api-timeout',check:activeCheck,pending:[...pendingApi].map(r=>({path:new URL(r.url()).pathname,method:r.method()}))});throw error;}
}
async function navigate(url){if(page.url().startsWith('http'))await ready();await page.goto(url);}
async function tokenFor(uid){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await auth.createCustomToken(uid),returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken;}
async function request(method,route,token,body){const r=await fetch(server.base+route,{method,redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function orgBasics(name){
 await page.getByLabel('Organization Name',{exact:false}).fill(name);
 await page.getByLabel('Short Business Description',{exact:false}).fill('Fictional services organization for local employer acceptance only.');
 await page.getByLabel('Products or Services (comma-separated)',{exact:false}).fill('Training, Community services');
 await page.getByLabel('Province / Territory',{exact:false}).selectOption('Saskatchewan');await page.getByLabel('City',{exact:true}).fill('Saskatoon');
 await page.getByRole('checkbox',{name:'Post Jobs',exact:true}).click();await page.getByRole('button',{name:/Non-Indigenous company or employer/}).click();
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByRole('button',{name:'Skip for now',exact:true}).click();
}
async function resume(u){await login(u);await page.waitForURL(u=>u.pathname==='/signup');await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByRole('button',{name:'Continue organization setup as '+u.email,exact:true}).click();await page.getByRole('heading',{name:'About your Organization',exact:true}).waitFor();}
async function upgradeForm(name){await navigate(server.base+'/org/upgrade');await page.getByPlaceholder('e.g. MLT Aikins LLP').fill(name);await page.getByRole('button',{name:/Employer \/ Business/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByPlaceholder('Tell the community about your organization...').fill('Fictional community organization upgrade acceptance');}
async function dashboard(){await page.waitForURL(u=>u.pathname==='/org/dashboard');await expect(page.getByRole('button',{name:'Post a Job',exact:true}).first()).toBeVisible();await ready();}
try {
 server=await startIsolatedQaServer();server.base=server.base.replace('127.0.0.1','localhost');denyProxy=http.createServer((req,res)=>{const u=new URL(req.url);if(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)){const requestId=crypto.randomUUID();const meta=()=>({time:Date.now(),check:activeCheck,requestId,path:u.pathname,method:req.method,reusedSocket:upstream.reusedSocket,clientAborted:req.aborted,responseDestroyed:res.destroyed,responseFinished:res.writableFinished,headersSent:res.headersSent});const upstream=http.request(u,{agent:false,method:req.method,headers:{...req.headers,host:u.host}},reply=>{timeline.push({...meta(),event:'proxy-upstream-response',status:reply.statusCode,cors:reply.headers['access-control-allow-origin']||null});res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',error=>{timeline.push({...meta(),event:'proxy-upstream-error',code:error.code});if(!res.destroyed){timeline.push({...meta(),event:'proxy-generated-502'});res.writeHead(502);res.end();}});req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);return;}blocked.push({host:u.host,path:u.pathname,policy:'proxy-denied'});res.writeHead(403,{'Connection':'close'});res.end();});denyProxy.on('connect',(req,socket)=>{blocked.push({host:req.url,path:'CONNECT',policy:'proxy-denied'});socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});await new Promise(resolve=>denyProxy.listen(0,'127.0.0.1',resolve));browser=await chromium.launch(goal01BrowserOptions({proxyPort:denyProxy.address().port,allowedPorts:[new URL(server.base).port,8080,9099,9199]}));


 for(const width of [1440,390]){
  const c=await context(width);page=await c.newPage();page.setDefaultTimeout(12000);
  const owner=await account(width,{signupIntent:'organization'});
  const created=await check(width+'-signup-resume-creates-organization',async()=>{
   await resume(owner);await orgBasics('Fictional Employer '+width+' '+prefix);
   const response=page.waitForResponse(r=>r.url().endsWith('/api/employer/signup')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Create organization profile',exact:true}).click();assert.equal((await response).status(),200);await dashboard();
   for(const collection of ['organizations','employers']){const saved=(await db.doc(collection+'/'+owner.uid).get()).data();assert.equal(saved.name,'Fictional Employer '+width+' '+prefix);assert.ok(!saved.logoUrl);assert.equal(saved.onboardingComplete,true);}
   assert.equal((await db.doc('users/'+owner.uid).get()).data().role,'employer');assert.equal((await db.doc('employers/'+owner.uid).get()).data().plan,'free');
   await shot(width+'-created-dashboard');
  });
  let jobDoc,candidate,applicationRef;
  if(created){
   await check(width+'-dashboard-alias',async()=>{await navigate(server.base+'/dashboard');await dashboard();});
   const jobCreated=await check(width+'-draft-publish-edit-job',async()=>{
    await navigate(server.base+'/org/dashboard/jobs/new');await page.getByPlaceholder('e.g. Senior Software Developer').fill('Fictional QA Coordinator '+width);await page.locator('select').filter({has:page.getByRole('option',{name:'Administration',exact:true})}).selectOption('Administration');await page.getByLabel('Province / territory',{exact:false}).selectOption('SK');
    await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByPlaceholder('Describe the role, team, and what a typical day looks like...').fill('Fictional local-only job. No real applications accepted.');await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByRole('button',{name:/Save.*Draft/i}).click();
    await expect.poll(async()=>(await db.collection('jobs').where('employerId','==',owner.uid).get()).size).toBe(1);
    jobDoc=(await db.collection('jobs').where('employerId','==',owner.uid).get()).docs[0];remember(jobDoc.ref);remember(db.doc('posts/'+jobDoc.id));assert.equal(jobDoc.data().status,'draft');
    await navigate(server.base+'/org/dashboard/jobs/'+jobDoc.id+'/edit');await page.getByRole('radio',{name:'active',exact:true}).check();await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().status).toBe('active');
    await navigate(server.base+'/org/dashboard/jobs/'+jobDoc.id+'/edit');await page.locator('input[type="text"]').first().fill('Fictional Edited Coordinator '+width);await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().title).toBe('Fictional Edited Coordinator '+width);await shot(width+'-edited-job');
   });
   const ownerToken=await tokenFor(owner.uid);
   if(jobCreated){
    await check(width+'-receive-view-review-application',async()=>{
     candidate=await account(width,{setupComplete:true});const candidateToken=await tokenFor(candidate.uid);
     await db.doc('members/'+candidate.uid).set({displayName:'Fictional Candidate '+width,role:'community',email:candidate.email});
     assert.equal((await request('PUT','/api/employer/jobs/'+jobDoc.id,ownerToken,{requiresResume:false,requiresCoverLetter:false,requiresReferences:false})).status,200);
     const applied=await request('POST','/api/applications',candidateToken,{postId:jobDoc.id,coverLetter:'Fictional local-only applicant',profileSnapshot:{displayName:'Fictional Candidate '+width,email:candidate.email,headline:'Fictional submitted headline'}});assert.equal(applied.status,201,JSON.stringify(applied.data));applicationRef=remember(db.doc('applications/'+candidate.uid+'_'+jobDoc.id));assert.equal((await applicationRef.get()).data().profileSnapshot.email,candidate.email);await save(width+'-application-receipt',applied.data);
     await navigate(server.base+'/org/dashboard/applications');await page.getByText('View application details',{exact:true}).click();await expect(page.getByText('Fictional local-only applicant',{exact:true})).toBeVisible();await expect(page.getByText('Profile as submitted with this application.',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:candidate.email,exact:true})).toBeVisible();await expect(page.getByText('Fictional submitted headline',{exact:true})).toBeVisible();assert.equal((await applicationRef.get()).data().profileSnapshot.headline,'Fictional submitted headline');await page.getByLabel('Application status for Fictional Candidate '+width,{exact:true}).selectOption('reviewing');await expect.poll(async()=>(await applicationRef.get()).data().status).toBe('reviewing');await shot(width+'-application-reviewed');
     assert.equal((await request('GET','/api/employer/jobs/'+jobDoc.id,candidateToken)).status,403);assert.equal((await request('PUT','/api/employer/applications',candidateToken,{appId:applicationRef.id,status:'rejected'})).status,403);
    });
    await check(width+'-analytics-populated',async()=>{await navigate(server.base+'/org/dashboard?tab=Analytics');await expect(page.getByRole('heading',{name:'Hiring activity',exact:true})).toBeVisible();await expect(page.getByText('Fictional Edited Coordinator '+width,{exact:true})).toBeVisible();await expect(page.getByText('Recorded applications',{exact:true})).toBeVisible();const stats=await request('GET','/api/employer/stats',ownerToken);assert.equal(stats.status,200);assert.equal(stats.data.totalPosts,1);assert.equal(stats.data.activePosts,1);assert.equal(stats.data.applications,1);await save(width+'-stats',stats.data);await shot(width+'-analytics');});
   }
   await check(width+'-team-role-removal',async()=>{
    const teammate=await account(width);await db.doc('users/'+teammate.uid).set({role:'employer',orgId:owner.uid,employerId:owner.uid,orgRole:'member'});await db.doc('members/'+teammate.uid).set({displayName:'Fictional Teammate '+width,email:teammate.email,role:'employer',orgId:owner.uid,orgRole:'member'});
    await navigate(server.base+'/org/dashboard/team');await page.getByLabel('Role for Fictional Teammate '+width,{exact:true}).selectOption('admin');await expect.poll(async()=>(await db.doc('users/'+teammate.uid).get()).data().orgRole).toBe('admin');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove Fictional Teammate '+width,exact:true}).click();await expect(page.getByRole('button',{name:'Remove Fictional Teammate '+width,exact:true})).toHaveCount(0);assert.notEqual((await db.doc('users/'+teammate.uid).get()).data().orgId,owner.uid);await shot(width+'-team');
   });
   await check(width+'-existing-private-messaging-send-receive',async()=>{
    if(!candidate)candidate=await account(width,{setupComplete:true});
    const conv=remember(db.doc('conversations/'+prefix+'-'+width));await conv.set({participants:[owner.uid,candidate.uid],lastMessage:'Fictional incoming greeting',lastMessageAt:Timestamp.now(),lastSenderId:candidate.uid,unreadBy:owner.uid});
    await remember(db.doc('messages/'+prefix+'-'+width+'-incoming')).set({conversationId:conv.id,senderId:candidate.uid,text:'Fictional incoming greeting',createdAt:Timestamp.now()});
    await navigate(server.base+'/messages?to='+candidate.uid);await expect(page.getByPlaceholder('Type a message...')).toBeVisible();await expect(page.getByText('Fictional incoming greeting',{exact:true}).filter({visible:true}).last()).toBeVisible();await page.getByPlaceholder('Type a message...').fill('Fictional employer reply '+width);
    const response=page.waitForResponse(r=>r.url().endsWith('/api/messages/notify'));await page.getByRole('button',{name:'Send',exact:true}).click();assert.equal((await response).status(),200);await expect(page.getByPlaceholder('Type a message...')).toHaveValue('');
    const messages=await db.collection('messages').where('conversationId','==',conv.id).get();for(const d of messages.docs){remember(d.ref);remember(db.doc('mail/message-'+d.id));}const sent=messages.docs.find(d=>d.data().text==='Fictional employer reply '+width);assert.ok(sent);assert.equal(sent.data().senderId,owner.uid);assert.equal((await conv.get()).data().unreadBy,candidate.uid);await shot(width+'-messages');
    const recipient=await context(width),original=page;page=await recipient.newPage();await login(candidate);await navigate(server.base+'/messages?to='+owner.uid);await expect(page.getByText('Fictional employer reply '+width,{exact:true}).filter({visible:true}).last()).toBeVisible();await expect.poll(async()=>(await conv.get()).data().unreadBy).toBe('');await ready();await recipient.close();page=original;
   });
   await check(width+'-billing-free-plan',async()=>{await navigate(server.base+'/org/dashboard/billing');await expect(page.getByRole('heading',{name:'Billing & Plan',exact:true})).toBeVisible();await expect(page.getByText('CURRENT PLAN',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Free',exact:true})).toBeVisible();await shot(width+'-billing');});
   await check(width+'-payment-config-blocker-proven',async()=>{
    const before=(await db.doc('employers/'+owner.uid).get()).data();await page.getByRole('link',{name:'Select',exact:true}).first().click();await expect(page.getByRole('heading',{name:'Checkout',exact:true})).toBeVisible();
    const r=page.waitForResponse(r=>r.url().endsWith('/api/stripe/checkout'));await page.getByRole('button',{name:'Proceed to Payment',exact:true}).click();const response=await r;assert.equal(response.status(),503);assert.deepEqual(await response.json(),{error:'Payment not configured. Stripe keys are missing.'});await expect(page.getByText('Payment not configured. Stripe keys are missing.',{exact:true})).toBeVisible();assert.deepEqual((await db.doc('employers/'+owner.uid).get()).data(),before);providerBlocks.push({width,path:'/api/stripe/checkout',status:503,setting:'STRIPE_SECRET_KEY',scope:'credential-free isolated app only',payment:'BLOCKED; no provider request'});await shot(width+'-payment-blocker');
   });
   if(jobDoc)await check(width+'-delete-job-tombstone',async()=>{await navigate(server.base+'/org/dashboard/jobs/'+jobDoc.id+'/edit');await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Yes, Delete',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().status).toBe('deleted');});
  }
  await c.close();
  const upgradeContext=await context(width);page=await upgradeContext.newPage();page.setDefaultTimeout(12000);const upgraded=await account(width,{setupComplete:true});
  await check(width+'-upgrade-create-onboard-dashboard',async()=>{
   await login(upgraded);await upgradeForm('Fictional Upgrade '+width+' '+prefix);const response=page.waitForResponse(r=>r.url().endsWith('/api/employer/upgrade'));await page.getByRole('button',{name:'Create Organization Page →',exact:true}).click();assert.equal((await response).status(),200);await page.waitForURL(u=>u.pathname==='/org/onboarding');
   assert.equal((await db.doc('organizations/'+upgraded.uid).get()).data().name,'Fictional Upgrade '+width+' '+prefix);assert.equal((await db.doc('users/'+upgraded.uid).get()).data().role,'employer');
   await expect(page.getByText('Organization Logo (optional for workspace)',{exact:true})).toBeVisible();for(let step=0;step<3;step++)await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:/Finish|Complete/}).click();await page.waitForURL(u=>u.pathname==='/org/plans');await expect(page.getByRole('heading',{name:'Promotion Plans',exact:true})).toBeVisible();await page.getByRole('link',{name:/Back to Dashboard/}).click();await dashboard();assert.equal((await db.doc('organizations/'+upgraded.uid).get()).data().onboardingComplete,true);await shot(width+'-upgraded');
  });await upgradeContext.close();
  for(const entry of ['resume','upgrade']){
   const blockedContext=await context(width);page=await blockedContext.newPage();page.setDefaultTimeout(12000);let blockedUser=await account(width,{...(entry==='resume'?{signupIntent:'organization'}:{}),setupComplete:true});await auth.updateUser(blockedUser.uid,{email:prefix+'-'+width+'-'+entry+'@mailinator.com',emailVerified:true});blockedUser=await auth.getUser(blockedUser.uid);
   await check(width+'-'+entry+'-blocked-contact-no-request',async()=>{
    if(entry==='resume'){await resume(blockedUser);await orgBasics('Fictional Contact Check '+width);}
    else {await login(blockedUser);await upgradeForm('Fictional Contact Check '+width);}
    const before=timeline.filter(r=>r.event==='request'&&r.method==='POST'&&/^\/api\/employer\/(signup|upgrade)$/.test(r.path)).length;
    await page.getByRole('button',{name:entry==='resume'?'Create organization profile':'Create Organization Page →',exact:true}).click();await expect(page.getByText(/Temporary or disposable email addresses cannot be used/)).toBeVisible();
    const after=timeline.filter(r=>r.event==='request'&&r.method==='POST'&&/^\/api\/employer\/(signup|upgrade)$/.test(r.path)).length;assert.equal(after,before);assert.equal((await db.collection('signup_security_events').where('uid','==',blockedUser.uid).get()).size,0);assert.equal((await db.doc('organizations/'+blockedUser.uid).get()).exists,false);await shot(width+'-'+entry+'-contact');
   });await blockedContext.close();
  }
 }
 // Exact owned UID counter demonstrates real server 429 without looping attempts,
 // spoofing IP or changing shared limiter settings. Restored after server stops.
 for(const width of [1440,390]){
  const c=await context(width);page=await c.newPage();const u=await account(width,{setupComplete:true});
  await check(width+'-real-rate-limit-actionable-preserved-draft',async()=>{
   const id='uid_'+createHash('sha256').update(u.uid).digest('hex').slice(0,24),ref=db.doc('signup_security_limits/'+id);assert.equal((await ref.get()).exists,false);const value={scope:'uid',count:5,windowStartedAt:Timestamp.now()};await ref.set(value);securityBaseline.set(id,(await ref.get()).data());securitySeeds.push(ref);
   await login(u);await upgradeForm('Fictional Rate Fixture '+width);const r=page.waitForResponse(r=>r.url().endsWith('/api/employer/upgrade'));await page.getByRole('button',{name:'Create Organization Page →',exact:true}).click();const response=await r;assert.equal(response.status(),429);assert.equal((await response.json()).code,'ORGANIZATION_RATE_LIMITED');await expect(page.getByText(/Wait 30 minutes before retrying/)).toBeVisible();await expect(page.getByText(/24 hours/)).toBeVisible();assert.equal((await ref.get()).data().count,6);assert.equal((await db.doc('organizations/'+u.uid).get()).exists,false);assert.equal((await db.doc('users/'+u.uid).get()).data().role,'community');await page.getByRole('button',{name:'← Back',exact:true}).click();await expect(page.getByPlaceholder('e.g. MLT Aikins LLP')).toHaveValue('Fictional Rate Fixture '+width);await shot(width+'-rate-limit');
  });await c.close();
 }
 await check('no-page-errors',async()=>assert.deepEqual(pageErrors,[]));
 const expectedHttp=r=>(r.check.endsWith('-payment-config-blocker-proven')&&r.path==='/api/stripe/checkout'&&r.status===503)||(r.check.endsWith('-real-rate-limit-actionable-preserved-draft')&&r.path==='/api/employer/upgrade'&&r.status===429);
 await check('no-unexpected-http-errors',async()=>assert.deepEqual(httpErrors.filter(r=>!expectedHttp(r)),[]));
 await check('no-unexpected-console-errors',async()=>assert.deepEqual(consoleRows.filter(r=>!((r.check.endsWith('-payment-config-blocker-proven')&&r.location.url.endsWith('/api/stripe/checkout')&&r.message==='Failed to load resource: the server responded with a status of 503 (Service Unavailable)')||(r.check.endsWith('-real-rate-limit-actionable-preserved-draft')&&r.location.url.endsWith('/api/employer/upgrade')&&r.message==='Failed to load resource: the server responded with a status of 429 (Too Many Requests)'))),[]));
} catch(e){rows.push({name:'infrastructure',status:'fail',error:scrub(e.stack)});}
finally {
 if(browser)await browser.close();
 if(denyProxy){denyProxy.closeAllConnections();await new Promise(resolve=>denyProxy.close(resolve));}
 if(server){await fs.writeFile(path.join(output,'server.log'),scrub(server.getLogs()));await server.stop();await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(Number(new URL(server.base).port),'127.0.0.1',()=>s.close(resolve));});}
 const events=[];
 for(const uid of users){
  for(const [collection,field] of [['signup_security_events','uid'],['adminNotifications','orgId'],['adminNotifications','userId'],['jobs','employerId']]){const found=await db.collection(collection).where(field,'==',uid).get();for(const d of found.docs){remember(d.ref);if(collection==='signup_security_events')events.push({id:d.id,...d.data()});if(collection==='jobs')remember(db.doc('posts/'+d.id));}}
  for(const sub of ['activity','views','listingReviews']){const found=await db.doc('organizations/'+uid).collection(sub).get();for(const d of found.docs)remember(d.ref);}
 }
 await save('security-events',events);await save('security-limits',(await db.collection('signup_security_limits').get()).docs.map(d=>({id:d.id,...d.data()})));
 await save('security-cleanup',await restoreSignupSecurityLimits(db,securityBaseline,events));
 for(const ref of securitySeeds)remember(ref);
 for(const ref of docs.values()){if(ref.parent.id==='conversations'){const found=await db.collection('messages').where('conversationId','==',ref.id).get();for(const d of found.docs){remember(d.ref);remember(db.doc('mail/message-'+d.id));}}}
 for(const uid of users){for(const collection of ['users','members','organizations','employers'])remember(db.doc(collection+'/'+uid));}
 for(const ref of docs.values()){await ref.delete();const absent=!(await ref.get()).exists;cleanup.push({path:ref.path,absent});assert.equal(absent,true);}
 for(const uid of users){await auth.deleteUser(uid);let absent=false;try{await auth.getUser(uid);}catch(e){absent=e.code==='auth/user-not-found';}assert.equal(absent,true);cleanup.push({uid,absent});}
 await db.terminate();await deleteApp(app);await save('cleanup',{fixtures:cleanup,browserStopped:!browser?.isConnected(),serverStopped:true,denyProxyStopped:!denyProxy?.listening});await save('network',{blocked,pageErrors,consoleRows,warnings,httpErrors,requestFailures,timeline});await save('results',{prefix,rows,providerBlocks,limitations:['Fictional YouTube empty peripheral feed only. Real built Next and Chrome plus demo persistence. Signup-resume begins with an emulator verified Auth identity; Goal1 covers signup/email. Applicant submission uses real application HTTP; receipt/review UI exercised. Existing private conversation seeded; no new peer discovery. Message mail queue is emulator-only, no delivery worker. Stripe configuration absent by design; no provider payment or production configuration certification.']});
}
console.log(JSON.stringify({output,pass:rows.filter(r=>r.status==='pass').length,fail:rows.filter(r=>r.status==='fail').length,providerBlocks}));process.exitCode=rows.some(r=>r.status==='fail')?1:0;

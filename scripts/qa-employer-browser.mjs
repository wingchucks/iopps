// Built canonical Next routes + real demo Firebase. No production traffic or payments.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {startIsolatedQaServer} from './local-qa-server.mjs';
import {signOutFromFeed} from './qa-browser-auth.mjs';
import {restoreSignupSecurityLimits} from './qa-signup-security-fixture.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
const output=path.join(process.env.QA_EMPLOYER_EVIDENCE || (process.platform === 'win32' ? 'C:/Users/natha/Documents/Codex/2026-09-20/employer-qa' : 'test-results/employer-browser'),'browser-'+Date.now());
await fs.mkdir(output,{recursive:true});
console.log('Employer browser evidence:',output);
const app=initializeApp({projectId:'demo-iopps-preview'},'employer-browser');
const auth=getAuth(app),db=getFirestore(app),prefix='qa-employer-'+crypto.randomUUID();
const email=prefix+'@example.invalid',password='Fictional-only-2026!';
const users=[],docs=new Map(),checks=[],errors=[],securityNetwork=[];let server,browser,page,context;
const remember=ref=>{docs.set(ref.path,ref);return ref;};
async function record(name,detail={}){checks.push({name,status:'pass',...detail});await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify({prefix,checks,errors},null,2));}
async function shot(name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
async function signupState(label){
 const state=await page.evaluate(async()=>{
  const request=indexedDB.open('firebaseLocalStorageDb');
  const uid=await new Promise(resolve=>{request.onerror=()=>resolve(null);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('firebaseLocalStorage')){db.close();resolve(null);return;}const read=db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll();read.onsuccess=()=>{resolve(read.result.find(row=>row.value?.uid)?.value.uid||null);db.close();};read.onerror=()=>{db.close();resolve(null);};};});
  return {path:location.pathname,query:location.search,uid,headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent),fieldsetDisabled:document.querySelector('fieldset')?.disabled,buttons:[...document.querySelectorAll('button')].map(e=>({text:e.textContent,disabled:e.disabled,pressed:e.getAttribute('aria-pressed')})),drafts:Object.keys(localStorage).filter(k=>k.startsWith('iopps-employer-draft-v1:')).map(key=>({key,step:JSON.parse(localStorage.getItem(key))?.draft?.step}))};
 });
 await fs.writeFile(path.join(output,label+'.json'),JSON.stringify(state,null,2));
}
async function identity(email){const user=await auth.getUserByEmail(email);users.push(user.uid);for(const collection of ['users','members','organizations','employers'])remember(db.doc(collection+'/'+user.uid));return user;}
async function contextFor(){const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});c.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('filechooser',()=>{});p.on('response',r=>{const u=new URL(r.url());if(u.pathname==='/api/employer/signup'||u.pathname==='/api/employer/upgrade')securityNetwork.push({path:u.pathname,method:r.request().method(),status:r.status()});});});await c.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)?r.continue():r.abort();});return c;}
async function verify(email,c){const codes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();const code=codes.oobCodes.find(c=>c.email===email&&c.requestType==='VERIFY_EMAIL');assert.ok(code);const p=await c.newPage(),url=new URL(server.base+'/auth/action');url.searchParams.set('mode','verifyEmail');url.searchParams.set('oobCode',code.oobCode);await p.goto(url.href);await p.getByRole('heading',{name:'Email verified',exact:true}).waitFor();await p.close();}
async function tokenFor(uid){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await auth.createCustomToken(uid),returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken;}
async function request(method,route,token,body){const r=await fetch(server.base+route,{method,redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function fictionalUser(suffix){const u=await auth.createUser({email:prefix+'-'+suffix+'@example.invalid',password,emailVerified:true});await identity(u.email);await remember(db.doc('users/'+u.uid)).set({role:'community',displayName:'Fictional '+suffix});return u;}
const securityBaseline=new Map((await db.collection('signup_security_limits').get()).docs.map(d=>[d.id,d.data()]));
try {
 server=await startIsolatedQaServer();
 const home=os.userInfo().homedir;
 browser=await chromium.launch({...(process.platform==='win32'?{channel:'chrome'}:{}),headless:true,env:{...process.env,...(process.platform==='win32'?{USERPROFILE:home,LOCALAPPDATA:path.join(home,'AppData/Local'),APPDATA:path.join(home,'AppData/Roaming'),TEMP:process.env.TMPDIR||os.tmpdir(),TMP:process.env.TMPDIR||os.tmpdir()}:{})}});
 context=await contextFor();page=await context.newPage();
 await page.goto(server.base+'/signup?resume=organization&type=Employer');
 await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Create your Account',exact:true})).toBeVisible();
 await page.getByLabel('Your Name (Contact Person)',{exact:false}).fill('Fictional Employer Owner');await page.getByLabel('Email Address',{exact:false}).fill(email);await page.locator('#password').fill(password);await page.locator('#confirmPassword').fill(password);await page.locator('#signup-consent').check();await page.getByRole('button',{name:'Create Account →',exact:true}).click();
 await page.getByRole('heading',{name:'Check your Inbox',exact:true}).waitFor();const owner=await identity(email);
 assert.equal((await db.doc('users/'+owner.uid).get()).data().signupIntent,'organization');
 const verificationTab=await context.newPage();await verificationTab.goto(server.base+'/verify-email?next=%2Ffeed');await expect(verificationTab.getByText('Click the link in your email to verify your account. This page will automatically update once verified.',{exact:true})).toBeVisible();await verificationTab.screenshot({path:path.join(output,'verification-complete-copy.png'),fullPage:true});
 await verify(email,context);await verificationTab.waitForURL(u=>u.pathname==='/feed');await verificationTab.close();await record('verification-complete-copy-and-real-auto-update');await page.getByRole('button',{name:"I've Verified My Email →",exact:true}).click();
 await page.getByRole('heading',{name:'About your Organization',exact:true}).waitFor();
 await page.getByLabel('Organization Name',{exact:false}).fill('Fictional Prairie Employer '+prefix);
 await page.getByLabel('Short Business Description',{exact:false}).fill('Fictional services organization used only for isolated employer acceptance.');
 await page.getByLabel('Products or Services (comma-separated)',{exact:false}).fill('Training, Community services');
 await page.getByRole('textbox',{name:'Website',exact:true}).fill('https://example.invalid');await page.getByLabel('Province / Territory',{exact:false}).selectOption('Saskatchewan');await page.getByLabel('City',{exact:true}).fill('Saskatoon');
 await page.getByRole('checkbox',{name:'Post Jobs',exact:true}).click();await page.getByRole('button',{name:/Non-Indigenous company or employer/}).click();
 await expect(page.getByText(/Free Starter profile/)).toContainText('$1,250 CAD/year; Premium is $2,500 CAD/year');
 await page.reload();await expect(page.getByLabel('Organization Name',{exact:false})).toHaveValue('Fictional Prairie Employer '+prefix);await expect(page.getByLabel('City',{exact:true})).toHaveValue('Saskatoon');await expect(page.getByRole('checkbox',{name:'Post Jobs',exact:true})).toHaveAttribute('aria-checked','true');
 await expect(page.getByLabel('Short Business Description',{exact:false})).toHaveValue('Fictional services organization used only for isolated employer acceptance.');await expect(page.getByLabel('Products or Services (comma-separated)',{exact:false})).toHaveValue('Training, Community services');await expect(page.getByRole('textbox',{name:'Website',exact:true})).toHaveValue('https://example.invalid');await expect(page.getByLabel('Province / Territory',{exact:false})).toHaveValue('Saskatchewan');await shot('step4-complete-fields');await record('step4-reload-preserves-fields-intent-and-progress');
 await page.goto(server.base+'/feed');await page.getByRole('link',{name:'Finish organization setup',exact:true}).click();await expect(page.getByLabel('Organization Name',{exact:false})).toHaveValue('Fictional Prairie Employer '+prefix);await record('abandonment-uid-bound-resume-cta');
 const switchUser=await fictionalUser('draft-isolation');const otherTab=await context.newPage();await otherTab.goto(server.base+'/feed');await signOutFromFeed(otherTab);await expect(page.getByLabel('Organization Name',{exact:false})).toHaveCount(0);
 async function loginTab(target,address){
  try{
   await target.goto(server.base+'/login');
   await target.getByPlaceholder('you@example.com').fill(address);
   await target.getByPlaceholder('Enter your password').fill(password);
   await target.getByRole('button',{name:'Sign In',exact:true}).click();
   await target.waitForURL(u=>u.pathname!='/login');
  }catch(error){
   // The main signup page is not the tab that failed. Retain this tab before cleanup.
   await target.screenshot({path:path.join(output,'login-failure.png'),fullPage:true});
   await fs.writeFile(path.join(output,'login-failure.json'),JSON.stringify({path:new URL(target.url()).pathname,text:await target.locator('body').innerText()},null,2));
   throw error;
  }
 }
 if(process.argv.includes('--adverse-auth-order')){
  await page.getByRole('button',{name:'Continue →',exact:true}).click();await signupState('anonymous-account-step-before-login');await loginTab(otherTab,switchUser.email);await signupState('second-account-after-login');
 }else{
  await loginTab(otherTab,switchUser.email);await signupState('second-account-before-continue');await page.getByRole('button',{name:'Continue →',exact:true}).click();
 }
 await page.getByRole('button',{name:'Continue organization setup as '+switchUser.email,exact:true}).click();await expect(page.getByLabel('Organization Name',{exact:false})).toHaveValue('');await page.getByLabel('Organization Name',{exact:false}).fill('Fictional second account private draft');
 const firstDraft=await page.evaluate(uid=>JSON.parse(localStorage.getItem('iopps-employer-draft-v1:'+uid)).draft,owner.uid);assert.equal(firstDraft.orgName,'Fictional Prairie Employer '+prefix);await record('live-cross-tab-account-switch-clears-fields-and-isolates-drafts');
 await otherTab.goto(server.base+'/feed');await signOutFromFeed(otherTab);await expect(page.getByLabel('Organization Name',{exact:false})).toHaveCount(0);await loginTab(otherTab,email);await signupState('original-account-return');await expect(page.getByLabel('Organization Name',{exact:false})).toHaveValue('Fictional Prairie Employer '+prefix);await otherTab.close();await record('original-account-resume-restores-only-own-draft');
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect(page.getByRole('heading',{name:'Brand your Profile',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'← Back',exact:true}).click();await expect(page.getByLabel('Organization Name',{exact:false})).toHaveValue('Fictional Prairie Employer '+prefix);await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByRole('heading',{name:'Brand your Profile',exact:true}).waitFor();await record('step5-back-to-step4-preserves-input');
 for(const label of ['Upload Logo','Upload Cover'])for(const key of ['Enter','Space']){
  const control=page.getByRole('button',{name:label,exact:true});await control.focus();
  await page.evaluate(()=>{window.__qaUploadEvents=[];for(const type of ['keydown','keyup','click'])document.addEventListener(type,e=>window.__qaUploadEvents.push({type,key:e.key,target:e.target.getAttribute('aria-label'),tag:e.target.tagName,trusted:e.isTrusted,active:document.activeElement?.getAttribute('aria-label'),activation:navigator.userActivation.isActive}),{capture:true,once:true});});
  try{const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.keyboard.press(key)]);await chooser.setFiles([]);await expect(control).toBeFocused();}
  finally{await fs.writeFile(path.join(output,'upload-keyboard-'+label.replaceAll(' ','-')+'-'+key+'.json'),JSON.stringify(await page.evaluate(()=>({events:window.__qaUploadEvents,focused:document.hasFocus(),active:document.activeElement?.getAttribute('aria-label')})),null,2));}
 }
 await shot('optional-branding-keyboard');await record('logo-cover-enter-space-accessible-names');
 await page.reload();await page.getByRole('heading',{name:'Brand your Profile',exact:true}).waitFor();await page.getByRole('button',{name:'Skip for now',exact:true}).click();
 let releaseSignup,signupHeld;const heldSignup=new Promise(r=>signupHeld=r),signupGate=new Promise(r=>releaseSignup=r);
 await page.route('**/api/employer/signup',async route=>{const response=await route.fetch();signupHeld();await signupGate;await route.fulfill({response});});
 await page.getByRole('button',{name:'Create organization profile',exact:true}).click();await heldSignup;
 const raceTab=await context.newPage();await raceTab.goto(server.base+'/feed');await signOutFromFeed(raceTab);await loginTab(raceTab,switchUser.email);
 await expect(page.getByLabel('Organization Name',{exact:false})).toHaveValue('Fictional second account private draft');
 await page.getByLabel('Organization Name',{exact:false}).fill('B draft while A pending');
 await expect.poll(()=>page.evaluate(uid=>JSON.parse(localStorage.getItem('iopps-employer-draft-v1:'+uid)).draft.orgName,switchUser.uid)).toBe('B draft while A pending');
 releaseSignup();await page.waitForResponse(r=>r.url().endsWith('/api/employer/signup'));await page.unroute('**/api/employer/signup');
 await page.getByLabel('Organization Name',{exact:false}).fill('B draft after A success');
 await expect.poll(()=>page.evaluate(uid=>JSON.parse(localStorage.getItem('iopps-employer-draft-v1:'+uid)).draft.orgName,switchUser.uid)).toBe('B draft after A success');assert.equal(new URL(page.url()).pathname,'/signup');
 await record('held-A-signup-cross-tab-B-edit-before-after-success-no-stale-navigation');
 await raceTab.goto(server.base+'/feed');
 // Regression: a slow session DELETE must finish before navigation can cancel
 // Firebase sign-out and leave the previous account persisted in this context.
 let delayedSignOutRequests=0;
 const delaySignOut=async route=>{
  if(route.request().method()!=='DELETE')return route.continue();
  delayedSignOutRequests++;
  await new Promise(resolve=>setTimeout(resolve,1500)); // injected network latency, not a readiness wait
  await route.continue();
 };
 await raceTab.route('**/api/auth/session',delaySignOut);
 await signOutFromFeed(raceTab);
 assert.ok(delayedSignOutRequests>0,'exercise the delayed session DELETE');
 // Auth-state synchronization can issue another DELETE after explicit sign-out.
 // Drain those delayed handlers before login/navigation or closing this tab.
 await raceTab.unrouteAll({behavior:'wait'});
 await expect(page.getByLabel('Organization Name',{exact:false})).toHaveCount(0);
 await loginTab(raceTab,email);await raceTab.close();await page.goto(server.base+'/org/dashboard');
 await record('delayed-signout-completes-before-next-account-login');
 await page.waitForURL(u=>u.pathname==='/org/dashboard');await page.getByRole('button',{name:'Post a Job',exact:true}).first().waitFor();
 const organization=(await db.doc('organizations/'+owner.uid).get()).data(),employer=(await db.doc('employers/'+owner.uid).get()).data();assert.equal(organization.name,'Fictional Prairie Employer '+prefix);assert.equal(organization.logoUrl,undefined);assert.equal(employer.plan,'free');assert.equal(organization.businessIdentity,'non_indigenous');assert.deepEqual(organization.capabilities,['list_business','post_jobs']);assert.deepEqual(employer.capabilities,['list_business','post_jobs']);await record('selected-capabilities-persist-and-hiring-cta-visible');assert.equal((await db.doc('users/'+owner.uid).get()).data().role,'employer');
 assert.equal(await page.evaluate(uid=>localStorage.getItem('iopps-employer-draft-v1:'+uid),owner.uid),null);await shot('persisted-employer-dashboard');await record('full-signup-verified-org-persisted-no-logo-no-paid-grant');
 await page.goto(server.base+'/dashboard');await page.waitForURL(u=>u.pathname==='/org/dashboard');await record('dashboard-alias-resolves-real-employer-workspace');
 await page.goto(server.base+'/org/dashboard/jobs/new');await page.getByPlaceholder('e.g. Senior Software Developer').fill('Fictional QA Community Coordinator');await page.locator('select').filter({has:page.getByRole('option',{name:'Administration',exact:true})}).selectOption('Administration');await page.getByLabel('Province / territory',{exact:false}).selectOption('SK');
 await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByPlaceholder('Describe the role, team, and what a typical day looks like...').fill('A fictional local-only role for employer acceptance. No real applications are accepted.');await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await shot('job-review');
 await page.getByRole('button',{name:/Save.*Draft/i}).click();
 await expect.poll(async()=>{const jobs=await db.collection('jobs').where('employerId','==',owner.uid).get();return jobs.size;}).toBe(1);
 const jobDoc=(await db.collection('jobs').where('employerId','==',owner.uid).get()).docs[0];remember(jobDoc.ref);remember(db.doc('posts/'+jobDoc.id));assert.equal(jobDoc.data().status,'draft');await record('desktop-draft-job-persisted',{jobId:jobDoc.id});
 await page.goto(server.base+'/org/dashboard/jobs/'+jobDoc.id+'/edit');await page.getByRole('radio',{name:'active',exact:true}).check();await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().status).toBe('active');await record('desktop-publish-job-persisted');
 const ownerToken=await tokenFor(owner.uid);
 const candidate=await fictionalUser('candidate'),candidateToken=await tokenFor(candidate.uid);
 await remember(db.doc('members/'+candidate.uid)).set({displayName:'Fictional Candidate',role:'community',email:candidate.email});
 assert.equal((await request('PUT','/api/employer/jobs/'+jobDoc.id,ownerToken,{requiresResume:false,requiresCoverLetter:false,requiresReferences:false})).status,200);
 const applied=await request('POST','/api/applications',candidateToken,{postId:jobDoc.id,coverLetter:'Fictional local-only applicant'});assert.equal(applied.status,201,JSON.stringify(applied.data));
 const applicationRef=remember(db.doc('applications/'+candidate.uid+'_'+jobDoc.id));
 await page.goto(server.base+'/org/dashboard/applications');await page.getByLabel('Application status for Fictional Candidate',{exact:true}).selectOption('reviewing');await expect.poll(async()=>(await applicationRef.get()).data().status).toBe('reviewing');await shot('applicant-reviewed');await record('desktop-real-applicant-review-persisted');
 assert.equal((await request('GET','/api/employer/jobs/'+jobDoc.id,candidateToken)).status,403);
 assert.equal((await request('PUT','/api/employer/applications',candidateToken,{appId:applicationRef.id,status:'rejected'})).status,403);await record('foreign-uid-employer-data-and-review-denied');
 await page.goto(server.base+'/org/dashboard?tab=Analytics');await page.getByRole('heading',{name:'Hiring activity',exact:true}).waitFor();await expect(page.getByText('Fictional QA Community Coordinator',{exact:true})).toBeVisible();await expect(page.getByText('Recorded applications',{exact:true})).toBeVisible();const stats=await request('GET','/api/employer/stats',ownerToken);assert.equal(stats.status,200);await shot('employer-analytics');await record('desktop-analytics-real-populated-loader',{stats:stats.data});
 const teammate=await fictionalUser('teammate');await db.doc('users/'+teammate.uid).set({role:'employer',orgId:owner.uid,employerId:owner.uid,orgRole:'member'});await db.doc('members/'+teammate.uid).set({displayName:'Fictional Teammate',email:teammate.email,role:'employer',orgId:owner.uid,orgRole:'member'});
 await page.goto(server.base+'/org/dashboard/team');await page.getByLabel('Role for Fictional Teammate',{exact:true}).selectOption('admin');await expect.poll(async()=>(await db.doc('users/'+teammate.uid).get()).data().orgRole).toBe('admin');await shot('team-role-updated');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove Fictional Teammate',exact:true}).click();await expect(page.getByRole('button',{name:'Remove Fictional Teammate',exact:true})).toHaveCount(0);assert.notEqual((await db.doc('users/'+teammate.uid).get()).data().orgId,owner.uid);await record('desktop-team-real-loader-role-change-removal');
 await page.goto(server.base+'/org/dashboard/billing');await page.getByRole('heading',{name:'Billing & Plan',exact:true}).waitFor();await expect(page.getByText('CURRENT PLAN',{exact:true})).toBeVisible();await shot('billing-free-plan');await record('desktop-billing-real-free-plan-loader');
 await page.goto(server.base+'/org/dashboard/jobs/'+jobDoc.id+'/edit');await page.locator('input[type="text"]').first().fill('Fictional Edited Coordinator');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().title).toBe('Fictional Edited Coordinator');await record('desktop-edit-job-persisted');
 await page.goto(server.base+'/org/dashboard/jobs');await page.getByRole('button',{name:'Duplicate as draft',exact:true}).click();await expect(page.getByText('Job duplicated as a draft. Review it before publishing.',{exact:true})).toBeVisible();
 const duplicates=(await db.collection('jobs').where('employerId','==',owner.uid).get()).docs.filter(d=>d.id!==jobDoc.id);assert.equal(duplicates.length,1);const duplicate=duplicates[0];remember(duplicate.ref);remember(db.doc('posts/'+duplicate.id));assert.equal(duplicate.data().status,'draft');assert.equal(duplicate.data().featured,false);assert.equal(duplicate.data().title,'Fictional Edited Coordinator (copy)');assert.equal(duplicate.data().description,(await jobDoc.ref.get()).data().description);assert.equal(duplicate.data().employerId,owner.uid);assert.equal((await db.collection('applications').where('postId','==',duplicate.id).get()).size,0);await record('desktop-duplicate-private-draft-fresh-identity-no-applicants-or-paid-grant');
 await page.goto(server.base+'/org/dashboard/jobs/'+jobDoc.id+'/edit');await page.getByRole('button',{name:'Close Position',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().status).toBe('closed');await record('desktop-close-job-persisted');await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:'Yes, Delete',exact:true}).click();await expect.poll(async()=>(await jobDoc.ref.get()).data().status).toBe('deleted');await record('desktop-delete-job-tombstone-persisted');
 const community=await fictionalUser('upgrade');const upgradeContext=await contextFor();page=await upgradeContext.newPage();await page.goto(server.base+'/login');await page.getByPlaceholder('you@example.com').fill(community.email);await page.getByPlaceholder('Enter your password').fill(password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(u=>u.pathname!='/login');await page.goto(server.base+'/org/upgrade');await Promise.all([page.waitForURL(u=>u.pathname==='/org/dashboard'),page.getByRole('link',{name:'Go to Dashboard',exact:true}).click()]);await page.waitForURL(u=>u.pathname==='/org/upgrade');await record('community-dashboard-link-recovers-upgrade-not-feed');
 await page.getByPlaceholder('e.g. MLT Aikins LLP').fill('Take my exam');await page.getByRole('button',{name:/Employer \/ Business/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByRole('button',{name:'Create Organization Page →',exact:true}).click();await expect(page.getByText(/support@iopps.ca/)).toBeVisible();assert.equal((await auth.getUser(community.uid)).uid,community.uid);assert.equal((await db.doc('organizations/'+community.uid).get()).exists,false);assert.equal((await db.doc('users/'+community.uid).get()).data().role,'community');await shot('hardblock-retained-account-support-recovery');await record('desktop-high-confidence-fraud-block-preserves-account-and-recovery');await page.getByRole('button',{name:'← Back',exact:true}).click();
 await page.getByPlaceholder('e.g. MLT Aikins LLP').fill('Fictional Community Upgrade');await page.getByRole('button',{name:/Employer \/ Business/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();await page.getByPlaceholder('Tell the community about your organization...').fill('Fictional community organization upgrade acceptance');await page.getByRole('button',{name:'Create Organization Page →',exact:true}).click();await page.waitForURL(u=>u.pathname==='/org/onboarding');assert.equal((await db.doc('users/'+community.uid).get()).data().role,'employer');assert.equal((await db.doc('organizations/'+community.uid).get()).data().name,'Fictional Community Upgrade');await record('desktop-legitimate-community-upgrade-persists');
 await expect(page.getByText('Organization Logo (optional for workspace)',{exact:true})).toBeVisible();
 for(let step=0;step<3;step++)await page.getByRole('button',{name:'Next',exact:true}).click();
 await page.getByRole('button',{name:/Finish|Complete/}).click();await page.waitForURL(u=>u.pathname==='/org/plans');
 const upgraded=(await db.doc('organizations/'+community.uid).get()).data();assert.equal(upgraded.onboardingComplete,true);assert.ok(!upgraded.logoUrl);
 await page.goto(server.base+'/org/dashboard');await page.getByRole('button',{name:'Post a Job',exact:true}).first().waitFor();await expect(page.getByText('Upload a logo.',{exact:true})).toBeVisible();await shot('upgrade-no-logo-completed-workspace-directory-still-incomplete');await record('community-upgrade-no-logo-onboarding-completed-workspace');
 // Hold a real A authorization response, switch identity via another tab, then release it.
 page=await context.newPage();const authTab=await context.newPage();
 let releaseCheck,checkHeld;const checkGate=new Promise(r=>releaseCheck=r),heldCheck=new Promise(r=>checkHeld=r);
 await page.route('**/api/employer/check',async route=>{const response=await route.fetch();checkHeld();await checkGate;await route.fulfill({response});});
 await page.goto(server.base+'/org/dashboard');await heldCheck;
 await authTab.goto(server.base+'/feed');await signOutFromFeed(authTab);await loginTab(authTab,switchUser.email);
 releaseCheck();await page.waitForURL(u=>u.pathname==='/login'||u.pathname==='/org/upgrade'||u.pathname==='/feed'||u.pathname==='/setup');
 // Sign-in can briefly visit /login before resolving the new community account.
 // Wait for its actual ready UI rather than racing that redirect with the next goto.
 await expect(page.getByPlaceholder('e.g. Muskoday First Nation').or(page.getByPlaceholder('e.g. MLT Aikins LLP'))).toBeVisible();
 await expect(page.getByRole('button',{name:'Post a Job',exact:true})).toHaveCount(0);await record('held-organization-authorization-cross-tab-signout-switch-denies-stale-workspace');await authTab.close();
 await page.goto(server.base+'/employers/for-business');await page.waitForURL(u=>u.pathname==='/for-employers');await record('business-entry-alias');
 assert.deepEqual(errors,[]);
} catch(error) {if(page&&!page.isClosed()){await shot('failure');await signupState('failure-state');await fs.writeFile(path.join(output,'browser-failure.json'),JSON.stringify({error:error.stack,url:page.url().split('?')[0],text:await page.locator('body').innerText(),checks,errors},null,2));}throw error;
} finally {
 await fs.writeFile(path.join(output,'security-network.json'),JSON.stringify(securityNetwork,null,2));
 const securityEvents=[];for(const uid of users){const rows=await db.collection('signup_security_events').where('uid','==',uid).get();for(const row of rows.docs)securityEvents.push({id:row.id,...row.data()});}
 await fs.writeFile(path.join(output,'security-events.json'),JSON.stringify(securityEvents,null,2));
 const limits=await db.collection('signup_security_limits').get();await fs.writeFile(path.join(output,'security-limits.json'),JSON.stringify(limits.docs.map(d=>({id:d.id,...d.data()})),null,2));
 if(server)await fs.writeFile(path.join(output,'server.log'),server.getLogs());
 if(browser)await browser.close();if(server)await server.stop();
 const securityCleanup=await restoreSignupSecurityLimits(db,securityBaseline,securityEvents);
 await fs.writeFile(path.join(output,'security-cleanup.json'),JSON.stringify(securityCleanup,null,2));
 for(const uid of users){for(const [collection,field] of [['adminNotifications','orgId'],['adminNotifications','userId'],['signup_security_events','uid']]){const rows=await db.collection(collection).where(field,'==',uid).get();for(const row of rows.docs)remember(row.ref);}}
 for(const uid of users){for(const collection of ['activity','views']){const rows=await db.doc('organizations/'+uid).collection(collection).get();for(const row of rows.docs)remember(row.ref);}}
 for(const ref of docs.values())await ref.delete();for(const uid of users)await auth.deleteUser(uid);
 const cleanup=[];for(const ref of docs.values())cleanup.push({path:ref.path,absent:!(await ref.get()).exists});
 for(const uid of users){let absent=false;try{await auth.getUser(uid);}catch(e){absent=e.code==='auth/user-not-found';}cleanup.push({uid,absent});}
 await fs.writeFile(path.join(output,'browser-cleanup.json'),JSON.stringify(cleanup,null,2));assert.ok(cleanup.every(r=>r.absent));await deleteApp(app);
}

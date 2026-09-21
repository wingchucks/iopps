// Actual production Next build + owned demo Auth/Firestore. Fictional records only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,Timestamp,FieldValue} from 'firebase-admin/firestore';
import {prepareImportedDescription} from '../src/lib/server/import-content-quality.ts';
import {startIsolatedQaServer} from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
const output=process.env.IOPPS_QA3_OUTPUT ? path.join(process.env.IOPPS_QA3_OUTPUT,'regression-browser') : 'C:/Users/natha/Documents/Codex/2026-09-19/so-i-need-you-to-go/output/qa-round2';
await fs.mkdir(output,{recursive:true});
const app=initializeApp({projectId:'demo-iopps-preview'},'round2-browser');
const db=getFirestore(app),auth=getAuth(app),prefix='qa-round2-'+crypto.randomUUID();
const email=prefix+'@example.invalid',password='Fictional-only-2026!',bio='Fictional nurse community experience. '.repeat(140);
const docs=[],users=[],checks=[],errors=[];let browser,server,page,context;
async function seed(collection,id,data){const ref=db.collection(collection).doc(id);docs.push(ref);await ref.set(data);}
async function shot(name){await page.screenshot({path:path.join(output,'integration-'+name+'.png'),fullPage:true});}
async function record(name,data={}){checks.push({name,status:'pass',...data});await fs.writeFile(path.join(output,'integration-browser-results.json'),JSON.stringify({prefix,base:server?.base,checks,errors},null,2));}
async function login(p){await p.goto(server.base+'/login');await p.getByLabel('Email address',{exact:true}).fill(email);await p.getByLabel('Password',{exact:true}).fill(password);await p.locator('button[type=submit]').click();await p.waitForURL(u=>!['/login','/verify-email'].includes(u.pathname));}
try{
 server=await startIsolatedQaServer();browser=await chromium.launch({channel:'chrome',headless:true,env:{...process.env,USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'}});
 const existing=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','e2e/tests/27-week1-audit-fixes.spec.ts','--grep','C-5','--project','desktop-chrome','--reporter=line'],{env:{...process.env,TEST_BASE_URL:server.base,USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'},encoding:'utf8'});await fs.writeFile(path.join(output,'integration-existing-signup.log'),existing.stdout+'\n'+existing.stderr);assert.equal(existing.status,0,'Existing signup assertions retained');
 context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)?r.continue():r.abort();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const job={title:'Fictional Community Nurse',employerName:'FNHA',employerId:prefix+'-org',orgId:prefix+'-org',location:'Saskatoon, SK',employmentType:'Full-time',active:true,status:'active',description:'Fictional nurse opportunity for local verification only.',descriptionFormat:'plain-text',requiresResume:false,createdAt:Timestamp.now(),applicationMethod:'iopps'};
 await seed('jobs',prefix+'-job',job);
 await seed('jobs',prefix+'-alias',{...job,title:'Fictional Clinical Nurse',employerName:'First Nations Health Authority',employerId:prefix+'-alias-org'});
 await seed('jobs',prefix+'-required',{...job,title:'Fictional Required File Position',requiresResume:true});
 const duplicateJob={...job,title:'Fictional Duplicate Branch Manager',employerName:'Fictional QA Employer',closingDate:'2099-12-31',description:'Identical fictional posting mirrored under separate database identifiers.'};
 await seed('jobs',prefix+'-duplicate-a',duplicateJob);
 await seed('jobs',prefix+'-duplicate-b',duplicateJob);
 await seed('jobs',prefix+'-different-location',{...duplicateJob,location:'Winnipeg, MB'});
 const listingResponse=await fetch(server.base+'/api/jobs?limit=100');assert.equal(listingResponse.status,200);
 const listingData=await listingResponse.json();const listings=listingData.jobs;
 assert.equal(listings.filter(j=>j.title===duplicateJob.title&&j.location==='Saskatoon, SK').length,1,'Separate IDs for identical content must be deduplicated in API output');
 assert.equal(listings.filter(j=>j.title===duplicateJob.title&&j.location==='Winnipeg, MB').length,1,'Distinct job locations must remain separate');
 await record('api-distinct-record-content-deduplication-with-location-isolation');
 const imported=prepareImportedDescription('## Fictional partner role\n**Métis community**\n- Meaningful work\nSIGA â€™s employees; source � needs review.');
 await seed('jobs',prefix+'-import',{...job,title:'Fictional Imported Role',...imported,publishedAt:'2026-09-17',createdAt:Timestamp.fromDate(new Date('2026-09-19T12:00:00Z'))});
 const denyAuth=async r=>r.fulfill({status:429,json:{error:{code:429,message:'TOO_MANY_ATTEMPTS_TRY_LATER'}}});
 await page.route('**/*accounts:signInWithPassword*',denyAuth);await page.goto(server.base+'/login');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.locator('button[type=submit]').click();await page.getByText(/Too many attempts/).waitFor();assert.doesNotMatch(await page.locator('body').innerText(),/Firebase:|auth\/too-many/);await shot('friendly-login-error');await page.unroute('**/*accounts:signInWithPassword*',denyAuth);await record('safe-login-error-controlled-no-provider-throttle');
 await page.route('**/*accounts:sendOobCode*',denyAuth);await page.goto(server.base+'/forgot-password');await page.locator('input[type=email]').fill(email);await page.locator('button[type=submit]').click();await page.getByText(/Too many attempts/).waitFor();assert.doesNotMatch(await page.locator('body').innerText(),/Firebase:|auth\/too-many/);await shot('friendly-reset-error');await page.unroute('**/*accounts:sendOobCode*',denyAuth);await record('safe-reset-error-controlled-no-email');
 await page.goto(server.base+'/signup');
 await page.getByRole('button',{name:/Individual/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await page.getByText('Create your Account',{exact:true}).waitFor();
 await page.getByLabel('Your Name',{exact:false}).fill('Fictional Nurse QA');await page.getByLabel('Email Address',{exact:false}).fill(email);
 await page.locator('#password').fill(password);await page.locator('#confirmPassword').fill(password);
 await expect(page.locator('#signup-consent')).toHaveAttribute('required','');
 await page.locator('#signup-consent').check();await page.getByRole('button',{name:'Create Account →',exact:true}).click();
 await page.getByText('Check your Inbox',{exact:true}).waitFor();
 const user=await auth.getUserByEmail(email);users.push(user.uid);docs.push(db.doc('users/'+user.uid),db.doc('members/'+user.uid));
 assert.equal(user.emailVerified,false);await shot('signup');await record('signup-required-consent-real-auth',{uid:user.uid});
 const codes=await (await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();
 const code=codes.oobCodes.find(c=>c.email===email&&c.requestType==='VERIFY_EMAIL');assert.ok(code,'Emulator delivered verification action');
 const actionPage=await context.newPage();let releaseAction;const actionGate=new Promise(resolve=>{releaseAction=resolve;});
 await actionPage.route('**/*accounts:update*',async route=>{await actionGate;await route.continue();});
 const actionUrl=new URL(server.base+'/auth/action');actionUrl.searchParams.set('mode','verifyEmail');actionUrl.searchParams.set('oobCode',code.oobCode);
 await actionPage.goto(actionUrl.href,{waitUntil:'domcontentloaded'});await expect(actionPage.getByRole('heading',{name:'Verifying your email',exact:true})).toBeVisible();
 await actionPage.screenshot({path:path.join(output,'integration-verification-loading.png'),fullPage:true});releaseAction();
 await expect(actionPage.getByRole('heading',{name:'Email verified',exact:true})).toBeVisible();assert.equal(new URL(actionPage.url()).search,'');
 assert.equal((await auth.getUser(user.uid)).emailVerified,true);
 await actionPage.screenshot({path:path.join(output,'integration-verification-success.png'),fullPage:true});
 await actionPage.goto(server.base+'/auth/action?mode=verifyEmail&oobCode=fictional-invalid-code');await expect(actionPage.locator('section').getByRole('alert')).toContainText('expired, already used, or invalid');await actionPage.close();
 await record('branded-action-real-emulator-loading-success-invalid-no-code-in-history');
 await page.getByRole('button',{name:/verified|Continue/i}).filter({visible:true}).last().click();
 await page.waitForURL(u=>u.pathname==='/setup');await record('email-emulator-out-of-band-verification');
 await page.getByPlaceholder('e.g. Saskatoon, SK').fill('Saskatoon, SK');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByPlaceholder('A few words about yourself...').fill(bio);await expect(page.locator('#setup-bio-count')).toHaveText(`${bio.length} characters`);
 await shot('setup-bio');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();await page.waitForURL(u=>u.pathname==='/feed');
 assert.equal((await db.doc('members/'+user.uid).get()).data().bio,bio);await record('setup-long-bio-persisted',{characters:bio.length});
 await db.doc('members/'+user.uid).update({community:FieldValue.delete(),location:FieldValue.delete()});
 assert.equal(Object.hasOwn((await db.doc('members/'+user.uid).get()).data(),'community'),false);
 await record('fictional-sparse-profile-fixture-prepared-for-panel-regression');
 await page.goto(server.base+'/profile');await page.getByRole('button',{name:'Edit Profile',exact:true}).click();await page.getByRole('button',{name:/About You/}).click();await expect(page.locator('textarea').first()).toHaveValue(bio);
 const edited=bio+'Reload proof';await page.locator('textarea').first().fill(edited);await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await db.doc('members/'+user.uid).get()).data().bio).toBe(edited);
 await page.reload();await page.getByRole('button',{name:'Edit Profile',exact:true}).click();await page.getByRole('button',{name:/About You/}).click();await expect(page.locator('textarea').first()).toHaveValue(edited);await shot('profile-bio');await record('profile-long-bio-save-reload');
 // Exercise the panel itself, with independent Firestore readbacks for every field.
 for(const length of [64,206]){
  const value='Fictional profile edit verification. '.repeat(8).slice(0,length);
  await page.getByPlaceholder('A few words about yourself...').fill(value);
  await expect(page.locator('#profile-bio-count')).toHaveText(`${length} characters`);
  await page.getByRole('button',{name:'Save Changes',exact:true}).click();
  await expect.poll(async()=>(await db.doc('members/'+user.uid).get()).data().bio).toBe(value);
  await page.reload();await page.getByRole('button',{name:'Edit Profile',exact:true}).click();await page.getByRole('button',{name:/About You/}).click();await expect(page.getByPlaceholder('A few words about yourself...')).toHaveValue(value);
  await record('edit-profile-bio-'+length+'-characters-save-counter-reload');
 }
 await page.getByPlaceholder('e.g. Software Developer | Treaty 6').fill('Fictional Community Nurse');
 await page.getByPlaceholder('e.g. Project Management, Web Development').fill('Nursing, Community Support');
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect.poll(async()=>{const data=(await db.doc('members/'+user.uid).get()).data();return {headline:data.headline,skillsText:data.skillsText}}).toEqual({headline:'Fictional Community Nurse',skillsText:'Nursing, Community Support'});
 await page.reload();await page.getByRole('button',{name:'Edit Profile',exact:true}).click();
 await page.getByPlaceholder('e.g. Saskatoon, SK').fill('Saskatoon, SK, CA');
 await page.getByRole('button',{name:/Interests/}).click();
 const priorInterests=(await db.doc('members/'+user.uid).get()).data().interests||[];
 await page.getByRole('button',{name:/Livestreams & Stories/}).click();
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect.poll(async()=>{const data=(await db.doc('members/'+user.uid).get()).data();return {location:data.location,toggled:data.interests.includes('livestreams')}}).toEqual({location:'Saskatoon, SK, CA',toggled:!priorInterests.includes('livestreams')});
 await page.reload();await page.getByRole('button',{name:'Edit Profile',exact:true}).click();await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toHaveValue('Saskatoon, SK, CA');await page.getByRole('button',{name:/About You/}).click();await expect(page.getByPlaceholder('e.g. Software Developer | Treaty 6')).toHaveValue('Fictional Community Nurse');await expect(page.getByPlaceholder('e.g. Project Management, Web Development')).toHaveValue('Nursing, Community Support');await shot('profile-all-fields');await record('edit-profile-headline-skills-location-interests-persisted');
 await page.goto(server.base+'/jobs');const search=page.getByRole('searchbox',{name:'Search jobs',exact:true}),location=page.getByRole('searchbox',{name:'Filter jobs by city or province',exact:true});
 await search.pressSequentially('nurse',{delay:100});await location.pressSequentially('Saskatoon',{delay:100});await expect(search).toHaveValue('nurse');await expect(location).toHaveValue('Saskatoon');await expect.poll(()=>new URL(page.url()).searchParams.get('location')).toBe('Saskatoon');
 await page.getByText(job.title,{exact:true}).waitFor();await shot('jobs');await record('normal-speed-search-location-next-router');
 await page.locator('summary').filter({hasText:'More filters'}).click();
 const employer=page.getByRole('combobox',{name:/employer/i});await expect(employer.locator('option').filter({hasText:'First Nations Health Authority'})).toHaveCount(1);
 await employer.selectOption({label:'First Nations Health Authority'});await page.getByText(job.title,{exact:true}).waitFor();await page.getByText('Fictional Clinical Nurse',{exact:true}).waitFor();await record('canonical-employer-associated-jobs');
 await page.goto(server.base+'/jobs/'+prefix+'-job');await page.getByRole('button',{name:/Save Job|Save job|Save$/}).first().click();await expect.poll(async()=>(await db.doc(`saved_items/${user.uid}_${prefix}-job`).get()).exists).toBe(true);docs.push(db.doc(`saved_items/${user.uid}_${prefix}-job`));
 await page.goto(server.base+'/saved');await page.getByText('1 item saved',{exact:true}).waitFor();await shot('saved');await record('saved-real-firestore-and-spaced-copy');
 await page.goto(server.base+'/jobs/'+prefix+'-job/apply');await expect(page.getByRole('button',{name:/Next/})).toBeDisabled();await expect(page.getByRole('button',{name:/Next/})).toHaveAttribute('aria-describedby','application-next-requirement');await expect(page.locator('#application-next-requirement')).toBeVisible();await expect(page.locator('#application-next-requirement')).not.toHaveText('');await page.getByRole('switch',{name:/profile/i}).click();await expect(page.getByRole('button',{name:/Next/})).toBeEnabled();await page.getByRole('button',{name:/Next/}).click();await page.getByRole('button',{name:/Next/}).click();await page.getByRole('button',{name:/Submit Application/}).click();
 await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor();const receipt=db.doc(`applications/${user.uid}_${prefix}-job`);docs.push(receipt);assert.equal((await receipt.get()).data().resumeType,'profile');await shot('application-receipt');await page.reload();await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor();await record('profile-only-two-next-submit-persisted-receipt');
 await page.goto(server.base+'/jobs/'+prefix+'-required/apply');await page.getByRole('switch',{name:/profile/i}).click();await expect(page.getByRole('button',{name:/Next/})).toBeDisabled();await page.getByText(/This employer requires a resume file/).first().waitFor();await shot('required-resume-explained');await record('required-file-exception-not-bypassed');
 await page.goto(server.base+'/settings/notifications');const sw=page.getByRole('switch',{name:'Applications Email',exact:true});await sw.waitFor();const before=await sw.getAttribute('aria-checked');await sw.focus();await page.keyboard.press('Space');assert.notEqual(await sw.getAttribute('aria-checked'),before);await page.keyboard.press('Enter');assert.equal(await sw.getAttribute('aria-checked'),before);await shot('notification-keyboard');await record('notification-label-space-enter-real-route');
 await page.goto(server.base+'/');const external=page.getByRole('link',{name:/This is IOPPS/});await expect(external).toHaveAttribute('href','https://ioppslive.com');await expect(external).toHaveAttribute('target','_blank');assert.match(await external.getAttribute('rel'),/noopener/);await expect(page.getByRole('link',{name:'Indigenous Businesses',exact:true}).first()).toBeVisible();await shot('navigation');await record('navigation-label-external-noopener');
 await page.goto(server.base+'/jobs/'+prefix+'-import');await page.getByText(/Métis community/).first().waitFor();await expect(page.getByText('Originally posted: 2026-09-17',{exact:true})).toBeVisible();await expect(page.getByText('Added to IOPPS: 2026-09-19',{exact:true})).toBeVisible();await expect(page.getByText('📍 Saskatoon, SK',{exact:true})).toBeVisible();const importedText=await page.locator('body').innerText();assert.ok(importedText.includes('• Meaningful work'));assert.ok(!importedText.includes('**Métis'));assert.ok(importedText.includes('source � needs review'));await shot('imported-description');await record('offline-normalized-import-real-next-render',{liveBackfill:'not performed'});
 await page.route('**/api/jobs?limit=40',async r=>{const response=await r.fetch();const data=await response.json();const target=data.jobs.find(j=>j.id===prefix+'-job');assert.ok(target);data.jobs=[{...target,featured:true},...data.jobs,{...target,featured:true}];await r.fulfill({response,json:data});});
 await page.goto(server.base+'/feed');await page.getByText(job.title,{exact:true}).first().waitFor();assert.equal(await page.locator('a[href^="/jobs/"]').filter({has:page.getByText(job.title,{exact:true})}).count(),1);await record('feed-canonical-id-no-duplicate',{controlledDuplicateResponse:true});
 const guest=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await guest.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)?r.continue():r.abort();});
 const gp=await guest.newPage();await gp.goto(server.base+'/jobs/'+prefix+'-alias');await gp.getByRole('button',{name:/Save Job|Save job|Save$/}).first().click();await gp.waitForURL(u=>u.pathname==='/login');assert.match(gp.url(),/save/);await gp.getByLabel('Email address',{exact:true}).fill(email);await gp.getByLabel('Password',{exact:true}).fill(password);await gp.locator('button[type=submit]').click();await gp.waitForURL(u=>u.pathname.startsWith('/jobs/'));const guestSave=db.doc(`saved_items/${user.uid}_${prefix}-alias`);docs.push(guestSave);await expect.poll(async()=>(await guestSave.get()).exists).toBe(true);assert.equal((await db.doc(`saved_items/${user.uid}_${prefix}-job`).get()).exists,true);await gp.screenshot({path:path.join(output,'integration-guest-save.png'),fullPage:true});await guest.close();await record('guest-login-first-save-preserves-existing');
 const newGuest=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await newGuest.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)?r.continue():r.abort();});
 const np=await newGuest.newPage(),signupEmail=prefix+'-save@example.invalid';
 await np.goto(server.base+'/jobs/'+prefix+'-alias');await np.getByRole('button',{name:/Save Job|Save job|Save$/}).first().click();await np.waitForURL(u=>u.pathname==='/login');
 const signupLink=np.getByRole('link',{name:/Sign up|Create.*account/i}).first();await signupLink.click();await np.waitForURL(u=>u.pathname==='/signup');assert.match(new URL(np.url()).searchParams.get('redirect')||'',/save=1/);
 await np.getByRole('button',{name:/Individual/}).click();await np.getByRole('button',{name:'Continue →',exact:true}).click();
 await np.getByLabel('Your Name',{exact:false}).fill('Fictional Save Intent QA');await np.getByLabel('Email Address',{exact:false}).fill(signupEmail);await np.locator('#password').fill(password);await np.locator('#confirmPassword').fill(password);await np.locator('#signup-consent').check();
 // Controlled post-creation delivery failure: real demo mail action exists, but client sees a 429. No provider traffic.
 await np.route('**/*accounts:sendOobCode*',async route=>{const response=await route.fetch();assert.equal(response.status(),200);await route.fulfill({status:429,json:{error:{code:429,message:'TOO_MANY_ATTEMPTS_TRY_LATER'}}});});
 await np.getByRole('button',{name:'Create Account →',exact:true}).click();await np.getByText('Check your Inbox',{exact:true}).waitFor();
 const signupUser=await auth.getUserByEmail(signupEmail);users.push(signupUser.uid);docs.push(db.doc('users/'+signupUser.uid),db.doc('members/'+signupUser.uid));
 assert.equal(signupUser.emailVerified,false);assert.doesNotMatch(await np.locator('body').innerText(),/Firebase:|auth\/too-many-requests/);
 await np.screenshot({path:path.join(output,'integration-signup-created-delivery-warning.png'),fullPage:true});await record('signup-account-created-delivery-429-reconciled-without-raw-failure');
 const freshCodes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();const freshCode=freshCodes.oobCodes.find(c=>c.email===signupEmail&&c.requestType==='VERIFY_EMAIL');assert.ok(freshCode);
 const av=await newGuest.newPage(),au=new URL(server.base+'/auth/action');au.searchParams.set('mode','verifyEmail');au.searchParams.set('oobCode',freshCode.oobCode);await av.goto(au.href);await av.getByRole('heading',{name:'Email verified',exact:true}).waitFor();await av.close();
 await np.getByRole('button',{name:/verified|Continue/i}).filter({visible:true}).last().click();await np.waitForURL(u=>u.pathname==='/setup');assert.match(new URL(np.url()).searchParams.get('redirect')||'',/save=1/);
 await np.goto(server.base+'/onboarding'+new URL(np.url()).search);await np.waitForURL(u=>u.pathname==='/setup');assert.match(new URL(np.url()).searchParams.get('redirect')||'',/save=1/);
 await np.getByPlaceholder('e.g. Saskatoon, SK').fill('Saskatoon, SK');for(let i=0;i<4;i++)await np.getByRole('button',{name:'Continue',exact:true}).click();await np.getByRole('button',{name:'Go to My Feed',exact:true}).click();await np.waitForURL(u=>u.pathname==='/jobs/'+prefix+'-alias');
 const signupSave=db.doc(`saved_items/${signupUser.uid}_${prefix}-alias`);docs.push(signupSave);await expect.poll(async()=>(await signupSave.get()).exists).toBe(true);
 await np.goto(server.base+'/saved');await np.getByText('1 item saved',{exact:true}).waitFor();await np.screenshot({path:path.join(output,'integration-signup-save-intent.png'),fullPage:true});await record('guest-save-signup-verify-canonical-onboarding-persisted-save');
 await np.goto(server.base+'/profile');await np.getByRole('button',{name:'Sign Out',exact:true}).click();await np.waitForURL(u=>u.pathname==='/'||u.pathname==='/login');assert.equal((await newGuest.cookies()).some(c=>c.name==='__session'&&c.value),false);await np.goto(server.base+'/settings');await np.waitForURL(u=>u.pathname==='/login');await record('logout-protected-settings-redirect');await newGuest.close();
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed()){await shot('failure');await fs.writeFile(path.join(output,'integration-browser-failure.json'),JSON.stringify({error:error.stack,url:page.url(),text:await page.locator('body').innerText(),checks,errors},null,2));}throw error;
}finally{
 if(browser)await browser.close();if(server){await server.stop();const port=Number(new URL(server.base).port);await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});await fs.writeFile(path.join(output,'integration-app-port-cleanup.json'),JSON.stringify({port,closed:true}));}
 // Exact owned identities/documents only; independently read back each deletion.
 for(const ref of docs)await ref.delete();for(const uid of users)await auth.deleteUser(uid);
 const cleanup=[];for(const ref of docs)cleanup.push({path:ref.path,absent:!(await ref.get()).exists});
 for(const uid of users){let absent=false;try{await auth.getUser(uid);}catch(e){absent=e.code==='auth/user-not-found';}cleanup.push({uid,absent});}
 await fs.writeFile(path.join(output,'integration-browser-cleanup.json'),JSON.stringify(cleanup,null,2));assert.ok(cleanup.every(x=>x.absent));await deleteApp(app);
}

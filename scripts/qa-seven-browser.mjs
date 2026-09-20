// Actual production Next build + owned demo Auth/Firestore. Fictional records only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {prepareImportedDescription} from '../src/lib/server/import-content-quality.ts';
import {startIsolatedQaServer} from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
const output='C:/Users/natha/Documents/Codex/2026-09-19/so-i-need-you-to-go/output/qa-seven-fixes';
const app=initializeApp({projectId:'demo-iopps-preview'},'seven-browser');
const db=getFirestore(app),auth=getAuth(app),prefix='qa-seven-'+crypto.randomUUID();
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
 const imported=prepareImportedDescription('## Fictional partner role\n**Métis community**\n- Meaningful work\nSIGA â€™s employees; source � needs review.');
 await seed('jobs',prefix+'-import',{...job,title:'Fictional Imported Role',...imported});
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
 const verification=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=fictional-emulator-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oobCode:code.oobCode})});assert.equal(verification.status,200);
 assert.equal((await auth.getUser(user.uid)).emailVerified,true);
 await page.getByRole('button',{name:/verified|Continue/i}).filter({visible:true}).last().click();
 await page.waitForURL(u=>u.pathname==='/setup');await record('email-emulator-out-of-band-verification');
 await page.getByPlaceholder('e.g. Saskatoon, SK').fill('Saskatoon, SK');
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByPlaceholder('A few words about yourself...').fill(bio);await expect(page.locator('#setup-bio-count')).toHaveText(`${bio.length} characters`);
 await shot('setup-bio');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();await page.waitForURL(u=>u.pathname==='/feed');
 assert.equal((await db.doc('members/'+user.uid).get()).data().bio,bio);await record('setup-long-bio-persisted',{characters:bio.length});
 await page.goto(server.base+'/profile');await page.getByRole('button',{name:'Edit Profile',exact:true}).click();await page.getByRole('button',{name:/About You/}).click();await expect(page.locator('textarea').first()).toHaveValue(bio);
 const edited=bio+'Reload proof';await page.locator('textarea').first().fill(edited);await page.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await db.doc('members/'+user.uid).get()).data().bio).toBe(edited);
 await page.reload();await page.getByRole('button',{name:'Edit Profile',exact:true}).click();await page.getByRole('button',{name:/About You/}).click();await expect(page.locator('textarea').first()).toHaveValue(edited);await shot('profile-bio');await record('profile-long-bio-save-reload');
 await page.goto(server.base+'/jobs');const search=page.getByRole('searchbox',{name:'Search jobs',exact:true}),location=page.getByRole('searchbox',{name:'Filter jobs by city or province',exact:true});
 await search.pressSequentially('nurse',{delay:100});await location.pressSequentially('Saskatoon',{delay:100});await expect(search).toHaveValue('nurse');await expect(location).toHaveValue('Saskatoon');await expect.poll(()=>new URL(page.url()).searchParams.get('location')).toBe('Saskatoon');
 await page.getByText(job.title,{exact:true}).waitFor();await shot('jobs');await record('normal-speed-search-location-next-router');
 await page.locator('summary').filter({hasText:'More filters'}).click();
 const employer=page.getByRole('combobox',{name:/employer/i});await expect(employer.locator('option').filter({hasText:'First Nations Health Authority'})).toHaveCount(1);
 await employer.selectOption({label:'First Nations Health Authority'});await page.getByText(job.title,{exact:true}).waitFor();await page.getByText('Fictional Clinical Nurse',{exact:true}).waitFor();await record('canonical-employer-associated-jobs');
 await page.goto(server.base+'/jobs/'+prefix+'-job');await page.getByRole('button',{name:/Save Job|Save job|Save$/}).first().click();await expect.poll(async()=>(await db.doc(`saved_items/${user.uid}_${prefix}-job`).get()).exists).toBe(true);docs.push(db.doc(`saved_items/${user.uid}_${prefix}-job`));
 await page.goto(server.base+'/saved');await page.getByText('1 item saved',{exact:true}).waitFor();await shot('saved');await record('saved-real-firestore-and-spaced-copy');
 await page.goto(server.base+'/jobs/'+prefix+'-job/apply');await page.getByRole('switch',{name:/profile/i}).click();await expect(page.getByRole('button',{name:/Next/})).toBeEnabled();await page.getByRole('button',{name:/Next/}).click();await page.getByRole('button',{name:/Next/}).click();await page.getByRole('button',{name:/Submit Application/}).click();
 await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor();const receipt=db.doc(`applications/${user.uid}_${prefix}-job`);docs.push(receipt);assert.equal((await receipt.get()).data().resumeType,'profile');await shot('application-receipt');await page.reload();await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor();await record('profile-only-two-next-submit-persisted-receipt');
 await page.goto(server.base+'/jobs/'+prefix+'-required/apply');await page.getByRole('switch',{name:/profile/i}).click();await expect(page.getByRole('button',{name:/Next/})).toBeDisabled();await page.getByText(/This employer requires a resume file/).first().waitFor();await shot('required-resume-explained');await record('required-file-exception-not-bypassed');
 await page.goto(server.base+'/settings/notifications');const sw=page.getByRole('switch',{name:'Applications Email',exact:true});await sw.waitFor();const before=await sw.getAttribute('aria-checked');await sw.focus();await page.keyboard.press('Space');assert.notEqual(await sw.getAttribute('aria-checked'),before);await page.keyboard.press('Enter');assert.equal(await sw.getAttribute('aria-checked'),before);await shot('notification-keyboard');await record('notification-label-space-enter-real-route');
 await page.goto(server.base+'/');const external=page.getByRole('link',{name:/This is IOPPS/});await expect(external).toHaveAttribute('href','https://ioppslive.com');await expect(external).toHaveAttribute('target','_blank');assert.match(await external.getAttribute('rel'),/noopener/);await expect(page.getByRole('link',{name:'Indigenous Businesses',exact:true}).first()).toBeVisible();await shot('navigation');await record('navigation-label-external-noopener');
 await page.goto(server.base+'/jobs/'+prefix+'-import');await page.getByText(/Métis community/).first().waitFor();const importedText=await page.locator('body').innerText();assert.ok(importedText.includes('• Meaningful work'));assert.ok(!importedText.includes('**Métis'));assert.ok(importedText.includes('source � needs review'));await shot('imported-description');await record('offline-normalized-import-real-next-render',{liveBackfill:'not performed'});
 await page.route('**/api/jobs?limit=40',async r=>{const response=await r.fetch();const data=await response.json();const target=data.jobs.find(j=>j.id===prefix+'-job');assert.ok(target);data.jobs=[{...target,featured:true},...data.jobs,{...target,featured:true}];await r.fulfill({response,json:data});});
 await page.goto(server.base+'/feed');await page.getByText(job.title,{exact:true}).first().waitFor();assert.equal(await page.locator('a[href^="/jobs/"]').filter({has:page.getByText(job.title,{exact:true})}).count(),1);await record('feed-canonical-id-no-duplicate',{controlledDuplicateResponse:true});
 const guest=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});await guest.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)?r.continue():r.abort();});
 const gp=await guest.newPage();await gp.goto(server.base+'/jobs/'+prefix+'-alias');await gp.getByRole('button',{name:/Save Job|Save job|Save$/}).first().click();await gp.waitForURL(u=>u.pathname==='/login');assert.match(gp.url(),/save/);await gp.getByLabel('Email address',{exact:true}).fill(email);await gp.getByLabel('Password',{exact:true}).fill(password);await gp.locator('button[type=submit]').click();await gp.waitForURL(u=>u.pathname.startsWith('/jobs/'));const guestSave=db.doc(`saved_items/${user.uid}_${prefix}-alias`);docs.push(guestSave);await expect.poll(async()=>(await guestSave.get()).exists).toBe(true);assert.equal((await db.doc(`saved_items/${user.uid}_${prefix}-job`).get()).exists,true);await gp.screenshot({path:path.join(output,'integration-guest-save.png'),fullPage:true});await guest.close();await record('guest-login-first-save-preserves-existing');
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

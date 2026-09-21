// Actual built Next, Google Chrome, demo Auth/Firestore/Storage. Never production.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { buildBrandedPasswordResetLink } from '../src/lib/auth-verification-email.ts';
import { createImportedJobOnce, feedImportIdentity } from '../src/lib/server/feed-import-identity.ts';
import { startIsolatedQaServer } from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
const output=path.join(process.env.IOPPS_QA3_OUTPUT,'new-browser');await fs.mkdir(output,{recursive:true});
const app=initializeApp({projectId:'demo-iopps-preview',storageBucket:'demo-iopps-preview.appspot.com'},'qa3');
const auth=getAuth(app),db=getFirestore(app),bucket=getStorage(app).bucket();
const prefix='qa3-'+crypto.randomUUID(),email=prefix+'@example.invalid';
const password='Fictional-before-2026!',changed='Fictional-after-2026!';
const docs=[],files=[],checks=[];let user,browser,server,page,context;
const clean=text=>String(text).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/g,'$1[REDACTED]');
async function record(name,data={}){checks.push({name,status:'pass',...data});await fs.writeFile(path.join(output,'results.json'),JSON.stringify(checks,null,2));}
async function shot(name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
try {
 server=await startIsolatedQaServer();
 const imported={title:'Fictional Branch Manager',employerId:prefix,location:'Winnipeg, MB',feedId:prefix,externalId:'CaseSensitive',publishedAt:'2026-09-08',active:true,status:'active'};
 for(const data of [imported,{...imported,location:'Delta, BC'},{...imported,publishedAt:'2026-04-15'}]) {
  const identity=feedImportIdentity(data);docs.push(db.doc('jobs/import-'+identity),db.doc('feedImportIdentities/'+identity));
  const attempts=await Promise.all(Array.from({length:6},()=>createImportedJobOnce(db,data)));
  assert.equal(attempts.filter(Boolean).length,1);assert.equal(await createImportedJobOnce(db,data),false);
 }
 assert.equal((await db.collection('jobs').where('employerId','==',prefix).get()).size,3);
 await record('transactional-concurrent-ingestion-once-separate-locations-and-reposts',{records:3,concurrentCallsPerIdentity:6});
 user=await auth.createUser({email,password,emailVerified:true,displayName:'Fictional Individual QA'});
 for(const collection of ['users','members']){const ref=db.doc(collection+'/'+user.uid);docs.push(ref);await ref.set({uid:user.uid,email,displayName:'Fictional Individual QA',role:'community',accountType:'community',onboardingComplete:true,profileComplete:true,location:'Saskatoon, SK',interests:['jobs']});}
 browser=await chromium.launch({channel:'chrome',headless:true});context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(url.port)?route.continue():route.abort();});
 page=await context.newPage();let chooser;page.on('filechooser',value=>{chooser=value;});
 await page.goto(server.base+'/forgot-password');await page.locator('input[type=email]').fill(email);await page.locator('button[type=submit]').click();await page.getByText(/Check your|sent|inbox/i).first().waitFor();
 const codes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();
 const code=codes.oobCodes.find(item=>item.email===email&&item.requestType==='PASSWORD_RESET');assert.ok(code,'actual forgot-password request must issue a reset');
 // SDK demo mail uses native handler. Exercise exact app-owned production link builder with its issued code.
 const raw=new URL(code.oobLink);raw.searchParams.set('continueUrl',server.base+'/jobs');
 const branded=buildBrandedPasswordResetLink(server.base,raw.href);
 assert.equal(new URL(branded).pathname,'/auth/action');
 await page.goto(branded);await expect(page.getByRole('heading',{name:'Choose a new password',exact:true})).toBeVisible();assert.equal(new URL(page.url()).search,'');
 await page.getByLabel('New password',{exact:true}).fill(changed);await page.getByLabel('Confirm new password',{exact:true}).fill(changed+'mismatch');await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.locator('section').getByRole('alert')).toHaveText('Your passwords do not match.');
 await shot('reset-form-light');await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await shot('reset-form-dark');
 await page.getByLabel('Confirm new password',{exact:true}).fill(changed);await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.getByRole('heading',{name:'Password updated',exact:true})).toBeVisible();await shot('reset-success');
 await page.getByRole('link',{name:'Sign in',exact:true}).click();await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(changed);await page.locator('button[type=submit]').click();await page.waitForURL(url=>!['/login','/verify-email'].includes(url.pathname));
 assert.ok((await context.cookies()).some(cookie=>cookie.name==='__session'&&cookie.value));await record('forgot-request-real-reset-code-branded-form-mismatch-confirm-login',{mailer:'demo SDK capture; exact app-owned link builder',codeLogged:false});
 await page.goto(server.base+'/profile');const edit=page.getByRole('button',{name:'Edit profile photo',exact:true});await edit.focus();await expect(edit).toBeFocused();await page.keyboard.press('Enter');await expect.poll(()=>Boolean(chooser)).toBe(true);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');files.push(bucket.file('avatars/'+user.uid+'.png'));
 await chooser.setFiles({name:'fictional-avatar.png',mimeType:'image/png',buffer:png});await expect(page.getByText('Photo updated',{exact:true})).toBeVisible();
 await expect.poll(async()=>Boolean((await db.doc('members/'+user.uid).get()).data().photoURL)).toBe(true);assert.equal((await files[0].exists())[0],true);
 await page.reload();const avatar=page.getByRole('img',{name:'Fictional Individual QA',exact:true});await expect(avatar).toBeVisible();await expect.poll(()=>avatar.evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);await shot('avatar-persisted');await record('keyboard-avatar-filechooser-upload-storage-member-readback-reload');
 await page.goto(server.base+'/applications');await expect(page.getByRole('button',{name:'Submitted 0',exact:true})).toBeVisible();await record('application-status-count-spaced-accessible-name');
 const internalId=prefix+'-internal',internalRef=db.doc('jobs/'+internalId),fullDescription='Fictional internal application fixture only. '.repeat(45).trim();docs.push(internalRef);
 await internalRef.set({title:'Fictional required-document internal role',employerId:prefix,orgId:prefix,employerName:'Fictional QA Employer',location:'Saskatoon, SK',description:fullDescription,category:'Social Services',department:'Raw provider payroll unit',salary:'$30 / hour',active:true,status:'active',applicationMethod:'iopps',requiresResume:true,requiresCoverLetter:true,closingDate:'2099-12-31'});
 await page.goto(server.base+'/jobs/'+internalId);await expect(page.locator('.journey-role-description')).toHaveText(fullDescription);assert.equal(await page.locator('.journey-role-description').evaluate(element=>getComputedStyle(element).maxHeight),'none');await expect(page.getByText('📍 Saskatoon, SK',{exact:true})).toBeVisible();await expect(page.getByText('💰 $30 / hour',{exact:true})).toBeVisible();await shot('full-job-description');await record('full-available-description-not-clipped-location-pay-spaced',{characters:fullDescription.length});
 await page.goto(server.base+'/jobs/'+internalId+'/apply');await page.getByRole('switch',{name:/profile/i}).click();await expect(page.getByRole('button',{name:/Next/})).toBeDisabled();await page.getByRole('switch',{name:/profile/i}).click();
 await page.locator('input[type=file]').setInputFiles({name:'fictional-resume.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')});
 await expect(page.getByRole('button',{name:/Next/})).toBeEnabled();await page.getByRole('button',{name:/Next/}).click();await page.getByLabel('Cover letter',{exact:true}).fill('Fictional cover letter submitted only to the demo Firebase emulator.');await page.getByRole('button',{name:/Next/}).click();
 const receipt=db.doc(`applications/${user.uid}_${internalId}`);docs.push(receipt);await page.getByRole('button',{name:/Submit Application/}).click();await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor();assert.equal((await receipt.get()).data().resumeType,'file');assert.equal((await receipt.get()).data().status,'submitted');await page.reload();await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor();await shot('required-upload-application');await record('required-file-profile-toggle-upload-coverletter-submit-receipt-status-reload');
 await page.goto(branded);await expect(page.getByRole('link',{name:'Request a new reset link',exact:true})).toBeVisible();await expect(page.getByLabel('New password',{exact:true})).toHaveCount(0);await record('consumed-code-rejected-no-password-form');
 await page.goto(server.base+'/auth/action?mode=resetPassword&oobCode=fictional-invalid');await expect(page.getByRole('link',{name:'Request a new reset link',exact:true})).toBeVisible();await shot('reset-invalid');await record('invalid-reset-visible-recovery');
 let releaseJs,releaseData;const jsGate=new Promise(resolve=>{releaseJs=resolve;}),dataGate=new Promise(resolve=>{releaseData=resolve;});
 const delayedJs=async route=>{await jsGate;await route.continue();},delayedData=async route=>{await dataGate;await route.continue();};
 await page.route('**/_next/static/**/*.js*',delayedJs);await page.route('**/api/jobs',delayedData);
 try {
  await page.goto(server.base+'/jobs',{waitUntil:'commit'});const search=page.getByRole('searchbox',{name:'Search jobs',exact:true});await expect(search).toBeDisabled();releaseJs();await expect(search).toBeEnabled();await search.pressSequentially('Fictional',{delay:100});releaseData();await search.pressSequentially(' required',{delay:100});await expect(search).toHaveValue('Fictional required');await page.getByText('Fictional required-document internal role',{exact:true}).waitFor();await shot('cold-hydration-search');await record('actual-built-next-cold-hydration-disabled-ssr-delayed-data-typing-preserved');
 } finally {releaseJs();releaseData();await page.unrouteAll({behavior:'wait'});}
 await page.locator('summary').filter({hasText:'More filters'}).click();const area=page.getByRole('combobox',{name:'Job area',exact:true});await expect(area.locator('option').filter({hasText:'Raw provider payroll unit'})).toHaveCount(0);await area.selectOption({label:'Social Services'});const card=page.locator('.job-rich-card').filter({hasText:'Fictional required-document internal role'});await expect(card.getByText('Saskatoon, SK',{exact:true})).toBeVisible();await expect(card.getByText('$30 / hour',{exact:true})).toBeVisible();await expect(card.getByRole('heading',{name:'Fictional required-document internal role',exact:true})).toBeVisible();await shot('taxonomy-card-parity');await record('job-area-taxonomy-no-raw-department-card-detail-location-pay-parity');
 const inventory=await(await fetch(server.base+'/api/jobs')).json();assert.equal(inventory.jobs.filter(job=>job.employerId===prefix).length,4);await page.goto(server.base+'/feed');await expect(page.locator('a[href^="/jobs/"]').filter({hasText:/Fictional Branch Manager|Fictional required-document internal role/})).toHaveCount(3);await shot('feed-employer-diversity');await record('personal-feed-employer-cap-keeps-full-four-job-search-inventory');
 const guest=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await guest.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(url.port)?route.continue():route.abort();});
 try {const signup=await guest.newPage();await signup.goto(server.base+'/signup');await signup.getByRole('button',{name:/Individual/}).click();await signup.getByRole('button',{name:'Continue →',exact:true}).click();await signup.getByLabel('Your Name',{exact:false}).fill('Fictional Existing QA');await signup.getByLabel('Email Address',{exact:false}).fill(email);await signup.locator('#password').fill(changed);await signup.locator('#confirmPassword').fill(changed);await signup.locator('#signup-consent').check();await signup.getByRole('button',{name:'Create Account →',exact:true}).click();await signup.getByText('This email is already registered. Please sign in or reset your password.',{exact:true}).waitFor();assert.equal((await auth.getUserByEmail(email)).uid,user.uid);await signup.screenshot({path:path.join(output,'signup-existing-email.png'),fullPage:true});await record('existing-signup-precise-recovery-message-real-emulator-no-new-user');}finally{await guest.close();}

} catch(error) {
 if(page&&!page.isClosed()){await shot('failure');await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:clean(error.stack),url:clean(page.url()),body:await page.locator('body').innerText()},null,2));}
 throw new Error(clean(error.message));
} finally {
 if(browser)await browser.close();if(server){await server.stop();await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(Number(new URL(server.base).port),'127.0.0.1',()=>probe.close(resolve));});}
 if(user) for(const prefix of [`resumes/${user.uid}/`,`application-documents/${user.uid}/`]) {const [owned]=await bucket.getFiles({prefix});files.push(...owned);}
 for(const file of files){await file.delete({ignoreNotFound:true});assert.equal((await file.exists())[0],false);}
 for(const ref of docs){await ref.delete();assert.equal((await ref.get()).exists,false);}
 if(user){await auth.deleteUser(user.uid);await assert.rejects(auth.getUser(user.uid),e=>e.code==='auth/user-not-found');}
 await fs.writeFile(path.join(output,'cleanup.json'),JSON.stringify({documents:docs.map(d=>d.path),storageObjects:files.map(f=>f.name),absent:true,authUserRemoved:Boolean(user)},null,2));await deleteApp(app);
}

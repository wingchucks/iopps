// Website completion journeys against the built Next app and the isolated demo
// Firebase emulators only: one login with personal + organization workspaces,
// organization-only publishing, applications, business directory, events,
// scholarships, retired school/program posting, IOPPS Live and phone widths.
// Every identity, document and file is fictional and removed at the end.
// Posting credit is granted by a labelled emulator fixture; Stripe is never called.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {startIsolatedQaServer} from './local-qa-server.mjs';
import {restoreSignupSecurityLimits} from './qa-signup-security-fixture.mjs';

assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [key,value] of Object.entries({FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'}))assert.equal(process.env[key],value);

const output=path.resolve(process.env.QA_OUTPUT||'test-results/website-completion/run-'+Date.now());
await fs.mkdir(output,{recursive:true});
const run=crypto.randomUUID().slice(0,8),prefix='qa-site-'+run;
const bucketName='demo-iopps-preview.appspot.com';
const app=initializeApp({projectId:'demo-iopps-preview',storageBucket:bucketName},prefix);
const auth=getAuth(app),db=getFirestore(app),bucket=getStorage(app).bucket(bucketName);
const password='Fictional-only-2026!';
const uids=new Set(),results=[],pageErrors=[],consoleErrors=[];
const state={};let server,browser;
const securityBaseline=new Map((await db.collection('signup_security_limits').get()).docs.map(d=>[d.id,d.data()]));

const pdf=label=>Buffer.from(`%PDF-1.4\n% ${label} fictional QA document\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const scrub=text=>String(text).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"'<]+/gi,'$1[REDACTED]');
const save=()=>fs.writeFile(path.join(output,'results.json'),JSON.stringify({prefix,results,pageErrors,consoleErrors},null,2));
class Blocked extends Error {}
const need=(value,what)=>{if(!value)throw new Blocked('Blocked: '+what+' was not available from an earlier step');return value;};

async function check(id,name,fn){
 const started=Date.now();
 try{const evidence=await fn();results.push({id,name,status:'PASS',evidence:evidence??null,ms:Date.now()-started});console.log('PASS',id,name);}
 catch(error){
  const status=error instanceof Blocked?'BLOCKED':'FAIL';
  results.push({id,name,status,error:scrub(error.message).slice(0,3000)});console.log(status,id,name,'::',scrub(error.message).split('\n')[0]);
  for(const page of state.pages||[])if(!page.isClosed()){const label=`${status}-${id}-${state.pages.indexOf(page)}`;await page.screenshot({path:path.join(output,label+'.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,label+'.txt'),scrub(await page.locator('body').innerText().catch(()=>''))).catch(()=>{});}
 }
 await save();
}
async function shot(page,name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
async function newPage(width=1440){
 const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',...(width<600?{isMobile:true,hasTouch:true}:{})});
 const port=new URL(server.base).port;
 await context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'&&[port,'8080','9099','9199'].includes(url.port)?route.continue():route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>pageErrors.push({url:page.url(),message:scrub(error.message)}));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push({url:scrub(page.url()),message:scrub(message.text()).slice(0,300)});});
 (state.pages||=[]).push(page);return page;
}
async function closePage(page){state.pages=state.pages.filter(p=>p!==page);await page.context().close();}
async function login(page,email,pass=password){
 await page.goto(server.base+'/login');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(pass);
 await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(url=>url.pathname!=='/login',{timeout:30000});
 await expect.poll(async()=>(await page.context().cookies()).some(c=>c.name==='__session'&&!!c.value)).toBe(true);
}
async function logout(page){
 await page.goto(server.base+'/logout');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(url=>url.pathname==='/');
}
async function tokenFor(uid){
 const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fictional-emulator-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await auth.createCustomToken(uid),returnSecureToken:true})});
 assert.equal(response.status,200);return (await response.json()).idToken;
}
async function api(method,route,token,body){
 const response=await fetch(server.base+route,{method,redirect:'manual',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:response.status,data,location:response.headers.get('location')};
}
async function fixtureUser(label,{claims,profile={},verified=true}={}){
 const email=`${prefix}-${label}@example.invalid`;
 const user=await auth.createUser({email,password,emailVerified:verified,displayName:'QA Fictional '+label});uids.add(user.uid);
 if(claims)await auth.setCustomUserClaims(user.uid,claims);
 const base={uid:user.uid,email,displayName:'QA Fictional '+label,role:'community',setupComplete:true,onboardingComplete:true,...profile};
 for(const collection of ['users','members'])await db.doc(`${collection}/${user.uid}`).set(base);
 return {...user,email,uid:user.uid};
}
async function fixtureOrganization(label){
 const owner=await fixtureUser(label,{profile:{role:'employer',orgId:null,orgRole:'owner'}});
 const uid=owner.uid,name=`QA Fictional ${label} Org ${run}`;
 for(const collection of ['users','members'])await db.doc(`${collection}/${uid}`).set({role:'employer',orgId:uid,employerId:uid,orgRole:'owner'},{merge:true});
 const org={id:uid,employerId:uid,name,slug:`qa-fictional-${label}-${run}`,type:'employer',description:'A fictional emulator-only organization used for website QA.',contactEmail:owner.email,website:'https://example.invalid',location:{city:'Regina',province:'SK'},status:'approved',emailVerified:true,onboardingComplete:true,plan:'free',subscriptionTier:'free',standardPostCredits:0,featuredPostCredits:0};
 for(const collection of ['organizations','employers'])await db.doc(`${collection}/${uid}`).set(org);
 await auth.setCustomUserClaims(uid,{role:'employer',employerId:uid});
 return {...owner,orgName:name};
}
async function verifyEmail(page,email){
 const codes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();
 const code=codes.oobCodes.filter(c=>c.email===email&&c.requestType==='VERIFY_EMAIL').at(-1);assert.ok(code,'verification email was issued');
 const url=new URL(server.base+'/auth/action');url.searchParams.set('mode','verifyEmail');url.searchParams.set('oobCode',code.oobCode);
 const tab=await page.context().newPage();await tab.goto(url.href);await tab.getByRole('heading',{name:'Email verified',exact:true}).waitFor();await tab.close();
}
async function noHorizontalOverflow(page){return page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);}
async function storageRead(objectName,idToken){
 const response=await fetch(`http://127.0.0.1:9199/v0/b/${bucketName}/o/${encodeURIComponent(objectName)}?alt=media`,{headers:idToken?{Authorization:'Firebase '+idToken}:{}});
 return response.status;
}
function objectNameFromUrl(url){
 const value=new URL(url);const match=value.pathname.match(/\/o\/(.+)$/);if(match)return decodeURIComponent(match[1]);
 return decodeURIComponent(value.pathname.replace(`/${bucketName}/`,'').replace(/^\//,''));
}
async function applicationsFor(uid){return (await db.collection('applications').where('userId','==',uid).get()).docs;}

try {
 server=await startIsolatedQaServer();
 const home=os.userInfo().homedir;
 browser=await chromium.launch({...(process.platform==='win32'?{channel:'chrome'}:{}),headless:true,env:{...process.env,...(process.platform==='win32'?{USERPROFILE:home,LOCALAPPDATA:path.join(home,'AppData/Local'),APPDATA:path.join(home,'AppData/Roaming'),TEMP:process.env.TMPDIR||os.tmpdir(),TMP:process.env.TMPDIR||os.tmpdir()}:{})}});

 // Fixtures that the journeys interact with but do not own: an admin reviewer,
 // a second individual, and an unrelated organization with open jobs.
 state.admin=await fixtureUser('admin',{claims:{admin:true,role:'admin'},profile:{role:'admin'}});
 state.b=await fixtureUser('applicant-b',{profile:{headline:'QA Fictional second applicant',location:'Winnipeg, MB'}});
 state.c=await fixtureOrganization('other');
 for(const n of [1,2]){
  const id=`${prefix}-orgc-job-${n}`;
  await db.doc('jobs/'+id).set({title:`QA Fictional Coordinator ${n} ${run}`,employerId:state.c.uid,orgId:state.c.uid,employerName:state.c.orgName,orgName:state.c.orgName,location:'Regina, SK',description:'Fictional internal application fixture for isolated website QA only. '.repeat(8).trim(),category:'Administration',active:true,status:'active',applicationMethod:'iopps',requiresResume:true,requiresCoverLetter:true,closingDate:'2099-12-31'});
  state['cJob'+n]=id;
 }
 state.externalJob=`${prefix}-orgc-external`;
 await db.doc('jobs/'+state.externalJob).set({title:`QA Fictional External Posting ${run}`,employerId:state.c.uid,orgId:state.c.uid,employerName:state.c.orgName,location:'Regina, SK',description:'Fictional externally hosted application fixture. '.repeat(8).trim(),category:'Administration',active:true,status:'active',applicationUrl:'https://example.invalid/careers/apply',closingDate:'2099-12-31'});
 state.aEmail=`${prefix}-individual-a@example.invalid`;state.aName='QA Fictional Aiyana '+run;

 // ── Individual account ──────────────────────────────────────────────────
 const a=await newPage(1440);state.aPage=a;
 await check('ACC-01','New individual account can be created through the signup page',async()=>{
  await a.goto(server.base+'/signup');await a.getByRole('button',{name:/Individual/}).click();await a.getByRole('button',{name:'Continue →',exact:true}).click();
  await a.getByLabel('Your Name',{exact:false}).fill(state.aName);await a.getByLabel('Email Address',{exact:false}).fill(state.aEmail);
  await a.locator('#password').fill(password);await a.locator('#confirmPassword').fill(password);await a.locator('#signup-consent').check();
  await a.getByRole('button',{name:'Create Account →',exact:true}).click();await a.getByRole('heading',{name:'Check your Inbox',exact:true}).waitFor();
  const user=await auth.getUserByEmail(state.aEmail);uids.add(user.uid);state.aUid=user.uid;return {emailVerifiedBeforeLink:user.emailVerified};
 });
 await check('ACC-02','Email verification and first-time setup complete; setup persists',async()=>{
  need(state.aUid,'individual account');await verifyEmail(a,state.aEmail);
  await a.getByRole('button',{name:'Continue to Setup →',exact:true}).click();await a.waitForURL(url=>url.pathname==='/setup',{timeout:30000});
  await a.getByPlaceholder('e.g. Muskoday First Nation').fill('QA Fictional Community');
  for(let step=1;step<5;step++)await a.getByRole('button',{name:'Continue',exact:true}).click();
  await a.getByRole('button',{name:'Go to My Feed',exact:true}).click();await a.waitForURL(url=>url.pathname==='/feed',{timeout:30000});
  assert.equal((await db.doc('users/'+state.aUid).get()).data().setupComplete,true);
  assert.equal((await db.doc('members/'+state.aUid).get()).data().community,'QA Fictional Community');
 });
 await check('ACC-03','Sign-out ends the session; protected pages require sign-in; sign-in restores it',async()=>{
  need(state.aUid,'individual account');await logout(a);
  await a.goto(server.base+'/profile');await a.waitForURL(url=>url.pathname==='/login');assert.equal(new URL(a.url()).searchParams.get('redirect'),'/profile');
  assert.equal((await api('GET','/api/applications')).status,401);
  await login(a,state.aEmail);await a.goto(server.base+'/profile');await expect(a.getByRole('button',{name:'Edit Profile',exact:true})).toBeVisible();
 });
 await check('ACC-04','Account recovery sends a password-reset code for the existing account',async()=>{
  const page=await newPage(1440);
  try{
   await page.goto(server.base+'/forgot-password');await page.locator('input[type=email]').fill(state.aEmail);await page.locator('button[type=submit]').click();
   await page.getByText(/Check your|sent|inbox/i).first().waitFor();
   const codes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-iopps-preview/oobCodes')).json();
   assert.ok(codes.oobCodes.some(c=>c.email===state.aEmail&&c.requestType==='PASSWORD_RESET'));
  }finally{await closePage(page);}
 });

 // Profile editing and persistence.
 state.headline='QA Fictional community coordinator '+run;state.bio='Fictional bio written only for isolated website QA.';
 await check('PRO-01','Profile edits save and persist after reload and after signing back in',async()=>{
  need(state.aUid,'individual account');await a.goto(server.base+'/profile');await a.getByRole('button',{name:'Edit Profile',exact:true}).click();
  const headline=a.getByRole('textbox',{name:/^Professional Headline/});if(!await headline.isVisible())await a.getByRole('button',{name:/About You/}).click();
  await headline.fill(state.headline);await a.getByRole('textbox',{name:/^Bio/}).fill(state.bio);
  await a.getByRole('button',{name:'Save Changes',exact:true}).click();
  await expect.poll(async()=>(await db.doc('members/'+state.aUid).get()).data().headline).toBe(state.headline);
  await a.reload();await expect(a.getByText(state.headline,{exact:true}).first()).toBeVisible();
  await logout(a);await login(a,state.aEmail);await a.goto(server.base+'/profile');await expect(a.getByText(state.headline,{exact:true}).first()).toBeVisible();
  await shot(a,'PRO-01-profile');
 });

 // Résumé upload, validation, replacement and removal.
 const resumeInput=()=>a.locator('input[type=file]');
 const memberResume=async()=>(await db.doc('members/'+state.aUid).get()).data();
 await check('RES-01','Résumé page states supported types/size and rejects unsupported or oversized files',async()=>{
  need(state.aUid,'individual account');await a.goto(server.base+'/profile/resume');await expect(a.getByText('PDF or DOC, max 5MB',{exact:true})).toBeVisible();
  await resumeInput().setInputFiles({name:'qa-fictional-notes.txt',mimeType:'text/plain',buffer:Buffer.from('not a resume')});
  await expect(a.getByText('Please upload a PDF or DOC file',{exact:true})).toBeVisible();
  await resumeInput().setInputFiles({name:'qa-fictional-large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(5*1024*1024+10,0x20)});
  await expect(a.getByText('File must be under 5MB',{exact:true})).toBeVisible();
  assert.ok(!(await memberResume()).resumeUrl,'rejected files are not saved');
 });
 await check('RES-02','Résumé upload succeeds, can be replaced and removed, and changes persist',async()=>{
  need(state.aUid,'individual account');await a.goto(server.base+'/profile/resume');
  await resumeInput().setInputFiles({name:'qa-fictional-resume-v1.pdf',mimeType:'application/pdf',buffer:pdf('v1')});
  await expect(a.getByText('Resume uploaded',{exact:true}).first()).toBeVisible();await expect.poll(async()=>(await memberResume()).resumeFileName).toBe('qa-fictional-resume-v1.pdf');
  await resumeInput().setInputFiles({name:'qa-fictional-resume-v2.pdf',mimeType:'application/pdf',buffer:pdf('v2')});
  await expect.poll(async()=>(await memberResume()).resumeFileName).toBe('qa-fictional-resume-v2.pdf');
  await a.reload();await expect(a.getByText('qa-fictional-resume-v2.pdf',{exact:true})).toBeVisible();
  const v2=objectNameFromUrl((await memberResume()).resumeUrl);
  await a.getByRole('button',{name:'Delete',exact:true}).click();await expect(a.getByText('Resume deleted',{exact:true}).first()).toBeVisible();
  await expect.poll(async()=>(await memberResume()).resumeUrl).toBe('');assert.equal((await bucket.file(v2).exists())[0],false,'removed résumé file is deleted');
  await a.reload();await expect(a.getByText('UPLOAD RESUME',{exact:true})).toBeVisible();
  await resumeInput().setInputFiles({name:'qa-fictional-resume-v3.pdf',mimeType:'application/pdf',buffer:pdf('v3')});
  await expect.poll(async()=>(await memberResume()).resumeFileName).toBe('qa-fictional-resume-v3.pdf');await shot(a,'RES-02-resume');
 });

 // Applying with the selected résumé and a cover letter.
 state.coverA='QA fictional cover letter for application one. '+run;
 async function applyWithProfile(page,jobId,cover){
  await page.goto(server.base+'/jobs/'+jobId+'/apply');await page.getByRole('switch',{name:/profile/i}).click();
  await page.getByRole('button',{name:/Next/}).click();
  const next=page.getByRole('button',{name:/Next/});await expect(next).toBeDisabled();
  await page.getByLabel('Cover letter',{exact:true}).fill(cover);await next.click();
  const submit=page.getByRole('button',{name:/Submit Application/});await expect(submit).toBeEnabled();
  await submit.evaluate(button=>{button.click();button.click();button.click();});
  await page.getByRole('heading',{name:'Application saved',exact:true}).waitFor({timeout:30000});
 }
 await check('APP-01','Applying uses the chosen profile résumé, includes the cover letter, confirms once, and repeated clicks do not duplicate',async()=>{
  need(state.aUid,'individual account');await applyWithProfile(a,state.cJob1,state.coverA);
  const apps=await applicationsFor(state.aUid);assert.equal(apps.length,1,'exactly one application');const app=apps[0].data();state.aApp1=apps[0].id;
  assert.equal(app.status,'submitted');assert.equal(app.resumeType,'profile');assert.equal(app.coverLetter,state.coverA);assert.equal(app.orgId,state.c.uid);
  state.aApp1Object=objectNameFromUrl(app.resumeUrl);assert.match(state.aApp1Object,new RegExp('^application-documents/'+state.aUid+'/'));
  const [bytes]=await bucket.file(state.aApp1Object).download();assert.match(bytes.toString(),/ v3 fictional/,'submitted document is the selected v3 résumé');
  await a.reload();await a.getByRole('heading',{name:'Application saved',exact:true}).waitFor();await shot(a,'APP-01-receipt');
  return {applications:1,resumeVersion:'v3',archivedCopy:true};
 });
 await check('APP-02','Replacing the profile résumé later does not change the document on the submitted application',async()=>{
  need(state.aApp1Object,'first application');await a.goto(server.base+'/profile/resume');
  await resumeInput().setInputFiles({name:'qa-fictional-resume-v4.pdf',mimeType:'application/pdf',buffer:pdf('v4')});
  await expect.poll(async()=>(await memberResume()).resumeFileName).toBe('qa-fictional-resume-v4.pdf');
  const app=(await db.doc('applications/'+state.aApp1).get()).data();assert.equal(objectNameFromUrl(app.resumeUrl),state.aApp1Object);
  const [bytes]=await bucket.file(state.aApp1Object).download();assert.match(bytes.toString(),/ v3 fictional/);
 });
 await check('APP-03','Application history lists the submission; invalid and closed-job submissions are refused without false success',async()=>{
  need(state.aApp1,'first application');await a.goto(server.base+'/applications');
  await expect(a.getByText(`QA Fictional Coordinator 1 ${run}`).first()).toBeVisible();await expect(a.getByRole('link',{name:/Back to Profile/})).toHaveAttribute('href','/profile');
  const token=await tokenFor(state.aUid);
  const missing=await api('POST','/api/applications',token,{postId:state.cJob2,resumeUrl:'',coverLetter:''});assert.equal(missing.status,422,JSON.stringify(missing.data));
  assert.equal((await applicationsFor(state.aUid)).length,1,'invalid submission created nothing');
  const closedId=`${prefix}-orgc-closed`;await db.doc('jobs/'+closedId).set({title:'QA Fictional Closed',employerId:state.c.uid,orgId:state.c.uid,status:'closed',active:false,applicationMethod:'iopps'});
  const closed=await api('POST','/api/applications',token,{postId:closedId,coverLetter:'x'});assert.equal(closed.status,422);assert.match(closed.data.error,/no longer accepting/);
  return {missingDocuments:missing.data.error,closedJob:closed.data.error};
 });
 await check('APP-04','External application links lead to the employer destination without submitting anything',async()=>{
  await a.goto(server.base+'/jobs/'+state.externalJob);await expect(a.locator('a[href="https://example.invalid/careers/apply"]').filter({visible:true}).first()).toBeVisible();
  await a.goto(server.base+'/jobs/'+state.externalJob+'/apply');await a.waitForURL(url=>url.pathname==='/jobs/'+state.externalJob);
 });
 await check('PRIV-01','Another individual cannot read or withdraw this application, résumé or cover letter; public profile exposes none of them',async()=>{
  need(state.aApp1Object,'first application');const tokenB=await tokenFor(state.b.uid),tokenA=await tokenFor(state.aUid);
  const read=await api('GET','/api/applications?appId='+encodeURIComponent(state.aApp1),tokenB);assert.equal(read.status,200);assert.equal(read.data.application,null);
  assert.equal((await api('PATCH','/api/applications',tokenB,{action:'withdraw',appId:state.aApp1})).status,404);
  assert.equal(await storageRead(state.aApp1Object,tokenB),403);assert.equal(await storageRead(state.aApp1Object,null),403);
  const profileResume=objectNameFromUrl((await memberResume()).resumeUrl);assert.equal(await storageRead(profileResume,tokenB),403);assert.equal(await storageRead(profileResume,tokenA),200);
  const direct=await fetch(`http://127.0.0.1:8080/v1/projects/demo-iopps-preview/databases/(default)/documents/applications/${encodeURIComponent(state.aApp1)}`,{headers:{Authorization:'Bearer '+tokenB}});assert.equal(direct.status,403);
  const publicPage=await(await fetch(server.base+'/members/'+state.aUid)).text();
  for(const secret of ['qa-fictional-resume','application-documents','resumes%2F',state.coverA])assert.ok(!publicPage.includes(secret),'public member page exposes '+secret);
 });

 // ── One login: add an organization workspace to the same account ─────────
 state.orgName='QA Fictional Café '+run;
 await check('ORG-01','Before creating an organization, the individual sees a create option and no organization settings',async()=>{
  need(state.aUid,'individual account');await a.goto(server.base+'/settings');
  await expect(a.getByRole('link',{name:/Set Up an Organization Page/})).toHaveAttribute('href','/org/upgrade');
  await expect(a.getByRole('link',{name:/Career Preferences/})).toBeVisible();await expect(a.getByText('Organization Profile',{exact:true})).toHaveCount(0);
  await expect(a.locator('[data-nav-workspace]')).toHaveText('+ Create an organization');
 });
 await check('ORG-02','The same login creates an organization; invalid website is explained; personal identity is preserved',async()=>{
  need(state.aUid,'individual account');const before=(await db.doc('members/'+state.aUid).get()).data();
  await a.goto(server.base+'/org/upgrade');await a.getByPlaceholder('e.g. MLT Aikins LLP').fill(state.orgName);
  await a.getByRole('button',{name:/Employer \/ Business/}).click();await a.getByRole('button',{name:'Continue →',exact:true}).click();
  await a.getByPlaceholder('https://www.yourorg.com').fill('not a website');await a.getByPlaceholder('e.g. Winnipeg, Manitoba').fill('Saskatoon, Saskatchewan');
  await a.getByPlaceholder('Tell the community about your organization...').fill('QA fictional café used only for isolated website testing.');
  const rejected=a.waitForResponse(r=>r.url().endsWith('/api/employer/upgrade'));await a.getByRole('button',{name:'Create Organization Page →',exact:true}).click();
  assert.equal((await rejected).status(),400);await expect(a.getByText(/Enter a complete website address/)).toBeVisible();
  assert.equal((await db.doc('organizations/'+state.aUid).get()).exists,false,'nothing created on validation failure');
  await a.getByPlaceholder('https://www.yourorg.com').fill('https://example.invalid/cafe');
  const created=a.waitForResponse(r=>r.url().endsWith('/api/employer/upgrade'));await a.getByRole('button',{name:'Create Organization Page →',exact:true}).click();
  assert.equal((await created).status(),200);await a.waitForURL(url=>url.pathname==='/org/onboarding',{timeout:30000});
  const [user,member,org]=await Promise.all(['users','members','organizations'].map(c=>db.doc(`${c}/${state.aUid}`).get()));
  assert.equal(user.data().role,'employer');assert.equal(user.data().orgId,state.aUid);assert.equal(member.data().orgId,state.aUid);assert.equal(member.data().orgRole,'owner');
  assert.equal(member.data().displayName,before.displayName,'personal display name unchanged');assert.equal(member.data().displayName,state.aName);for(const field of ['headline','bio','community','email'])assert.deepEqual(member.data()[field],before[field],'personal '+field+' unchanged');
  assert.equal(member.data().resumeFileName,'qa-fictional-resume-v4.pdf','personal résumé unchanged');
  assert.equal(org.data().name,state.orgName);assert.equal(org.data().directoryReview.status,'draft','new business listing starts in review');
  assert.deepEqual(org.data().location,{city:'Saskatoon',province:'Saskatchewan'});state.orgSlug=org.data().slug;
  return {personalNameKept:true,directoryReview:'draft',slug:state.orgSlug};
 });
 await check('ORG-03','Organization setup completes and the dashboard shows the organization workspace clearly',async()=>{
  need(state.orgSlug,'organization');await expect(a.getByText('Organization Logo (optional for workspace)',{exact:true})).toBeVisible();
  for(let step=0;step<3;step++)await a.getByRole('button',{name:'Next',exact:true}).click();
  await a.getByRole('button',{name:/Finish|Complete/}).click();await a.waitForURL(url=>url.pathname==='/org/plans',{timeout:30000});
  await a.getByRole('link',{name:/Back to Dashboard/}).click();await a.waitForURL(url=>url.pathname==='/org/dashboard');
  const banner=a.getByRole('note',{name:'Current workspace'});await expect(banner).toContainText('Acting as '+state.orgName);
  await expect(banner.getByRole('link',{name:'Switch to my personal profile'})).toHaveAttribute('href','/profile');
  await expect(a.locator('[data-nav-workspace]')).toHaveText('Organization: '+state.orgName);
  assert.equal((await db.doc('organizations/'+state.aUid).get()).data().onboardingComplete,true);await shot(a,'ORG-03-dashboard');
 });
 await check('ORG-04','Personal profile, résumé, applications and settings keep working after creating the organization',async()=>{
  need(state.orgSlug,'organization');await a.getByRole('note',{name:'Current workspace'}).getByRole('link',{name:'Switch to my personal profile'}).click();
  await a.waitForURL(url=>url.pathname==='/profile');await expect(a.getByText(state.headline,{exact:true}).first()).toBeVisible();await a.waitForTimeout(1500);assert.equal(new URL(a.url()).pathname,'/profile','personal profile is not redirected to the organization');
  await expect(a.getByRole('note',{name:'Current workspace'})).toHaveCount(0);await expect(a.getByText('qa-fictional-resume-v4.pdf').first()).toBeVisible();
  await a.goto(server.base+'/applications');await expect(a.getByText(`QA Fictional Coordinator 1 ${run}`).first()).toBeVisible();
  await a.goto(server.base+'/settings');await expect(a.getByRole('heading',{name:'Personal',exact:true})).toBeVisible();
  await expect(a.getByRole('heading',{name:'Organization · '+state.orgName,exact:true})).toBeVisible();
  for(const name of [/Career Preferences/,/Privacy & Visibility/,/Organization Profile/,/Team Access/])await expect(a.getByRole('link',{name})).toBeVisible();
  const phone=await newPage(390);
  try{
   await login(phone,state.aEmail);await phone.goto(server.base+'/profile');await phone.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).click();
   await expect(phone.getByRole('menu',{name:'Account'}).getByText('Acting as yourself',{exact:true})).toBeVisible();
   await expect(phone.getByRole('menuitem',{name:'My Profile',exact:true})).toHaveAttribute('href','/profile');
   await expect(phone.getByRole('menuitem',{name:'Organization Dashboard',exact:true})).toHaveAttribute('href','/org/dashboard');
   await expect(phone.getByRole('group',{name:'Organization: '+state.orgName})).toBeVisible();await shot(phone,'ORG-04-phone-menu-personal');
   await phone.keyboard.press('Escape');await phone.goto(server.base+'/org/dashboard');await expect(phone.getByRole('note',{name:'Current workspace'})).toContainText(state.orgName);
   await phone.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).click();await expect(phone.getByRole('menu',{name:'Account'}).getByText('Acting as '+state.orgName,{exact:true})).toBeVisible();
   await shot(phone,'ORG-04-phone-menu-organization');assert.ok(await noHorizontalOverflow(phone));
  }finally{await closePage(phone);}
  const b=await newPage(390);
  try{await login(b,state.b.email);await b.goto(server.base+'/profile');await b.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).click();await expect(b.getByRole('menuitem',{name:'Create an Organization',exact:true})).toHaveAttribute('href','/org/upgrade');}
  finally{await closePage(b);}
 });
 await check('ORG-05','Applying as an individual after creating an organization uses the personal identity and newly selected résumé',async()=>{
  need(state.orgSlug,'organization');state.coverA2='QA fictional cover letter for application two. '+run;await applyWithProfile(a,state.cJob2,state.coverA2);
  const app=(await db.doc(`applications/${state.aUid}_${state.cJob2}`).get()).data();assert.ok(app,'second application exists');
  assert.equal(app.profileSnapshot.displayName,state.aName,'employer sees the person, not the organization');assert.notEqual(app.profileSnapshot.displayName,state.orgName);
  const [bytes]=await bucket.file(objectNameFromUrl(app.resumeUrl)).download();assert.match(bytes.toString(),/ v4 fictional/,'uses the currently selected v4 résumé');
  const [first]=await bucket.file(state.aApp1Object).download();assert.match(first.toString(),/ v3 fictional/,'first application still has v3');
  const tokenA=await tokenFor(state.aUid);const inbox=await api('GET','/api/employer/applications',tokenA);assert.equal(inbox.status,200);
  assert.equal(inbox.data.applications.some(item=>item.userId===state.aUid),false,'own applications to another organization are not in this organization inbox');
 });

 // ── Business listing through the organization workspace ─────────────────
 state.description='QA fictional café serving bannock and coffee. Edited through the dashboard. '+run;
 await check('BIZ-01','Organization profile edits save through the dashboard editor and persist',async()=>{
  need(state.orgSlug,'organization');await a.goto(server.base+'/org/dashboard?tab=Edit%20Profile&section=Identity');
  await a.getByRole('button',{name:'Our story',exact:true}).click();await a.locator('#business-field-5').fill('QA fictional café tagline');
  await a.locator('#business-field-6').fill(state.description);await a.getByRole('button',{name:'Save Story',exact:true}).click();
  await expect.poll(async()=>(await db.doc('organizations/'+state.aUid).get()).data().description).toBe(state.description);
  await a.reload();await a.getByRole('button',{name:'Our story',exact:true}).click();await expect(a.locator('#business-field-6')).toHaveValue(state.description);
 });
 await check('BIZ-02','Business logo can be uploaded and replaced from the dashboard',async()=>{
  need(state.orgSlug,'organization');await a.goto(server.base+'/org/dashboard?tab=Edit%20Profile&section=Identity');
  const logoInput=a.locator('input[type=file]').first();await logoInput.setInputFiles({name:'qa-fictional-logo.png',mimeType:'image/png',buffer:png});
  await expect.poll(async()=>(await db.doc('organizations/'+state.aUid).get()).data().logoUrl||'',{timeout:30000}).not.toBe('');
  const first=(await db.doc('organizations/'+state.aUid).get()).data().logoUrl;
  await a.locator('input[type=file]').first().setInputFiles({name:'qa-fictional-logo-2.png',mimeType:'image/png',buffer:png});
  await expect.poll(async()=>(await db.doc('organizations/'+state.aUid).get()).data().logoUrl,{timeout:30000}).not.toBe(first);
  return {replaced:true};
 });
 await check('BIZ-03','Unsafe or incomplete website links are rejected when saving, and nothing is stored',async()=>{
  need(state.orgSlug,'organization');const token=await tokenFor(state.aUid);const before=(await db.doc('organizations/'+state.aUid).get()).data().website;
  for(const website of ['javascript:alert(1)','www.example.invalid']){const r=await api('PUT','/api/employer/profile',token,{website});assert.equal(r.status,400,JSON.stringify(r.data));assert.match(r.data.error,/https:\/\//);}
  assert.equal((await api('PUT','/api/employer/profile',token,{socialLinks:{instagram:'data:text/html,x'}})).status,400);
  assert.equal((await db.doc('organizations/'+state.aUid).get()).data().website,before);
  // A legacy value the owner is not editing must not block saving other fields.
  await db.doc('organizations/'+state.aUid).update({website:'www.legacy-example.invalid'});
  assert.equal((await api('PUT','/api/employer/profile',token,{website:'www.legacy-example.invalid',phone:'306-555-0100'})).status,200);
  assert.equal((await api('PUT','/api/employer/profile',token,{website:before})).status,200);
  assert.equal((await api('PUT','/api/employer/profile',token,{businessIdentity:'indigenous',contactEmail:'cafe-'+run+'@example.invalid'})).status,200);
 });
 await check('BIZ-04','Listing is submitted for review from the dashboard and stays out of the directory until approved',async()=>{
  need(state.orgSlug,'organization');await a.goto(server.base+'/org/dashboard');
  const submit=a.getByRole('button',{name:'Submit for review',exact:true});await expect(submit).toBeEnabled({timeout:20000});await submit.click();
  await expect.poll(async()=>(await db.doc('organizations/'+state.aUid).get()).data().directoryReview.status).toBe('pending');
  const list=await api('GET','/api/organizations');assert.equal(list.data.orgs.some(o=>o.id===state.aUid||o.name===state.orgName),false);
  assert.equal((await api('GET','/api/org/'+state.orgSlug)).status,404);
 });
 await check('BIZ-05','After approval the business appears in the directory and details page, matching the dashboard',async()=>{
  need(state.orgSlug,'organization');const review=(await db.doc('organizations/'+state.aUid).get()).data().directoryReview;
  const decided=await api('POST','/api/admin/business-reviews',await tokenFor(state.admin.uid),{orgId:state.aUid,revision:review.revision,status:'pending',action:'approve'});assert.equal(decided.status,200,JSON.stringify(decided.data));
  await expect.poll(async()=>(await api('GET','/api/organizations')).data.orgs.some(o=>o.name===state.orgName),{timeout:30000}).toBe(true);
  const listing=await newPage(1440);
  try{
   await listing.goto(server.base+'/businesses?q='+encodeURIComponent(state.orgName));await expect(listing.getByText(state.orgName,{exact:true}).first()).toBeVisible();
   await listing.goto(server.base+'/org/'+state.orgSlug);await expect(listing.getByText(state.orgName,{exact:true}).first()).toBeVisible();
   await expect(listing.getByText(state.description).first()).toBeVisible();await shot(listing,'BIZ-05-public-profile');
   for(const secret of ['directoryReview','contactName','emailTemplates','standardPostCredits'])assert.ok(!JSON.stringify((await api('GET','/api/org/'+state.orgSlug)).data).includes(secret),'public profile exposes '+secret);
  }finally{await closePage(listing);}
 });
 await check('BIZ-06','Another organization or an individual cannot edit this business',async()=>{
  need(state.orgSlug,'organization');const before=(await db.doc('organizations/'+state.aUid).get()).data();
  assert.equal((await api('PUT','/api/employer/profile',null,{name:'Hijack'})).status,401);
  assert.equal((await api('PUT','/api/employer/profile',await tokenFor(state.b.uid),{name:'Hijack'})).status,403);
  const other=await api('PUT','/api/employer/profile',await tokenFor(state.c.uid),{orgId:state.aUid,name:'QA Fictional other org renamed '+run});assert.equal(other.status,200);
  const after=(await db.doc('organizations/'+state.aUid).get()).data();assert.equal(after.name,before.name);assert.equal(after.description,before.description);
  assert.equal((await api('POST','/api/employer/business-review',await tokenFor(state.b.uid),{revision:1})).status,403);
 });
 await check('BIZ-07','Hiding the listing removes it from the directory; showing it restores it',async()=>{
  need(state.orgSlug,'organization');const token=await tokenFor(state.aUid);
  assert.equal((await api('PUT','/api/employer/profile',token,{isPublished:false})).status,200);
  await expect.poll(async()=>(await api('GET','/api/organizations')).data.orgs.some(o=>o.name===state.orgName)).toBe(false);
  assert.equal((await api('PUT','/api/employer/profile',token,{isPublished:true})).status,200);
  await expect.poll(async()=>(await api('GET','/api/organizations')).data.orgs.some(o=>o.name===state.orgName)).toBe(true);
 });

 // ── Jobs: draft, preview, publish (fixture credit), public, edit, apply, review, close ──
 state.jobTitle='QA Fictional Café Barista '+run;
 await check('JOB-01','Organization creates a job, previews it, and saves a private draft',async()=>{
  need(state.orgSlug,'organization');await a.goto(server.base+'/org/dashboard/jobs/new');
  await a.getByPlaceholder('e.g. Senior Software Developer').fill(state.jobTitle);
  await a.locator('select').filter({has:a.getByRole('option',{name:'Administration',exact:true})}).selectOption('Administration');
  await a.getByLabel('Province / territory',{exact:false}).selectOption('SK');await a.getByRole('button',{name:'Continue →',exact:true}).click();
  await a.getByPlaceholder('Describe the role, team, and what a typical day looks like...').fill('Fictional barista role used only for isolated website QA. Serve coffee and bannock.');
  await a.getByRole('button',{name:'Continue →',exact:true}).click();await expect(a.getByText('This is how candidates will see your posting',{exact:true})).toBeVisible();
  await expect(a.getByText(state.jobTitle).first()).toBeVisible();await shot(a,'JOB-01-preview');
  await a.getByRole('button',{name:/Save.*Draft/i}).click();
  await expect.poll(async()=>(await db.collection('jobs').where('employerId','==',state.aUid).where('title','==',state.jobTitle).get()).size,{timeout:30000}).toBe(1);
  const job=(await db.collection('jobs').where('employerId','==',state.aUid).where('title','==',state.jobTitle).get()).docs[0];state.jobId=job.id;
  assert.equal(job.data().status,'draft');assert.equal((await api('GET','/api/jobs/'+state.jobId)).status,404);
  assert.equal((await api('GET','/api/jobs?limit=300')).data.jobs.some(j=>j.id===state.jobId),false);
 });
 await check('JOB-02','Publishing without a paid posting credit is refused (paywall intact; payment itself not tested)',async()=>{
  need(state.jobId,'job draft');await a.goto(server.base+'/org/dashboard/jobs/'+state.jobId+'/edit');await a.getByRole('radio',{name:'active',exact:true}).check();
  const denied=a.waitForResponse(r=>new URL(r.url()).pathname==='/api/employer/jobs/'+state.jobId&&r.request().method()==='PUT');
  await a.getByRole('button',{name:'Save Changes',exact:true}).click();assert.equal((await denied).status(),402);
  assert.equal((await db.doc('jobs/'+state.jobId).get()).data().status,'draft');
 });
 await check('JOB-03','With a fixture posting credit, the existing publish workflow publishes the job and uses the credit',async()=>{
  need(state.jobId,'job draft');await db.doc('employers/'+state.aUid).update({standardPostCredits:1});
  await a.goto(server.base+'/org/dashboard/jobs/'+state.jobId+'/edit');await a.getByRole('radio',{name:'active',exact:true}).check();
  await a.getByRole('button',{name:'Save Changes',exact:true}).click();
  await expect.poll(async()=>(await db.doc('jobs/'+state.jobId).get()).data().status,{timeout:30000}).toBe('active');
  assert.equal((await db.doc('employers/'+state.aUid).get()).data().standardPostCredits,0);return {fixtureCredit:'standardPostCredits=1 set directly in the emulator'};
 });
 await check('JOB-04','Published job appears in public listings, search results and the correct details page',async()=>{
  need(state.jobId,'published job');await expect.poll(async()=>(await api('GET','/api/jobs?limit=300')).data.jobs.some(j=>j.id===state.jobId)).toBe(true);
  const guest=await newPage(1440);
  try{
   await guest.goto(server.base+'/jobs?q='+encodeURIComponent(state.jobTitle));await expect(guest.getByText(state.jobTitle,{exact:true}).first()).toBeVisible();
   await guest.goto(server.base+'/jobs/'+state.jobId);await expect(guest.getByText(state.jobTitle,{exact:true}).first()).toBeVisible();
   await expect(guest.getByText(state.orgName).first()).toBeVisible();await shot(guest,'JOB-04-detail');
  }finally{await closePage(guest);}
 });
 await check('JOB-05','Editing the published job updates the public details page',async()=>{
  need(state.jobId,'published job');state.jobTitle2=state.jobTitle+' (edited)';
  await a.goto(server.base+'/org/dashboard/jobs/'+state.jobId+'/edit');await a.locator('input[type="text"]').first().fill(state.jobTitle2);
  await a.getByRole('button',{name:'Save Changes',exact:true}).click();await expect.poll(async()=>(await db.doc('jobs/'+state.jobId).get()).data().title).toBe(state.jobTitle2);
  assert.equal((await api('GET','/api/jobs/'+state.jobId)).data.job.title,state.jobTitle2);
 });
 state.coverB='QA fictional cover letter from applicant B. '+run;
 await check('JOB-06','An individual applies to the organization job with an uploaded résumé and a cover letter',async()=>{
  need(state.jobId,'published job');const b=await newPage(1440);
  try{
   await login(b,state.b.email);await b.goto(server.base+'/jobs/'+state.jobId+'/apply');
   await b.locator('input[type=file]').setInputFiles({name:'qa-fictional-b-resume.pdf',mimeType:'application/pdf',buffer:pdf('B-upload')});
   await expect(b.getByRole('button',{name:/Next/})).toBeEnabled({timeout:30000});await b.getByRole('button',{name:/Next/}).click();
   const cover=b.getByLabel('Cover letter',{exact:true});if(await cover.isVisible())await cover.fill(state.coverB);await b.getByRole('button',{name:/Next/}).click();
   await b.getByRole('button',{name:/Submit Application/}).click();await b.getByRole('heading',{name:'Application saved',exact:true}).waitFor({timeout:30000});
  }finally{await closePage(b);}
  const app=(await db.doc(`applications/${state.b.uid}_${state.jobId}`).get()).data();assert.ok(app);state.bApp=`${state.b.uid}_${state.jobId}`;
  assert.equal(app.orgId,state.aUid);assert.equal(app.coverLetter,state.coverB);const [bytes]=await bucket.file(objectNameFromUrl(app.resumeUrl)).download();assert.match(bytes.toString(),/B-upload/);
 });
 await check('JOB-07','The organization reviews the applicant, résumé and cover letter and updates the status',async()=>{
  need(state.bApp,'application to organization job');await a.goto(server.base+'/org/dashboard/applications');
  const name='QA Fictional applicant-b';await expect(a.getByText(name).first()).toBeVisible({timeout:30000});
  const resume=a.getByRole('link',{name:'View Resume'}).first();await expect(resume).toHaveAttribute('href',/application-documents/);
  await a.getByText('View application details').first().click();await expect(a.getByText(state.coverB).first()).toBeVisible();
  await a.getByLabel('Application status for '+name).first().selectOption('reviewing');
  await expect.poll(async()=>(await db.doc('applications/'+state.bApp).get()).data().status).toBe('reviewing');await shot(a,'JOB-07-applicants');
  const history=await api('GET','/api/applications',await tokenFor(state.b.uid));const seen=history.data.applications.find(item=>item.id===state.bApp);assert.equal(seen.status,'reviewing','applicant sees the updated status');assert.ok(!JSON.stringify(history.data).includes('reviewerNote'),'no private reviewer notes');
 });
 await check('JOB-08','Unrelated organizations and individuals cannot see or change this organization’s applicants or job',async()=>{
  need(state.bApp,'application to organization job');const tokenC=await tokenFor(state.c.uid),tokenB=await tokenFor(state.b.uid);
  const inbox=await api('GET','/api/employer/applications',tokenC);assert.equal(inbox.status,200);assert.equal(inbox.data.applications.some(item=>item.id===state.bApp),false);
  assert.ok([403,404].includes((await api('PUT','/api/employer/applications',tokenC,{appId:state.bApp,status:'rejected'})).status));
  assert.equal((await db.doc('applications/'+state.bApp).get()).data().status,'reviewing');
  assert.equal((await api('GET','/api/employer/applications',tokenB)).status,403);
  assert.ok([403,404].includes((await api('PUT','/api/employer/jobs/'+state.jobId,tokenC,{title:'Hijacked'})).status));
  assert.equal((await db.doc('jobs/'+state.jobId).get()).data().title,state.jobTitle2);
 });
 await check('JOB-09','Closing the job removes it from listings and blocks new applications',async()=>{
  need(state.jobId,'published job');await a.goto(server.base+'/org/dashboard/jobs/'+state.jobId+'/edit');
  await a.getByRole('button',{name:'Close Position',exact:true}).click();await expect.poll(async()=>(await db.doc('jobs/'+state.jobId).get()).data().status).toBe('closed');
  await expect.poll(async()=>(await api('GET','/api/jobs?limit=300')).data.jobs.some(j=>j.id===state.jobId)).toBe(false);
  const late=await fixtureUser('late-applicant');const blocked=await api('POST','/api/applications',await tokenFor(late.uid),{postId:state.jobId,coverLetter:'late'});
  assert.equal(blocked.status,422);assert.match(blocked.data.error,/no longer accepting/);
  assert.equal((await db.doc('applications/'+state.bApp).get()).data().status,'reviewing','existing application kept');
 });

 // ── Events and scholarships: organization workspace only ─────────────────
 async function opportunity(kind,fill,title){
  await a.goto(server.base+`/org/dashboard/${kind}/new`);await fill(title);
  await a.getByRole('button',{name:'Save private draft',exact:true}).click();await expect(a.getByText('Private draft saved. It is not listed publicly.',{exact:true})).toBeVisible();
  const draft=(await api('GET','/api/employer/'+kind,await tokenFor(state.aUid))).data[kind].find(item=>item.title===title);assert.ok(draft,'draft listed for owner');
  assert.equal((await api('GET','/api/'+kind)).data[kind].some(item=>item.id===draft.id),false,'draft not public');
  await a.getByRole('button',{name:'Edit '+title}).click();await a.getByRole('button',{name:'Review listing',exact:true}).click();
  await a.getByRole('button',{name:'Publish listing',exact:true}).click();await expect(a.getByText('Listing published. You can edit or close it below.',{exact:true})).toBeVisible();
  const active=(await api('GET','/api/employer/'+kind,await tokenFor(state.aUid))).data[kind].find(item=>item.id===draft.id);assert.equal(active.status,'active');return active;
 }
 state.eventTitle='QA Fictional Café Powwow Social '+run;
 await check('EVT-01','Organization creates an event draft, publishes it, and it appears on listings and its details page with dates, time, place and link',async()=>{
  need(state.orgSlug,'organization');
  const event=await opportunity('events',async title=>{
   await a.locator('#events-title').fill(title);await a.locator('#events-eventType').selectOption('Pow Wow');await a.locator('#events-description').fill('Fictional community powwow social for isolated website QA.');
   await a.locator('#events-startDate').fill('2027-07-10');await a.locator('#events-endDate').fill('2027-07-11');await a.locator('#events-startTime').fill('10:00');await a.locator('#events-endTime').fill('18:00');
   await a.locator('#events-timeZone').selectOption('America/Regina');await a.locator('#events-province').selectOption('SK');await a.locator('#events-city').fill('Saskatoon');await a.locator('#events-venue').fill('QA Fictional Grounds');
   await a.locator('#events-rsvpLink').fill('https://example.invalid/powwow');await a.locator('#events-contactEmail').fill('events-'+run+'@example.invalid');
  },state.eventTitle);state.event=event;
  await expect.poll(async()=>(await api('GET','/api/events')).data.events.some(item=>item.id===event.id)).toBe(true);
  const guest=await newPage(1440);
  try{await guest.goto(server.base+'/events/'+event.slug);await expect(guest.getByText(state.eventTitle).first()).toBeVisible();await expect(guest.getByText(/Saskatoon/).first()).toBeVisible();
   await expect(guest.getByText(/Jul(y)? 10/).first()).toBeVisible();await expect(guest.locator('a[href="https://example.invalid/powwow"]').first()).toBeVisible();await shot(guest,'EVT-01-detail');}
  finally{await closePage(guest);}
  const detail=(await api('GET','/api/events/'+event.slug)).data.event;assert.equal(detail.startDate,'2027-07-10');assert.equal(detail.startTime,'10:00');assert.equal(detail.timeZone,'America/Regina');
 });
 await check('EVT-02','Organization edits and then closes its event; closed events leave public listings',async()=>{
  need(state.event,'published event');await a.goto(server.base+'/org/dashboard/events');
  await a.getByRole('button',{name:'Edit '+state.eventTitle}).click();state.eventTitle2=state.eventTitle+' (updated)';await a.locator('#events-title').fill(state.eventTitle2);
  await a.getByRole('button',{name:'Review listing',exact:true}).click();await a.getByRole('button',{name:'Publish changes',exact:true}).click();
  await expect.poll(async()=>(await api('GET','/api/events/'+state.event.slug)).data.event?.title).toBe(state.eventTitle2);
  await a.getByRole('button',{name:/Close listing/}).first().click();await expect(a.getByText(/Listing closed and removed from public view/)).toBeVisible();
  await expect.poll(async()=>(await api('GET','/api/events')).data.events.some(item=>item.id===state.event.id)).toBe(false);
 });
 state.scholarshipTitle='QA Fictional Café Culinary Bursary '+run;
 await check('SCH-01','Organization creates and publishes a scholarship with eligibility, deadline and application link; it appears on listings and details',async()=>{
  need(state.orgSlug,'organization');
  const scholarship=await opportunity('scholarships',async title=>{
   await a.locator('#scholarships-title').fill(title);await a.locator('#scholarships-category').selectOption('Bursary');await a.locator('#scholarships-description').fill('Fictional culinary bursary for isolated website QA.');
   await a.locator('#scholarships-amount').fill('$1,500');await a.locator('#scholarships-deadlineType').selectOption('date');await a.locator('#scholarships-deadline').fill('2027-05-31');
   await a.locator('#scholarships-eligibility').fill('Fictional applicants enrolled in a culinary program.');await a.locator('#scholarships-applicationUrl').fill('https://example.invalid/bursary');
   await a.locator('#scholarships-applicationInstructions').fill('Send a short statement.');
  },state.scholarshipTitle);state.scholarship=scholarship;
  await expect.poll(async()=>(await api('GET','/api/scholarships')).data.scholarships.some(item=>item.id===scholarship.id)).toBe(true);
  const guest=await newPage(1440);
  try{await guest.goto(server.base+'/scholarships/'+scholarship.slug);await expect(guest.getByText(state.scholarshipTitle).first()).toBeVisible();
   await expect(guest.getByText(/culinary program/).first()).toBeVisible();await expect(guest.locator('a[href="https://example.invalid/bursary"]').first()).toBeVisible();await shot(guest,'SCH-01-detail');}
  finally{await closePage(guest);}
  const detail=(await api('GET','/api/scholarships/'+scholarship.slug)).data.scholarship;assert.equal(detail.deadline,'2027-05-31');assert.equal(detail.amount,'$1,500');
 });
 await check('SCH-02','Organization edits and closes its scholarship; closed scholarships leave public listings',async()=>{
  need(state.scholarship,'published scholarship');await a.goto(server.base+'/org/dashboard/scholarships');
  await a.getByRole('button',{name:'Edit '+state.scholarshipTitle}).click();await a.locator('#scholarships-amount').fill('$2,000');
  await a.getByRole('button',{name:'Review listing',exact:true}).click();await a.getByRole('button',{name:'Publish changes',exact:true}).click();
  await expect.poll(async()=>(await api('GET','/api/scholarships/'+state.scholarship.slug)).data.scholarship?.amount).toBe('$2,000');
  await a.getByRole('button',{name:/Close listing/}).first().click();await expect(a.getByText(/Listing closed and removed from public view/)).toBeVisible();
  await expect.poll(async()=>(await api('GET','/api/scholarships')).data.scholarships.some(item=>item.id===state.scholarship.id)).toBe(false);
 });

 // ── Permissions: server/API and data rules, not just hidden buttons ──────
 await check('PERM-01','Logged-out visitors cannot perform protected actions',async()=>{
  const statuses={};
  for(const [method,route,body] of [['POST','/api/employer/events',{title:'x',requestId:crypto.randomUUID()}],['POST','/api/employer/scholarships',{title:'x',requestId:crypto.randomUUID()}],['POST','/api/employer/jobs',{title:'x'}],['PUT','/api/employer/profile',{name:'x'}],['POST','/api/applications',{postId:state.cJob1}],['GET','/api/employer/applications'],['POST','/api/employer/upgrade',{name:'x',type:'employer'}]]){
   const r=await api(method,route,null,body);statuses[method+' '+route]=r.status;assert.equal(r.status,401,method+' '+route);
  }
  return statuses;
 });
 await check('PERM-02','An individual cannot publish jobs, events, scholarships or business listings through direct URLs or API requests',async()=>{
  const tokenB=await tokenFor(state.b.uid);const statuses={};
  for(const [method,route,body] of [['POST','/api/employer/events',{title:'QA Fictional personal event',status:'active',requestId:crypto.randomUUID()}],['POST','/api/employer/scholarships',{title:'QA Fictional personal bursary',status:'active',requestId:crypto.randomUUID()}],['POST','/api/employer/jobs',{title:'QA Fictional personal job',status:'active'}],['POST','/api/employer/business-review',{revision:1}]]){
   const r=await api(method,route,tokenB,body);statuses[method+' '+route]=r.status;assert.equal(r.status,403,method+' '+route+' '+JSON.stringify(r.data));
  }
  for(const collection of ['events','scholarships','jobs','posts','organizations']){
   const r=await fetch(`http://127.0.0.1:8080/v1/projects/demo-iopps-preview/databases/(default)/documents/${collection}?documentId=${prefix}-direct-${collection}`,{method:'POST',headers:{Authorization:'Bearer '+tokenB,'Content-Type':'application/json'},body:JSON.stringify({fields:{title:{stringValue:'QA Fictional direct write'},orgId:{stringValue:state.b.uid},status:{stringValue:'active'}}})});
   statuses['firestore '+collection]=r.status;assert.equal(r.status,403,'direct client write to '+collection);
  }
  const b=await newPage(1440);
  try{await login(b,state.b.email);for(const kind of ['events','scholarships']){await b.goto(server.base+`/org/dashboard/${kind}/new`);await b.waitForURL(url=>url.pathname==='/org/upgrade',{timeout:30000});}
   await b.goto(server.base+'/org/dashboard/jobs/new');await b.waitForURL(url=>url.pathname==='/org/upgrade',{timeout:30000});}
  finally{await closePage(b);}
  return statuses;
 });
 await check('PERM-03','One organization cannot edit or delete another organization’s events or scholarships',async()=>{
  need(state.event&&state.scholarship,'organization listings');const tokenC=await tokenFor(state.c.uid);
  for(const [kind,item] of [['events',state.event],['scholarships',state.scholarship]]){
   const current=(await api('GET','/api/employer/'+kind,await tokenFor(state.aUid))).data[kind].find(x=>x.id===item.id);
   assert.equal((await api('PATCH','/api/employer/'+kind,tokenC,{id:item.id,revision:current.revision,status:'active',title:'Hijacked'})).status,404);
   assert.equal((await api('DELETE','/api/employer/'+kind,tokenC,{id:item.id,revision:current.revision,confirmDelete:true})).status,404);
   assert.equal((await api('GET','/api/employer/'+kind,tokenC)).data[kind].some(x=>x.id===item.id),false);
  }
 });
 await check('PERM-04','Removing a team member removes organization access without affecting their personal account',async()=>{
  need(state.orgSlug,'organization');const member=await fixtureUser('team-member');
  for(const collection of ['users','members'])await db.doc(`${collection}/${member.uid}`).set({orgId:state.aUid,orgRole:'admin'},{merge:true});
  assert.equal((await api('GET','/api/employer/events',await tokenFor(member.uid))).status,200);
  const removed=await api('PATCH','/api/employer/team',await tokenFor(state.aUid),{uid:member.uid,role:'remove'});assert.equal(removed.status,200,JSON.stringify(removed.data));
  const fresh=await tokenFor(member.uid);assert.equal((await api('GET','/api/employer/events',fresh)).status,403);
  assert.equal((await api('GET','/api/applications',fresh)).status,200,'personal account still works');
 });

 // ── University / program posting is not offered ──────────────────────────
 await check('PRG-01','School/program pages redirect, program APIs are retired, and school organizations cannot be created',async()=>{
  const redirects={};
  for(const route of ['/programs','/programs/qa-fictional','/schools','/schools/qa-fictional','/education']){const r=await api('GET',route);redirects[route]=r.status+' '+r.location;assert.equal(r.status,307);assert.match(r.location,/\/opportunities-update$/);}
  for(const route of ['/api/programs','/api/schools','/api/schools/qa-fictional']){const r=await api('GET',route);assert.equal(r.status,410);assert.equal(r.data.code,'ENDPOINT_RETIRED');}
  const fresh=await fixtureUser('school-attempt');const token=await tokenFor(fresh.uid);
  assert.equal((await api('POST','/api/employer/upgrade',token,{name:'QA Fictional University',type:'school'})).status,400);
  assert.equal((await api('POST','/api/employer/signup',token,{name:'QA Fictional University',type:'school',contactName:'QA',contactEmail:fresh.email})).status,400);
  assert.equal((await db.doc('organizations/'+fresh.uid).get()).exists,false);
  const guest=await newPage(1440);try{await guest.goto(server.base+'/programs');await guest.waitForURL(url=>url.pathname==='/opportunities-update');await expect(guest.getByText(/school and program directories are no longer available/i)).toBeVisible();}finally{await closePage(guest);}
  return redirects;
 });
 await check('PRG-02','The organization create menu offers jobs, scholarships and events only',async()=>{
  need(state.orgSlug,'organization');const phone=await newPage(390);
  try{await login(phone,state.aEmail);await phone.goto(server.base+'/org/dashboard');await phone.getByRole('button',{name:'Create',exact:true}).filter({visible:true}).first().click();
   for(const label of ['Post a Job','Post a Scholarship','Post an Event'])await expect(phone.getByText(label,{exact:true}).first()).toBeVisible();
   for(const option of ['Create a job posting','Offer a scholarship opportunity','Share an upcoming event'])await expect(phone.getByRole('button',{name:new RegExp(option)})).toBeVisible();await expect(phone.getByRole('button',{name:/program|school|course/i})).toHaveCount(0);await shot(phone,'PRG-02-create-menu');}
  finally{await closePage(phone);}
 });

 // ── IOPPS Live regression (no live broadcast in isolated QA) ─────────────
 await check('LIVE-01','IOPPS Live opens and stays usable at desktop and phone widths (offline state; no live stream observable)',async()=>{
  const evidence={};
  for(const width of [1440,390]){const page=await newPage(width);
   try{await page.goto(server.base+'/livestreams');await expect(page.getByRole('heading').first()).toBeVisible();await page.waitForTimeout(1500);
    assert.ok(await noHorizontalOverflow(page),'no horizontal overflow at '+width);evidence[width]={headings:(await page.getByRole('heading').allInnerTexts()).slice(0,4),iframes:await page.locator('iframe').count()};await shot(page,'LIVE-01-'+width);}
   finally{await closePage(page);}
  }
  return evidence;
 });

 // ── Phone-sized screens for the main flows ───────────────────────────────
 await check('MOB-01','Main pages fit a 390px phone screen without horizontal scrolling',async()=>{
  const phone=await newPage(390);const fits={};
  try{
   await login(phone,state.aEmail);
   for(const route of ['/jobs','/jobs/'+state.cJob2,'/events','/scholarships','/businesses','/profile','/profile/resume','/applications','/settings','/org/dashboard','/org/dashboard/jobs','/org/dashboard/applications','/org/dashboard/events','/org/dashboard/scholarships','/org/'+(state.orgSlug||'')]){
    await phone.goto(server.base+route);await phone.waitForLoadState('networkidle').catch(()=>{});await phone.waitForTimeout(500);fits[route]=await noHorizontalOverflow(phone);
    await shot(phone,'MOB-01'+route.replaceAll('/','_'));
   }
  }finally{await closePage(phone);}
  const failing=Object.entries(fits).filter(([,ok])=>!ok).map(([route])=>route);assert.deepEqual(failing,[],'pages wider than the phone screen');return fits;
 });
} finally {
 // ── Cleanup: only records and files positively identified by this run ────
 const cleanup={documents:[],storage:[],auth:[],securityCounters:null,remaining:null};
 try{
  if(browser)await browser.close();if(server){await fs.writeFile(path.join(output,'server.log'),server.getLogs());await server.stop();}
  const markers=[prefix,...uids];
  const events=[];for(const uid of uids){for(const doc of (await db.collection('signup_security_events').where('uid','==',uid).get()).docs)events.push({id:doc.id,...doc.data()});}
  cleanup.securityCounters=await restoreSignupSecurityLimits(db,securityBaseline,events);
  const matches=async()=>{const found=[];for(const collection of await db.listCollections()){for(const doc of (await collection.get()).docs){const text=doc.id+JSON.stringify(doc.data());if(markers.some(marker=>text.includes(marker)))found.push(doc.ref);}}return found;};
  for(const ref of await matches()){await db.recursiveDelete(ref);cleanup.documents.push(ref.path.replace(/qa-site-[0-9a-f]+/g,'<run>'));}
  const [files]=await bucket.getFiles();for(const file of files)if(markers.some(marker=>file.name.includes(marker))){await file.delete();cleanup.storage.push(file.name.split('/')[0]);}
  for(const uid of uids){await auth.deleteUser(uid).catch(()=>{});cleanup.auth.push('fixture-user');}
  const [after]=await bucket.getFiles();cleanup.remaining={documents:(await matches()).length,storage:after.filter(file=>markers.some(marker=>file.name.includes(marker))).length,auth:(await Promise.all([...uids].map(uid=>auth.getUser(uid).then(()=>1,()=>0)))).reduce((sum,n)=>sum+n,0)};
 }catch(error){cleanup.error=scrub(error.stack||error.message);}
 await fs.writeFile(path.join(output,'cleanup.json'),JSON.stringify({...cleanup,documentCount:cleanup.documents.length,storageCount:cleanup.storage.length,authCount:cleanup.auth.length},null,2));
 await save();await db.terminate().catch(()=>{});await deleteApp(app);
 const counts=results.reduce((acc,r)=>({...acc,[r.status]:(acc[r.status]||0)+1}),{});
 console.log('Website completion evidence:',output);console.log(JSON.stringify({counts,cleanupRemaining:cleanup.remaining,cleanupError:cleanup.error||null}));
 if(results.some(r=>r.status!=='PASS')||cleanup.error||Object.values(cleanup.remaining||{x:1}).some(Boolean))process.exitCode=1;
}

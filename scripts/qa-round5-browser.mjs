// Real built Next and Chrome; explicitly fictional demo Auth/Firestore only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {startIsolatedQaServer} from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
const out=path.resolve('reports/round5/acceptance/round5-browser');await fs.mkdir(out,{recursive:true});
const app=initializeApp({projectId:'demo-iopps-preview'},'round5-'+crypto.randomUUID());const auth=getAuth(app),db=getFirestore(app);
const docs=[],users=[],checks=[];let browser,server,page;
const password='Fictional-round5-only!';
async function record(name,extra={}){checks.push({name,status:'pass',...extra});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(checks,null,2));}
async function save(collection,id,data){const ref=db.collection(collection).doc(id);docs.push(ref);await ref.set(data);return ref;}
async function account(width,organization=false){const name='Fictional Round Five '+width;const u=await auth.createUser({email:`round5-${crypto.randomUUID()}@${organization?'mailinator.com':'example.invalid'}`,password,emailVerified:true,displayName:name});users.push(u);await save('users',u.uid,{uid:u.uid,email:u.email,displayName:name,role:'community',...(organization?{signupIntent:'organization'}:{})});return u;}
async function context(width){const c=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'});await c.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)?r.continue():r.abort();});return c;}
async function login(p,u){await p.goto(server.base+'/login');await p.getByLabel('Email address',{exact:true}).fill(u.email);await p.getByLabel('Password',{exact:true}).fill(password);await p.locator('button[type=submit]').click();await p.waitForURL(url=>url.pathname!='/login');}
try{
 server=await startIsolatedQaServer();browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1440,390]){
  const u=await account(width);const stored={uid:u.uid,displayName:u.displayName,email:u.email,community:'Fictional community',location:'Fictional town',nation:'Fictional nation',territory:'Fictional territory',languages:'Fictional languages',headline:'Fictional headline',bio:'Fictional stored biography',skills:['Writing','Testing'],interests:['jobs']};
  await save('members',u.uid,stored);const c=await context(width);page=await c.newPage();await login(page,u);await page.goto(server.base+'/setup');
  await expect(page.getByPlaceholder('e.g. Muskoday First Nation')).toHaveValue(stored.community);await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toHaveValue(stored.location);
  await page.getByPlaceholder('e.g. Saskatoon, SK').fill('Fictional revised location');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByPlaceholder('e.g. Cree, Anishinaabe, Metis')).toHaveValue(stored.nation);await expect(page.getByPlaceholder('e.g. Treaty 6, Metis Nation Region 3')).toHaveValue(stored.territory);await expect(page.getByPlaceholder('e.g. Cree, Michif, English, French')).toHaveValue(stored.languages);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByPlaceholder('e.g. Software Developer | Treaty 6')).toHaveValue(stored.headline);await expect(page.getByPlaceholder('A few words about yourself...')).toHaveValue(stored.bio);await expect(page.getByPlaceholder('e.g. Project Management, Web Development')).toHaveValue('Writing, Testing');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/profile/setup')&&r.request().method()==='POST');await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();assert.equal((await response).status(),200);await page.waitForURL('**/feed');
  assert.equal((await db.doc('users/'+u.uid).get()).data().setupComplete,true);assert.equal((await db.doc('members/'+u.uid).get()).data().location,'Fictional revised location');
  await record('setup-prefill-complete-atomic-server-readback',{width});
  await page.goto(server.base+'/logout');await expect(page.getByRole('heading',{name:'Sign out of IOPPS',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(server.base+'/');
  await login(page,u);await page.goto(server.base+'/dashboard');await page.waitForURL('**/feed');await page.goto(server.base+'/setup');await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toHaveValue('Fictional revised location');await page.screenshot({path:path.join(out,`setup-return-${width}.png`),fullPage:true});
  await record('logout-signin-dashboard-feed-and-reopen-prefilled',{width});await c.close();
 }
 const org=await account('organization',true);await save('members',org.uid,{uid:org.uid,displayName:org.displayName});const c=await context(1440);page=await c.newPage();await login(page,org);await page.waitForURL(url=>url.pathname==='/signup'&&url.searchParams.get('resume')==='organization');await record('business-intent-never-enters-individual-wizard');
 let requests=0;page.on('request',r=>{if(r.url().endsWith('/api/employer/upgrade')&&r.method()==='POST')requests++;});await page.goto(server.base+'/org/upgrade');await page.getByPlaceholder('e.g. MLT Aikins LLP').fill('Fictional Round Five Organization');await page.getByRole('button',{name:/Employer \/ Business/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'Create Organization Page →',exact:true}).click();await expect(page.getByText(/Temporary or disposable email addresses cannot be used/)).toBeVisible();assert.equal(requests,0);await page.screenshot({path:path.join(out,'organization-actionable-no-attempts.png'),fullPage:true});await record('disposable-contact-retries-spend-zero-server-attempts',{clicks:4,requests});await c.close();
 const guest=await context(390);page=await guest.newPage();const id='round5-'+crypto.randomUUID(),description='Fictional complete description for expansion. '.repeat(45).trim();await save('jobs',id,{title:'Fictional Round Five Description',employerId:id,employerName:'Fictional employer',description,active:true,status:'active',location:'Fictional town',closingDate:'2099-01-01'});await page.goto(server.base+'/jobs/'+id);const summary=page.locator('summary').filter({hasText:'Show full description'});await expect(summary).toBeVisible();await summary.focus();await page.keyboard.press('Enter');await expect(page.locator('.journey-role-description')).toBeVisible();await expect(page.locator('.journey-role-description')).toHaveText(description);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,'expanded-description-mobile.png'),fullPage:true});await record('built-mobile-description-keyboard-expand-full-text');await guest.close();
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({message:String(error.message),url:page.url().split('?')[0],body:await page.locator('body').innerText().catch(()=>''),serverLogs:server?.getLogs()},null,2));}throw error;}
finally{if(browser)await browser.close();if(server)await server.stop();for(const ref of docs)await ref.delete();for(const u of users){await auth.deleteUser(u.uid);await assert.rejects(()=>auth.getUser(u.uid),e=>e.code==='auth/user-not-found');}for(const ref of docs)assert.equal((await ref.get()).exists,false);await record('exact-emulator-fixtures-cleaned',{documents:docs.length,users:users.length});await deleteApp(app);}

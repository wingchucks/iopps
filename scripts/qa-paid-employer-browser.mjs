import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {startIsolatedQaServer} from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
const output=path.resolve('reports/paid-pricing/browser-employer-'+Date.now());await fs.mkdir(output,{recursive:true});
const app=initializeApp({projectId:'demo-iopps-preview'},'paid-browser-'+crypto.randomUUID()),auth=getAuth(app),db=getFirestore(app);
const users=[],refs=new Map(),results=[],errors=[],cleanup=[];let server,browser;
const remember=ref=>{refs.set(ref.path,ref);return ref;};
try {
 server=await startIsolatedQaServer();const home=os.userInfo().homedir;
 browser=await chromium.launch({...(process.platform==='win32'?{channel:'chrome'}:{}),headless:true,env:{...process.env,...(process.platform==='win32'?{USERPROFILE:home,LOCALAPPDATA:path.join(home,'AppData/Local'),APPDATA:path.join(home,'AppData/Roaming'),TEMP:process.env.TMPDIR||os.tmpdir(),TMP:process.env.TMPDIR||os.tmpdir()}:{})}});
 for(const width of [1440,390]){
  const uid='paid-browser-'+crypto.randomUUID(),email=uid+'@example.invalid',password='Fictional-emulator-only!2026';
  await auth.createUser({uid,email,password,emailVerified:true});users.push(uid);
  const identity={role:'employer',orgId:uid,employerId:uid,orgRole:'owner',displayName:'Fictional paid employer',email,setupComplete:true,onboardingComplete:true};
  for(const col of ['users','members'])await remember(db.doc(`${col}/${uid}`)).set(identity);
  const account={name:'Fictional paid employer',description:'A fictional emulator-only organization for paid publishing acceptance.',email,contactEmail:email,website:'https://example.invalid',type:'employer',capabilities:['post_jobs','list_business'],employerId:uid,status:'approved',onboardingComplete:true,plan:'free',subscriptionTier:'free',standardPostCredits:0,featuredPostCredits:0};
  for(const col of ['employers','organizations'])await remember(db.doc(`${col}/${uid}`)).set(account);
  const employer=db.doc(`employers/${uid}`);
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  await context.route('**/*',r=>{const u=new URL(r.request().url());return ['localhost','127.0.0.1'].includes(u.hostname)&&[new URL(server.base).port,'8080','9099'].includes(u.port)?r.continue():r.abort();});
  assert.deepEqual(await context.cookies(),[]);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try {
   await page.goto(server.base+'/login');await page.getByRole('textbox',{name:'Email address',exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign In',exact:true}).click();
   await page.waitForURL(u=>u.pathname!=='/login');
   async function draft(title){
    await page.goto(server.base+'/org/dashboard/jobs/new');
    await page.getByPlaceholder('e.g. Senior Software Developer').fill(title);
    await page.locator('select').filter({has:page.getByRole('option',{name:'Administration',exact:true})}).selectOption('Administration');
    await page.getByLabel('Province / territory',{exact:false}).selectOption('SK');
    await page.getByRole('button',{name:'Continue →',exact:true}).click();
    await page.getByPlaceholder('Describe the role, team, and what a typical day looks like...').fill('Fictional local-only paid publishing acceptance.');
    await page.getByRole('button',{name:'Continue →',exact:true}).click();
    await page.getByRole('button',{name:/Save.*Draft/i}).click();
    await expect.poll(async()=>(await db.collection('jobs').where('employerId','==',uid).where('title','==',title).get()).size).toBe(1);
    const doc=(await db.collection('jobs').where('employerId','==',uid).where('title','==',title).get()).docs[0];remember(doc.ref);remember(db.doc('posts/'+doc.id));assert.equal(doc.data().status,'draft');return doc.ref;
   }
   const standard=await draft('Fictional standard '+width);
   await page.goto(server.base+'/org/dashboard/jobs/'+standard.id+'/edit');await page.getByRole('radio',{name:'active',exact:true}).check();
   const denied=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/employer/jobs/'+standard.id&&r.request().method()==='PUT');
   await page.getByRole('button',{name:'Save Changes',exact:true}).click();assert.equal((await denied).status(),402);assert.equal((await standard.get()).data().status,'draft');
   await employer.update({standardPostCredits:1});await page.getByRole('button',{name:'Save Changes',exact:true}).click();
   await expect.poll(async()=>(await standard.get()).data().status).toBe('active');const standardData=(await standard.get()).data();assert.equal(standardData.publication.durationDays,30);assert.equal((await employer.get()).data().standardPostCredits,0);
   await page.reload();await page.locator('input[type="text"]').first().fill('Fictional edited '+width);await page.getByRole('button',{name:'Save Changes',exact:true}).click();
   await expect.poll(async()=>(await standard.get()).data().title).toBe('Fictional edited '+width);assert.equal((await standard.get()).data().expiresAt.toMillis(),standardData.expiresAt.toMillis());
   const featured=await draft('Fictional featured '+width);await employer.update({featuredPostCredits:1});
   await page.goto(server.base+'/org/dashboard/jobs/'+featured.id+'/edit');
   await page.getByRole('radio',{name:'active',exact:true}).check();await page.getByRole('checkbox',{name:'Standard listing',exact:true}).check();
   await page.locator('#featured-duration').fill('17');await page.getByRole('button',{name:'Save Changes',exact:true}).click();
   await expect.poll(async()=>(await featured.get()).data().status).toBe('active');const featuredData=(await featured.get()).data();assert.equal(featuredData.featured,true);assert.equal(featuredData.publication.durationDays,17);assert.equal((await employer.get()).data().featuredPostCredits,0);
   await page.reload();await expect(page.getByRole('radio',{name:'active',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Featured',exact:true})).toBeChecked();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:path.join(output,`${width}-featured-persisted.png`),fullPage:true});
   results.push({width,authenticated:true,draft:true,unpaidDenied:true,standard30:true,editPreservesExpiry:true,featured17:true,debitsOnce:true,noOverflow:true});
  }catch(error){await fs.writeFile(path.join(output,`${width}-failure-dom.txt`),await page.locator('body').innerText());await page.screenshot({path:path.join(output,`${width}-failure.png`),fullPage:true});throw error;}
  finally{await context.close();}
 }
 assert.deepEqual(errors,[]);
}finally{
 await browser?.close();await server?.stop();
 for(const uid of users)for(const col of ['jobs','posts'])for(const doc of (await db.collection(col).where('employerId','==',uid).get()).docs)remember(doc.ref);
 for(const ref of refs.values()){await ref.delete();const absent=!(await ref.get()).exists;cleanup.push({path:ref.path,absent});assert.equal(absent,true);}
 for(const uid of users){await auth.deleteUser(uid);await assert.rejects(auth.getUser(uid),e=>e.code==='auth/user-not-found');cleanup.push({uid,authAbsent:true});}
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,errors},null,2));await fs.writeFile(path.join(output,'cleanup.json'),JSON.stringify(cleanup,null,2));if(server)await fs.writeFile(path.join(output,'server.log'),server.getLogs());
 await db.terminate();await deleteApp(app);console.log('Paid employer evidence',output);
}

// Exact built application, fresh Google Chrome profile, demo fixtures only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {startIsolatedQaServer} from './local-qa-server.mjs';
import {goal01BrowserOptions} from './qa-goal01-browser-options.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
const out=path.resolve('reports/round6-signout/built-chrome');await fs.mkdir(out,{recursive:true});
const app=initializeApp({projectId:'demo-iopps-preview'},'round6-'+crypto.randomUUID()),auth=getAuth(app),db=getFirestore(app);
const users=[],docs=new Map(),rows=[],timeline=[],errors=[];let browser,server,proxy,page,release;
const password='Fictional-round6-only!';
async function record(name,data={}){rows.push({name,status:'pass',...data});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(rows,null,2));}
async function save(collection,id,data){const ref=db.collection(collection).doc(id);docs.set(ref.path,ref);await ref.set(data);}
async function account(kind){const u=await auth.createUser({email:`round6-${kind}-${crypto.randomUUID()}@example.invalid`,password,emailVerified:kind!=='employer',displayName:'Fictional '+kind});users.push(u);docs.set('users/'+u.uid,db.doc('users/'+u.uid));docs.set('members/'+u.uid,db.doc('members/'+u.uid));await save('users',u.uid,{uid:u.uid,email:u.email,displayName:u.displayName,role:'community',...(kind==='employer'?{signupIntent:'organization'}:{})});return u;}
async function login(p,u){await p.goto(server.base+'/login');await p.getByLabel('Email address',{exact:true}).fill(u.email);await p.getByLabel('Password',{exact:true}).fill(password);await p.locator('button[type=submit]').click();await p.waitForURL(url=>url.pathname!=='/login');}
async function persisted(p){return p.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('firebaseLocalStorageDb');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{if(!db.objectStoreNames.contains('firebaseLocalStorage'))return [];return await new Promise((resolve,reject)=>{const r=db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll();r.onsuccess=()=>resolve(r.result.filter(v=>String(v.fbase_key||'').startsWith('firebase:authUser:')).map(v=>v.value?.uid).filter(Boolean));r.onerror=()=>reject(r.error);});}finally{db.close();}});}
async function signedOut(p,c){await expect.poll(()=>persisted(p)).toEqual([]);await expect.poll(async()=> (await c.cookies()).some(c=>c.name==='__session')).toBe(false);}
try{
 server=await startIsolatedQaServer();server.base=server.base.replace('127.0.0.1','localhost');proxy=http.createServer((_,res)=>{res.writeHead(403);res.end();});proxy.on('connect',(_,s)=>s.destroy());await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 browser=await chromium.launch(goal01BrowserOptions({proxyPort:proxy.address().port,allowedPorts:[new URL(server.base).port,8080,9099,9199]}));
 const c=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});page=await c.newPage();c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 c.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/api/auth/session')timeline.push({method:r.method(),event:'request'});});c.on('response',r=>{if(new URL(r.url()).pathname==='/api/auth/session')timeline.push({method:r.request().method(),event:'response',status:r.status()});});
 const employer=await account('employer'),member=await account('member');
 await login(page,employer);await page.waitForURL(u=>u.pathname==='/signup');await expect.poll(()=>persisted(page)).toEqual([employer.uid]);
 await page.goto(server.base+'/logout');await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();await page.evaluate(()=>localStorage.setItem('round6-unrelated-preference','preserve'));
 // A second tab restores A while its session POST is deliberately held before transport.
 const second=await c.newPage();let held=false;const gate=new Promise(r=>release=r);await second.route('**/api/auth/session',async route=>{if(route.request().method()==='POST'&&!held){held=true;await gate;}await route.continue();});
 await second.goto(server.base+'/jobs');await expect.poll(()=>held).toBe(true);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect.poll(()=>persisted(page)).toEqual([]);
 assert.equal(new URL(page.url()).pathname,'/logout','confirmation cannot finish before the earlier cross-tab POST');release();await page.waitForURL(server.base+'/');await second.unrouteAll({behavior:'wait'});await signedOut(page,c);
 await record('cross-tab-held-POST-confirmed-logout-clears-cookie-and-SDK');
 for(const p of [page,second]){await p.goto(server.base+'/jobs');await signedOut(p,c);assert.doesNotMatch(await p.locator('body').innerText(),/Finish setting up your organization|Fictional employer/);await p.reload();await signedOut(p,c);}
 await page.goto(server.base+'/login');await expect(page.getByLabel('Email address',{exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>localStorage.getItem('round6-unrelated-preference')),'preserve');await record('next-jobs-navigation-reload-and-login-stay-anonymous');
 await login(page,employer);await page.waitForURL(u=>u.pathname==='/signup');await page.goto(server.base+'/verify-email');await expect(page.getByText(employer.email,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Sign out and try a different email',exact:true}).click();await expect(page.getByLabel('Email address',{exact:true})).toBeVisible();await signedOut(page,c);await page.goto(server.base+'/jobs');await signedOut(page,c);await record('try-different-email-clears-real-persistence-and-next-navigation');
 await page.goto(server.base+'/signup');await page.getByRole('button',{name:/Individual/}).click();await page.getByRole('button',{name:'Continue →',exact:true}).click();await expect(page.locator('#email')).toBeEnabled();await expect(page.locator('#email')).toHaveValue('');assert.doesNotMatch(await page.locator('body').innerText(),/already signed in/i);await record('signup-account-form-unblocked-after-signout-without-resubmit');
 await login(page,member);await page.waitForURL(u=>u.pathname==='/setup');await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toBeVisible();await page.getByPlaceholder('e.g. Saskatoon, SK').fill('Round Six Fictional Town');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByPlaceholder('e.g. Software Developer | Treaty 6').fill('Round Six Fictional Headline');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();await page.waitForURL('**/feed');
 assert.equal((await db.doc('users/'+member.uid).get()).data().setupComplete,true);assert.equal((await db.doc('members/'+member.uid).get()).data().location,'Round Six Fictional Town');assert.equal((await db.doc('members/'+member.uid).get()).data().headline,'Round Six Fictional Headline');await expect.poll(()=>persisted(second)).toEqual([member.uid]);await record('unfinished-member-completes-atomic-profile-identity-B');
 await page.goto(server.base+'/logout');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(server.base+'/');await signedOut(page,c);await login(page,member);await page.waitForURL('**/feed');await page.goto(server.base+'/setup');await page.waitForURL('**/feed');await record('completed-member-signout-signin-ordinary-setup-redirects');
 await page.goto(server.base+'/setup?edit=1');await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toHaveValue('Round Six Fictional Town');await record('explicit-setup-edit-preserves-stored-fields');
 // A failed optional Auth sync leaves a persisted member photo. Reentry must still repair it.
 await db.doc('members/'+member.uid).set({photoURL:'/icon-192.png'},{merge:true});await page.goto(server.base+'/setup');await expect(page.getByPlaceholder('e.g. Saskatoon, SK')).toHaveValue('Round Six Fictional Town');for(let i=0;i<4;i++)await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Go to My Feed',exact:true}).click();await page.waitForURL('**/feed');assert.equal((await auth.getUser(member.uid)).photoURL,'/icon-192.png');await record('completed-member-photo-sync-recovery-remains-reachable');
 await page.goto(server.base+'/verify-email');await expect.poll(()=>persisted(page)).toEqual([member.uid]);assert.doesNotMatch(await page.locator('body').innerText(),new RegExp(employer.email.replaceAll('.','\\.')));await record('verification-page-does-not-restore-employer-identity');await page.screenshot({path:path.join(out,'final-verified-member.png'),fullPage:true});
 await fs.writeFile(path.join(out,'diagnostics.json'),JSON.stringify({timeline,errors},null,2));assert.deepEqual(errors,[]);
}catch(error){rows.push({name:'browser-acceptance',status:'fail',message:error.message});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(rows,null,2));if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({message:error.message,path:new URL(page.url()).pathname,body:await page.locator('body').innerText().catch(()=>''),timeline,errors,serverLogs:server?.getLogs()},null,2));}throw error;
}finally{
 if(release)release();if(browser)await browser.close();if(server)await server.stop();if(proxy){proxy.closeAllConnections();await new Promise(r=>proxy.close(r));}
 for(const ref of docs.values())await ref.delete();for(const u of users){await auth.deleteUser(u.uid);await assert.rejects(()=>auth.getUser(u.uid),e=>e.code==='auth/user-not-found');}for(const ref of docs.values())assert.equal((await ref.get()).exists,false);await fs.writeFile(path.join(out,'cleanup.json'),JSON.stringify({documents:[...docs.keys()],users:users.map(u=>u.uid),exactReadbackAbsent:true},null,2));await deleteApp(app);
}

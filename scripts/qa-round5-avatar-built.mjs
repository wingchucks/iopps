// Built Next + demo Auth/Firestore/Storage, owned fictional fixtures only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {chromium,expect} from '@playwright/test';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {startIsolatedQaServer} from './local-qa-server.mjs';
assert.equal(process.env.GCLOUD_PROJECT,'demo-iopps-preview');
for(const [key,port] of [['FIRESTORE_EMULATOR_HOST',8080],['FIREBASE_AUTH_EMULATOR_HOST',9099],['FIREBASE_STORAGE_EMULATOR_HOST',9199]])assert.equal(process.env[key],`127.0.0.1:${port}`);
const out=path.resolve('reports/round5/acceptance/avatar-built');await fs.mkdir(out,{recursive:true});
const app=initializeApp({projectId:'demo-iopps-preview',storageBucket:'demo-iopps-preview.appspot.com'},'avatar-'+crypto.randomUUID());
const auth=getAuth(app),db=getFirestore(app),bucket=getStorage(app).bucket(),users=[],docs=[],files=[],checks=[],errors=[];
const password='Fictional-avatar-only!',png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
let server,browser,page;
async function record(name,extra={}){checks.push({name,status:'pass',...extra});await fs.writeFile(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));}
async function account(label,photoURL){const u=await auth.createUser({email:`avatar-${crypto.randomUUID()}@example.invalid`,password,emailVerified:true,displayName:label,...(photoURL?{photoURL}:{})});users.push(u);for(const collection of ['users','members']){const ref=db.doc(collection+'/'+u.uid);docs.push(ref);await ref.set({uid:u.uid,email:u.email,displayName:label,role:'community',community:label});}files.push(bucket.file('avatars/'+u.uid+'.png'));return u;}
async function login(p,u){await p.goto(server.base+'/login');await p.getByLabel('Email address',{exact:true}).fill(u.email);await p.getByLabel('Password',{exact:true}).fill(password);await p.locator('button[type=submit]').click();await p.waitForURL(url=>url.pathname!='/login');}
async function menu(p){const trigger=p.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true});await expect(trigger).toHaveCount(1);await trigger.focus();await p.keyboard.press('Enter');await expect(p.getByRole('menuitem',{name:'My Profile',exact:true})).toBeFocused();await p.keyboard.press('End');await expect(p.getByRole('menuitem',{name:'Sign Out',exact:true})).toBeFocused();await p.keyboard.press('ArrowUp');await expect(p.getByRole('menuitem',{name:'Account Settings',exact:true})).toBeFocused();await p.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(p.getByRole('menu')).toHaveCount(0);await p.keyboard.press('Space');await p.keyboard.press('Tab');await expect(p.getByRole('menu')).toHaveCount(0);await trigger.click();await expect(p.getByRole('menuitem',{name:'My Profile',exact:true})).toHaveAttribute('href','/profile');await expect(p.getByRole('menuitem',{name:'Account Settings',exact:true})).toHaveAttribute('href','/settings/account');await p.keyboard.press('Escape');}
try{
 server=await startIsolatedQaServer();browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1280,390]){
  const u=await account('Fictional Avatar '+width,width===1280?server.base+'/favicon.ico':undefined),c=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'});
  await c.route('**/*',r=>{const url=new URL(r.request().url());return url.hostname==='127.0.0.1'&&[new URL(server.base).port,'8080','9099','9199'].includes(url.port)?r.continue():r.abort();});
  page=await c.newPage();let chooser;page.on('filechooser',v=>{chooser=v;});page.on('pageerror',e=>errors.push(e.message));await login(page,u);await page.goto(server.base+'/setup');await expect(page.getByPlaceholder('e.g. Muskoday First Nation')).toHaveValue(u.displayName);
  await menu(page);await record('built-setup-menu-keyboard-destinations',{width});
  const choose=page.getByRole('button',{name:'Choose profile photo',exact:true});for(const key of ['Enter','Space']){chooser=undefined;await choose.focus();await page.keyboard.press(key);await expect.poll(()=>Boolean(chooser)).toBe(true);await chooser.setFiles([]);}
  await choose.click();await chooser.setFiles({name:'fictional.png',mimeType:'image/png',buffer:png});await expect(page.getByRole('img',{name:'Profile',exact:true})).toBeVisible();
  // Force one optional-photo transport failure only; setup POST is real and durable.
  let failures=0;await page.route('**/v0/b/demo-iopps-preview.appspot.com/o*',async r=>{if(r.request().method()==='POST'){failures++;return r.fulfill({status:403,json:{error:{code:403,message:'Fictional upload denial'}}});}return r.continue();});
  await page.getByRole('button',{name:'Skip for now',exact:true}).click();await expect(page.getByText('Your profile was saved, but your photo could not be saved. Your selected photo is still here. Please try again.',{exact:true})).toBeVisible();assert.ok(failures>0);assert.equal((await db.doc('users/'+u.uid).get()).data().setupComplete,true);assert.equal((await files.at(-1).exists())[0],false);await record('built-optional-upload-failure-keeps-durable-setup-and-selection',{width});await page.unrouteAll({behavior:'wait'});
  // Real member persistence precedes Auth sync. Deny exactly the photo update,
  // then repair after reentry (desktop) or ordinary retry (mobile).
  let syncFailures=0;await page.route('**/*',async r=>{const url=new URL(r.request().url());if(url.hostname==='127.0.0.1'&&url.port==='9099'&&url.pathname.endsWith('/accounts:update')&&r.request().method()==='POST'&&r.request().postDataJSON()?.photoUrl){syncFailures++;return r.fulfill({status:400,json:{error:{code:400,message:'INTERNAL_ERROR'}}});}return r.fallback();});
  await page.getByRole('button',{name:'Skip for now',exact:true}).click();await expect(page.getByText('Your profile and photo were saved, but your account photo could not be updated. Please try again.',{exact:true})).toBeVisible();assert.ok(syncFailures>0);const partialPhoto=(await db.doc('members/'+u.uid).get()).data().photoURL;assert.ok(partialPhoto);assert.equal((await auth.getUser(u.uid)).photoURL,u.photoURL);assert.equal((await db.doc('users/'+u.uid).get()).data().setupComplete,true);await page.unrouteAll({behavior:'wait'});if(width===1280){await page.reload();await expect(page.getByRole('button',{name:'Skip for now',exact:true})).toBeVisible();}
  await page.getByRole('button',{name:'Skip for now',exact:true}).click();await page.waitForURL('**/feed');const photo=(await db.doc('members/'+u.uid).get()).data().photoURL;assert.ok(photo);assert.equal(new URL(photo).hostname,'127.0.0.1');assert.deepEqual((await files.at(-1).download())[0],png);assert.equal((await auth.getUser(u.uid)).photoURL,photo);await record('built-auth-photo-sync-failure-retry-and-readback',{width,reentry:width===1280});
  await page.goto(server.base+'/profile');const image=page.getByRole('img',{name:u.displayName,exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(e=>e.naturalWidth)).toBeGreaterThan(0);await page.reload();await expect(image).toBeVisible();await record('built-setup-native-chooser-retry-storage-bytes-member-readback-profile-reload',{width});
  const edit=page.getByRole('button',{name:'Edit profile photo',exact:true});for(const key of ['Enter','Space']){chooser=undefined;await edit.focus();await page.keyboard.press(key);await expect.poll(()=>Boolean(chooser)).toBe(true);await chooser.setFiles([]);}await record('built-profile-native-chooser-enter-space',{width});
  // /org/plans mounts NavBar directly at both breakpoints; /jobs uses OpportunityHeader.
  await page.goto(server.base+'/org/plans');await menu(page);const navPhoto=page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).locator('img');await expect(navPhoto).toHaveAttribute('src',photo);await expect.poll(()=>navPhoto.evaluate(e=>e.naturalWidth)).toBeGreaterThan(0);await page.reload();await expect(navPhoto).toHaveAttribute('src',photo);await page.screenshot({path:path.join(out,`menu-${width}.png`),fullPage:true});await record('built-responsive-navbar-menu-photo-and-reload',{width});
  await page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).click();await page.getByRole('menuitem',{name:'Account Settings',exact:true}).click();await page.waitForURL('**/settings/account');await record('built-menu-settings-navigation',{width});
  if(width===1280){
   await page.goto(server.base+'/setup');await expect(page.getByRole('button',{name:'Choose profile photo',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Account menu',exact:true}).locator('img')).toHaveAttribute('src',photo);chooser=undefined;await page.getByRole('button',{name:'Choose profile photo',exact:true}).click();await expect.poll(()=>Boolean(chooser)).toBe(true);await chooser.setFiles({name:'held.png',mimeType:'image/png',buffer:png});
   const other=await account('Fictional Switched Avatar'),otherBefore=(await db.doc('members/'+other.uid).get()).data();let release,held;const gate=new Promise(r=>release=r),started=new Promise(r=>held=r);
   await page.route('**/v0/b/demo-iopps-preview.appspot.com/o*',async r=>{if(r.request().method()!=='POST')return r.continue();const response=await r.fetch();held();await gate;await r.fulfill({response});});
   try{
    await page.getByRole('button',{name:'Skip for now',exact:true}).click();await started;const before=(await db.doc('members/'+u.uid).get()).data();
    const tab=await c.newPage();await tab.goto(server.base+'/logout');await tab.getByRole('button',{name:'Sign out',exact:true}).click();await tab.waitForURL(server.base+'/');await login(tab,other);await tab.goto(server.base+'/setup');await expect(tab.getByPlaceholder('e.g. Muskoday First Nation')).toHaveValue(other.displayName);
    release();await page.unrouteAll({behavior:'wait'});await expect(page.getByPlaceholder('e.g. Muskoday First Nation')).toHaveValue(other.displayName);
    assert.deepEqual((await db.doc('members/'+u.uid).get()).data(),before);assert.deepEqual((await db.doc('members/'+other.uid).get()).data(),otherBefore);assert.equal((await auth.getUser(u.uid)).photoURL,photo);assert.equal((await auth.getUser(other.uid)).photoURL,undefined);await expect(page.getByRole('button',{name:'Account menu',exact:true}).locator('img')).toHaveCount(0);assert.equal(new URL(page.url()).pathname,'/setup');await tab.close();await record('built-held-upload-account-switch-no-stale-member-write-or-navigation');
   }finally{release();await page.unrouteAll({behavior:'wait'});}
  }
  await page.goto(server.base+'/setup');await expect(page.getByRole('button',{name:'Choose profile photo',exact:true})).toBeVisible();await page.getByRole('button',{name:'Account menu',exact:true}).click();await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();await page.waitForURL('**/logout');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(server.base+'/');await record('built-setup-menu-signout-completes',{width});await c.close();
 }
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({message:error.message,path:new URL(page.url()).pathname,body:await page.locator('body').innerText(),errors},null,2));}throw error;}
finally{
 if(browser)await browser.close();if(server){await fs.writeFile(path.join(out,'server.log'),server.getLogs());await server.stop();await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(Number(new URL(server.base).port),'127.0.0.1',()=>s.close(resolve));});}
 for(const file of files){await file.delete({ignoreNotFound:true});assert.equal((await file.exists())[0],false);}for(const ref of docs){await ref.delete();assert.equal((await ref.get()).exists,false);}for(const u of users){await auth.deleteUser(u.uid);await assert.rejects(()=>auth.getUser(u.uid),e=>e.code==='auth/user-not-found');}
 await fs.writeFile(path.join(out,'cleanup.json'),JSON.stringify({documents:docs.map(r=>r.path),files:files.map(f=>f.name),users:users.map(u=>u.uid),absent:true,ownedPortClosed:true},null,2));await deleteApp(app);
}

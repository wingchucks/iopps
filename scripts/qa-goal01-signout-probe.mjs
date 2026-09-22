// Diagnostic only: real built app + demo Auth; identifies Listen target owners.
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
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
// CLI credential home is deliberately separate from Chrome's OS installation.
Object.assign(process.env,{USERPROFILE:'C:/Users/natha',LOCALAPPDATA:'C:/Users/natha/AppData/Local',APPDATA:'C:/Users/natha/AppData/Roaming',PROGRAMFILES:'C:/Program Files',TMPDIR:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TEMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch',TMP:'C:/Users/natha/AppData/Local/hermes/cache/scratch'});
const out=process.env.MISSION_OUTPUT;assert.ok(out);
const id='goal01-probe-'+crypto.randomUUID(),app=initializeApp({projectId:'demo-iopps-preview'},id),auth=getAuth(app),db=getFirestore(app);
const email=id+'@example.invalid',password='Fictional-probe-only-2026!';
const events=[],errors=[],cleanup=[];let server,browser,proxy,uid,page,phase='startup',failure;
const clean=s=>String(s).replace(/([?&](?:oobCode|apiKey|token)=)[^\s&"']+/gi,'$1[REDACTED]');
const event=(name,data={})=>events.push({time:Date.now(),phase,event:name,...data});
function listenTargets(body){
 const result=[];if(!body)return result;
 for(const [key,value] of new URLSearchParams(body)){
  if(!/^req\d+___data__$/.test(key))continue;
  try{const data=JSON.parse(value);if(data.addTarget)result.push({operation:'add',targetId:data.addTarget.targetId,documents:data.addTarget.documents?.documents?.map(x=>x.split('/documents/')[1]),query:data.addTarget.query?.structuredQuery?.from});if(data.removeTarget)result.push({operation:'remove',targetId:data.removeTarget});}catch{/* No raw payload persisted. */}
 }return result;
}
try{
 uid=(await auth.createUser({email,password,emailVerified:true})).uid;
 await db.doc('users/'+uid).set({uid,email,role:'community',displayName:'Fictional Diagnostic'});
 server=await startIsolatedQaServer();server.base=server.base.replace('127.0.0.1','localhost');
 proxy=http.createServer((req,res)=>{const u=new URL(req.url);if(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)&&[new URL(server.base).port,'8080','9099','9199'].includes(u.port)){const requestId=crypto.randomUUID();const meta=()=>({requestId,path:u.pathname,reusedSocket:upstream.reusedSocket,clientAborted:req.aborted,responseDestroyed:res.destroyed,responseFinished:res.writableFinished,headersSent:res.headersSent});const upstream=http.request({protocol:'http:',hostname:'127.0.0.1',port:u.port==='8080'?8080:u.port==='9099'?9099:u.port==='9199'?9199:Number(new URL(server.base).port),path:u.pathname+u.search,agent:false,method:req.method,headers:{...req.headers,host:u.host}},reply=>{event('proxy-response',{...meta(),status:reply.statusCode,cors:reply.headers['access-control-allow-origin']||null});res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',error=>{event('proxy-error',{...meta(),code:error.code});if(!res.destroyed){event('proxy-generated-502',meta());res.writeHead(502);res.end();}});req.on('aborted',()=>{event('proxy-client-aborted',meta());upstream.destroy();});res.on('close',()=>{event('proxy-response-closed',meta());upstream.destroy();});req.pipe(upstream);return;}event('denied-external',{host:u.host,path:u.pathname});res.writeHead(403);res.end();});
 proxy.on('connect',(req,socket)=>{event('denied-connect',{host:req.url});socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');});await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 browser=await chromium.launch(goal01BrowserOptions({proxyPort:proxy.address().port,allowedPorts:[new URL(server.base).port,8080,9099,9199]}));
 for(let iteration=0;iteration<3;iteration++){
 event('iteration',{iteration});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await context.addInitScript(()=>{for(const name of ['beforeunload','pagehide'])window.addEventListener(name,()=>console.info('__goal01__'+name));});
 page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('console',m=>{if(m.type()==='warning')event('warning',{message:clean(m.text())});if(m.type()==='error')errors.push({time:Date.now(),phase,message:clean(m.text())});if(m.text().startsWith('__goal01__'))event(m.text().slice(10));});
 page.on('pageerror',e=>{errors.push({time:Date.now(),phase,pageerror:clean(e.message)});});
 page.on('request',r=>{const u=new URL(r.url());if(u.pathname.includes('Firestore/Listen'))event('listen',{method:r.method(),targets:listenTargets(r.postData())});});
 page.on('requestfailed',r=>event('requestfailed',{path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)event('http-error',{status:r.status(),path:new URL(r.url()).pathname});});
 phase='login';await page.goto(server.base+'/login');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(u=>!['/login','/verify-email'].includes(u.pathname));
 phase='menu-signout';await page.goto(server.base+'/org/plans');await page.getByRole('button',{name:'Account menu',exact:true}).filter({visible:true}).click();await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();await page.waitForURL(u=>u.pathname==='/login'||u.pathname==='/');await expect(page.getByRole('heading',{name:'Sign in to IOPPS',exact:true}).or(page.getByRole('link',{name:'Sign In',exact:true}).filter({visible:true}).first())).toBeVisible();
 await expect.poll(async()=>(await context.cookies()).some(c=>c.name==='__session'&&!!c.value)).toBe(false);
 if(iteration===0)event('sdk-after-signout',await page.evaluate(()=>{let runtime;globalThis.webpackChunk_N_E.push([[crypto.randomUUID()],{},r=>runtime=r]);const entry=Object.keys(runtime.m).find(k=>runtime.m[k].toString().includes('fictional-emulator-key'));const db=runtime(entry).db;const client=db?._firestoreClient;const describe=(o,depth=0)=>{if(!o||typeof o!=='object'||depth>3)return typeof o;return Object.fromEntries(Object.entries(o).filter(([k])=>!/(credential|auth|token|key|app)/i.test(k)).map(([k,v])=>[k,(typeof v==='object'&&v)?(depth<3?describe(v,depth+1):Object.keys(v)):typeof v]));};return {entry,dbKeys:Object.keys(db||{}),client:describe(client)};}));
 phase='same-tab-hard-navigation';event('hard-navigation');await page.goto(server.base+'/profile');await page.waitForURL(u=>u.pathname==='/login');await expect(page.getByRole('heading',{name:'Sign in to IOPPS',exact:true})).toBeVisible();
 await page.screenshot({path:path.join(out,'signout-probe.png')});
 event('flow-complete');await context.close();if(errors.length)break;
 }
}catch(e){failure=clean(e.stack);process.exitCode=1;}
finally{
 if(browser)await browser.close();
 if(proxy){proxy.closeAllConnections();await new Promise(r=>proxy.close(r));}
 if(uid){for(const collection of ['users','members','organizations','employers']){const ref=db.doc(collection+'/'+uid);await ref.delete();const absent=!(await ref.get()).exists;assert.equal(absent,true);cleanup.push({path:ref.path,absent});}await auth.deleteUser(uid);let absent=false;try{await auth.getUser(uid);}catch(e){absent=e.code==='auth/user-not-found';}assert.equal(absent,true);cleanup.push({uid,absent});}
 if(server)await server.stop();await db.terminate();await deleteApp(app);
 await fs.writeFile(path.join(out,'signout-diagnostic.json'),JSON.stringify({diagnosticOnly:true,reusedBuild:true,uid,failure,events,errors,cleanup},null,2));
 console.log(JSON.stringify({diagnosticOnly:true,output:out,errors:errors.length,flowFailed:!!failure,cleanupChecks:cleanup.length}));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createRequire} from 'node:module';
import {chromium,expect} from '@playwright/test';
import {goal01BrowserOptions} from '../scripts/qa-goal01-browser-options.mjs';

test('real AuthProvider and logout: delayed old POST cannot follow confirmed signout', async t => {
 const root=process.cwd(),require=createRequire(import.meta.url);
 const dir=fs.mkdtempSync(path.join(process.env.TMPDIR||os.tmpdir(),'round6-auth-'));
 const out=path.resolve('reports/round6-signout',process.env.ROUND6_AUTH_BASELINE?'chrome-component-red':'chrome-component-green');fs.mkdirSync(out,{recursive:true});
 const put=(n,s)=>{const f=path.join(dir,n);fs.writeFileSync(f,s);return f;};
 const firebase=put('firebase.js','exports.auth={currentUser:null};exports.getAppCheckTokenValue=async()=>null;');
 const sdk=put('sdk.js',`const {auth}=require(${JSON.stringify(firebase)});const listeners=new Set();const user=uid=>({uid,email:uid+'@example.invalid',emailVerified:false,reload:async()=>{},getIdToken:async()=>uid});
 const emit=uid=>{auth.currentUser=uid?user(uid):null;for(const fn of listeners)void fn(auth.currentUser);};
 exports.onAuthStateChanged=(_,fn)=>{listeners.add(fn);queueMicrotask(()=>fn(auth.currentUser));return()=>listeners.delete(fn)};
 exports.signOut=async()=>{localStorage.removeItem('fictional-auth');emit(null)};
 window.emitAuth=uid=>{if(uid)localStorage.setItem('fictional-auth',uid);else localStorage.removeItem('fictional-auth');emit(uid)};
 addEventListener('storage',e=>{if(e.key==='fictional-auth')emit(e.newValue)});emit(localStorage.getItem('fictional-auth'));`);
 const navigation=put('navigation.js',`exports.useRouter=()=>({replace:url=>window.navigate(url)});`);
 const link=put('link.js',`const React=require('react');module.exports=props=>React.createElement('a',props);`);
 const provider=process.env.ROUND6_AUTH_BASELINE?path.resolve(process.env.ROUND6_AUTH_BASELINE):path.join(root,'src/lib/auth-context.tsx');
 const entry=put('entry.js',`import React from 'react';import {createRoot} from 'react-dom/client';import {AuthProvider,useAuth} from ${JSON.stringify(provider)};import Logout from ${JSON.stringify(path.join(root,'src/app/logout/page.tsx'))};
 function App(){const api=useAuth();window.api=api;const [route,setRoute]=React.useState(location.pathname);window.navigate=url=>{history.pushState({},'',url);setRoute(url)};return React.createElement(React.Fragment,null,React.createElement('output',{'data-testid':'identity'},api.user?.uid||'anonymous'),route==='/logout'?React.createElement(Logout):React.createElement('h1',null,'Anonymous home'));}createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,null,React.createElement(App)));`);
 const loader=put('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
 const {webpack}=require('next/dist/compiled/webpack/webpack');
 await new Promise((resolve,reject)=>webpack({mode:'development',entry,devtool:false,output:{path:dir,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(root,'node_modules')],alias:{'next/navigation':navigation,'next/link':link,'firebase/auth':sdk,'./firebase':firebase,'@/lib/auth-context':provider,'@':path.join(root,'src')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:loader}]}},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString('errors-only'))):resolve()));
 let hold=false,held;const chronology=[];
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('content-type','application/javascript');res.end(fs.readFileSync(path.join(dir,'bundle.js')));return;}if(req.url==='/api/auth/session'){const finish=()=>{if(res.writableEnded)return;chronology.push({method:req.method,event:'response'});res.setHeader('Set-Cookie',req.method==='POST'?'__session=employer-a; Path=/; HttpOnly':'__session=; Path=/; HttpOnly; Max-Age=0');res.end('{}');};chronology.push({method:req.method,event:'request'});if(hold&&req.method==='POST'){held=finish;hold=false;}else finish();return;}res.setHeader('content-type','text/html');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');});
 const deny=http.createServer((_,res)=>{res.writeHead(403);res.end();});deny.on('connect',(_,socket)=>socket.destroy());
 await new Promise(r=>server.listen(0,'127.0.0.1',r));await new Promise(r=>deny.listen(0,'127.0.0.1',r));
 let browser,page;const errors=[];let result;
 try{browser=await chromium.launch(goal01BrowserOptions({proxyPort:deny.address().port,allowedPorts:[server.address().port]}));const context=await browser.newContext({serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/logout`);await page.waitForFunction(()=>window.api?.loading===false);await page.evaluate(()=>{localStorage.setItem('unrelated-preference','preserve');window.emitAuth('employer-a')});await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
 hold=true;await page.evaluate(()=>{window.refresh=window.api.reloadUser().catch(()=>false)});await expect.poll(()=>!!held).toBe(true);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForFunction(()=>!localStorage.getItem('fictional-auth'));
 // The old refresh remains in flight; successful home navigation is premature.
 await page.waitForTimeout(100);const premature=new URL(page.url()).pathname==='/';held();await page.evaluate(()=>window.refresh);await expect(page).toHaveURL(/\/$/);
 await expect(page.getByTestId('identity')).toHaveText('anonymous');const cookies=await context.cookies();result={premature,cookiePresent:cookies.some(c=>c.name==='__session'),errors,chronology};await page.screenshot({path:path.join(out,'after-signout.png')});
 assert.equal(premature,false);assert.equal(result.cookiePresent,false);assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-preference')),'preserve');await page.reload();await page.waitForFunction(()=>window.api?.loading===false);await expect(page.getByTestId('identity')).toHaveText('anonymous');assert.deepEqual(errors,[]);
 }finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result||{errors,chronology},null,2));if(held)held();if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await new Promise(r=>deny.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});

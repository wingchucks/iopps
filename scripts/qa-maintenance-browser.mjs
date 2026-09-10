import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';import {startIsolatedQaServer} from './local-qa-server.mjs';
const server=await startIsolatedQaServer({maintenanceMode:'paused'});let browser;
try {
 browser=await chromium.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===server.base?route.continue():route.abort());
 const page=await context.newPage();assert.equal((await page.goto(server.base)).status(),503);
 await page.evaluate(async()=>{await caches.open('unrelated-cache');await caches.open('iopps-v2');const text=document.createElement('textarea');text.id='unsaved-draft';text.value='Fictional unsaved application draft';document.body.append(text);await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const result=await page.evaluate(async()=>({keys:await caches.keys(),draft:document.querySelector('#unsaved-draft').value,status:(await fetch('/api/applications',{method:'POST'})).status}));
 assert.ok(result.keys.includes('unrelated-cache'));assert.ok(!result.keys.includes('iopps-v2'));assert.equal(result.draft,'Fictional unsaved application draft');assert.equal(result.status,503);
 await page.evaluate(()=>document.querySelector('#unsaved-draft').remove());
 const out=process.env.QA_OUTPUT_DIR;assert.ok(out);await fs.mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,'maintenance-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(out,'maintenance-desktop.png'),fullPage:true});
 console.log(JSON.stringify({status:'passed',checks:['maintenance503','worker-served-during-maintenance','owned-cache-cleanup','unrelated-cache-preserved','unsaved-field-preserved','worker-controlled-api503'],base:server.base}));
}finally{await browser?.close();await server.stop();}

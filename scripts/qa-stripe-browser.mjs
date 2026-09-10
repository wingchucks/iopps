import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='C:/Users/natha/AppData/Local/hermes/reports';
let state;const deadline=Date.now()+75000;
while(Date.now()<deadline){try{state=JSON.parse(await fs.readFile(`${root}/iopps-stripe-provider-result.json`,'utf8'));if(state.status==='failed')throw Error(state.error);if(state.status==='awaiting_test_payment')break;}catch(error){if(error.code!=='ENOENT')throw error;}await new Promise(r=>setTimeout(r,300));}
assert.equal(state?.status,'awaiting_test_payment');
assert.match(state.checkoutUrl,/^https:\/\/checkout\.stripe\.com\/.*cs_test_/);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--remote-debugging-port=9225']});
const context=await browser.newContext({serviceWorkers:'block'});
const blocked=[];
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.hostname==='iopps.ca'||url.hostname.endsWith('.iopps.ca')){
  blocked.push(url.origin+url.pathname);await fs.writeFile(`${root}/iopps-stripe-browser-blocks.json`,JSON.stringify(blocked));
  await route.fulfill({status:200,contentType:'text/html',body:'<h1>Sandbox return intercepted</h1><p>No request was sent to production IOPPS.</p>'});return;
 }
 await route.continue();
});
const page=await context.newPage();
await page.goto('https://www.iopps.ca/qa-sandbox-interception-check');
assert.equal(await page.locator('h1').innerText(),'Sandbox return intercepted');
await page.goto(state.checkoutUrl,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(4000);
await page.screenshot({path:`${root}/iopps-stripe-checkout.png`,fullPage:true});
await fs.writeFile(`${root}/iopps-stripe-checkout-dom.txt`,await page.locator('body').innerText());
console.log('Dedicated Chrome checkout opened; production-return interception verified; screenshot and text captured. CDP on loopback9225.');
await new Promise(resolve=>browser.on('disconnected',resolve));

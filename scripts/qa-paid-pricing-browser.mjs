import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium,expect} from '@playwright/test';
import {startIsolatedQaServer} from './local-qa-server.mjs';
const output=path.resolve('reports/paid-pricing/browser-public-'+Date.now());await fs.mkdir(output,{recursive:true});
const results=[],errors=[];let server,browser;
try{
 server=await startIsolatedQaServer();
 const home=os.userInfo().homedir;
 browser=await chromium.launch({...(process.platform==='win32'?{channel:'chrome'}:{}),headless:true,env:{...process.env,...(process.platform==='win32'?{USERPROFILE:home,LOCALAPPDATA:path.join(home,'AppData/Local'),APPDATA:path.join(home,'AppData/Roaming'),TEMP:process.env.TMPDIR||os.tmpdir(),TMP:process.env.TMPDIR||os.tmpdir()}:{})}});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)&&[new URL(server.base).port,'8080','9099'].includes(u.port)?route.continue():route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  assert.equal((await context.cookies()).length,0);
  await page.goto(server.base+'/pricing');
  await expect(page.getByRole('heading',{name:'Simple, Transparent Pricing'})).toBeVisible();
  await expect(page.getByText('$1,250',{exact:true})).toBeVisible();await expect(page.getByText('$2,500',{exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('$5,500');
  await page.screenshot({path:path.join(output,`${width}-annual.png`),fullPage:true});
  await page.getByRole('button',{name:'Single Job Posts',exact:true}).click();
  await expect(page.getByText('$125',{exact:true})).toBeVisible();await expect(page.getByText('$200',{exact:true})).toBeVisible();
  await expect(page.locator('body')).toContainText('30-day listing');await expect(page.locator('body')).toContainText('Choose a listing duration up to 45 days');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(output,`${width}-single.png`),fullPage:true});
  results.push({width,annual:true,single:true,noSchool:true,noOverflow:true});await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{
 await browser?.close();await server?.stop();
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({results,errors},null,2));
 if(server)await fs.writeFile(path.join(output,'server.log'),server.getLogs());
 console.log('Browser evidence',output);
}

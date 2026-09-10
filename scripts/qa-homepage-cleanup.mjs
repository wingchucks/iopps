import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:3100';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const output=process.env.QA_OUTPUT || 'test-results/homepage-cleanup';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const findings=[];
try {
 for(const width of [320,390,1440]) {
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==new URL(base).origin)return route.abort();
   if(u.pathname.startsWith('/api/'))return route.fulfill({json:{}});
   return route.continue();
  });
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  const nav=page.getByRole('navigation',{name:'Choose your next step'});
  for(const [label,href] of [['Find work','/jobs'],['Hire talent','/for-employers'],['Learn','/training'],['Events & live','/events']])assert.equal(await nav.getByRole('link',{name:label,exact:true}).getAttribute('href'),href);
  assert.equal(await page.locator('main').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`home overflow ${width}`);
  const business=page.getByRole('navigation',{name:'Indigenous business opportunities'});
  assert.equal(await business.getByRole('link',{name:'Browse Indigenous Businesses'}).getAttribute('href'),'/businesses?type=Indigenous');
  await page.screenshot({path:path.join(output,`home-${width}.png`),fullPage:true});
  await business.getByRole('link',{name:'Add Your Business Free'}).click();
  await page.getByText('Indigenous Entrepreneur Signup',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('intent'),'indigenous-business');
  await page.goto(`${base}/signup`,{waitUntil:'networkidle'});
  await page.getByText('Individual',{exact:true}).waitFor();
  await page.getByText('For people looking for jobs, training, scholarships, events, or professional connections.',{exact:true}).waitFor();
  await page.goto(`${base}/indigenous-business-spotlight`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('main').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`spotlight overflow ${width}`);
  assert.deepEqual(errors,[]);
  findings.push({width,taskLinks:'pass',guidedSignup:'pass',individualCopy:'pass',singleMain:'pass',overflow:false,pageErrors:errors});
  await context.close();
 }
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({base,findings},null,2));
 console.log(JSON.stringify({base,findings},null,2));
}finally{await browser.close();}

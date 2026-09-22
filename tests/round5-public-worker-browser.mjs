// Offline native interaction fixture; no app server, SDK, provider or live writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium} from '@playwright/test';
import {sourceModule} from './helpers/security-fixtures.mjs';
const Component=sourceModule('src/components/jobs/JobDescription.tsx').default;
const description='Complete stored words and details. '.repeat(60)+'FINAL SOURCE SENTENCE';
const markup=renderToStaticMarkup(React.createElement(Component,{description}));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const context=await browser.newContext({offline:true,serviceWorkers:'block'});
 let requests=0;
 await context.route('**/*',route=>{requests++;return route.abort()});
 const page=await context.newPage();
 const results=[];
 for(const width of [375,768,1440]) {
  await page.setViewportSize({width,height:900});
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;margin:16px;overflow-wrap:anywhere}summary{cursor:pointer}.hidden{display:none}details[open] [class~="group-open:hidden"]{display:none}details[open] [class~="group-open:inline"]{display:inline}.whitespace-pre-line{white-space:pre-line}</style><h1>Offline description interaction fixture</h1>${markup}`);
  const details=page.locator('details'), summary=page.locator('summary'), full=details.locator('p');
  assert.equal(await full.isVisible(),false);
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await full.isVisible(),true);
  assert.equal(await full.textContent(),description);
  await page.keyboard.press('Space');
  assert.equal(await full.isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  results.push({width,keyboardExpand:true,keyboardCollapse:true,fullStoredText:true,overflow:false});
 }
 assert.equal(requests,0);
 fs.writeFileSync('reports/round5-public-browser.json',JSON.stringify({scope:'Offline native details fixture, minimal CSS; not hydrated app or full theme/layout verification',requests,results},null,2));
 console.log(JSON.stringify({passed:results.length,requests,results}));
} finally {await browser.close()}

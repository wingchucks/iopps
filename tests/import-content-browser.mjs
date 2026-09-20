// Desktop presentation-only QA: no app server, Firebase, credentials or provider traffic.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from '@playwright/test';
import { sourceModule } from './helpers/security-fixtures.mjs';

const output = process.argv[2];
assert.ok(output, 'Pass an explicit evidence output directory');
mkdirSync(output, { recursive: true });
const { prepareImportedDescription } = sourceModule('src/lib/server/import-content-quality.ts');
const raw = '## Fictional partner role\n\n**Join our team** — Métis ᐃ 💚\n\n- Paid training\n- [Apply](https://example.test/jobs)\n\nSIGA �s employees\n\n&lt;img src=x onerror="window.fixtureExecuted=true"&gt;\n<script>window.fixtureExecuted=true</script>';
const patch = prepareImportedDescription(raw);
const markup = renderToStaticMarkup(React.createElement('main', null,
  React.createElement('h1', null, 'Import content QA — offline fixture'),
  React.createElement('p', null, 'Plain-text rendering contract; not a live listing or full-app test.'),
  React.createElement('section', { id: 'description', style: { whiteSpace: 'pre-wrap', lineHeight: 1.8 } }, patch.description),
  React.createElement('p', { id: 'review' }, `Review required: ${patch.importContentQuality.issues.join(', ')}`),
));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', offline: true });
  let attemptedRequests = 0;
  await context.route('**/*', route => { attemptedRequests++; return route.abort(); });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><meta charset="utf-8"><title>Offline import quality QA</title><style>body{font:18px system-ui;margin:48px;max-width:1000px}section{border:1px solid #aaa;padding:24px}</style>${markup}`);
  assert.equal(await page.locator('#description').textContent(), patch.description);
  assert.equal(await page.locator('#description img, #description script, #description svg, #description iframe, #description a').count(), 0);
  assert.equal(await page.evaluate(() => window.fixtureExecuted), undefined);
  assert.equal(attemptedRequests, 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(output, 'import-quality-desktop.png'), fullPage: true });
  console.log(JSON.stringify({ viewport: '1440x1000', requests: attemptedRequests, executableDescriptionElements: 0, reviewRequired: patch.importContentQuality.needsReview, scope: 'offline plain-text presentation contract, not hydrated app' }));
} finally { await browser.close(); }

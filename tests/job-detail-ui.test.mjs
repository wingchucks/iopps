import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import { renderToString } from 'react-dom/server';
import { Parser } from 'htmlparser2';
import ts from 'typescript';

// Render exact page JSX seams, without executing API, auth or Firebase code.
const page = fs.readFileSync('src/app/jobs/[slug]/page.tsx', 'utf8');
function compile(source) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, require(id) {
      if (id === 'react/jsx-runtime') return runtime;
      if (id === 'react') return React;
      if (id.startsWith('@/components/jobs/')) return compile(fs.readFileSync(path.join('src', id.slice(2) + '.tsx'), 'utf8'));
      throw Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}
export function renderDescription(job) {
  const jsx = page.split('{/* Description */}')[1].split('<HiringDetailsSummary')[0];
  const imports = page.split('\n').filter(line => line.includes('from "@/components/jobs/')).join('\n');
  const Component = compile(`${imports}\nexport default function Fixture({job}) { const normalizedApplicationHref=null; const shouldUseInternalApply=true; const applicationLinkProps={}; return <>${jsx}</>; }`).default;
  return renderToString(React.createElement(Component, { job }));
}
function inspect(html) {
  let text = ''; const tags = [];
  new Parser({ ontext(value) { text += value; }, onopentag(name, attrs) { tags.push({ name, attrs }); } }).end(html);
  return { text, tags };
}
let metadataHtml;
test('baseline metadata JSX renders literal spaces in SSR', () => {
  const start = page.indexOf('<div className="flex flex-wrap gap-3 text-sm text-text-sec">');
  const jsx = page.slice(start, page.indexOf('</div>', start) + 6);
  const C = compile(`export default function Fixture(){const locationLabel='Saskatoon, SK', salaryLabel='$25', closingDate='Sep 30, 2026',job={}; const jobDetailDates=()=>[{label:'Originally posted',date:'2026-09-17'},{label:'Added to IOPPS',date:'2026-09-19'}];return (${jsx});}`).default;
  const html = renderToString(React.createElement(C));
  const {text} = inspect(html);
  assert.ok(text.includes('📍 Saskatoon, SK'));
  assert.ok(text.includes('Originally posted: 2026-09-17'));
  assert.ok(text.includes('Added to IOPPS: 2026-09-19'));
  metadataHtml = html;
  console.log('Metadata SSR:', html);
});
test('excerpt keeps all supplied text and offers clearly external source details', () => {
  const description = 'A supplied description ending mid-sentence because the source';
  const { text, tags } = inspect(renderDescription({ description, externalUrl: 'https://employer.example/jobs/123' }));
  assert.ok(text.includes(description));
  const link = tags.find(t => t.name === 'a' && t.attrs.href === 'https://employer.example/jobs/123');
  assert.ok(link, 'description must offer the source details even when description is nonempty');
  assert.equal(link.attrs.target, '_blank');
  assert.match(link.attrs.rel, /noopener/);
  assert.match(text, /Read full details at source/);
  assert.match(text, /opens in a new tab/);
  assert.match(text, /may be an excerpt/);
});

for (const externalUrl of ['javascript:alert(1)', 'data:text/html,hi', 'mailto:jobs@example.test', '/jobs/123', '//evil.example/job', 'https://user:pass@example.test/job', 'not a URL', undefined]) {
  test(`source link rejects unsafe or non-web destination: ${externalUrl}`, () => {
    const description = 'The complete stored description.';
    const { text, tags } = inspect(renderDescription({ description, externalUrl }));
    assert.ok(text.includes(description));
    assert.equal(tags.filter(t => t.name === 'a').length, 0);
    assert.doesNotMatch(text, /Read full details|may be an excerpt/);
  });
}
test('safe source takes priority and safe application destination is a fallback', () => {
  const description = 'All text remains.';
  for (const job of [
    { externalUrl: 'https://source.example/job', externalApplyUrl: 'https://apply.example/job' },
    { externalUrl: 'javascript:alert(1)', externalApplyUrl: 'https://source.example/job' },
    { applicationUrl: 'https://source.example/job' },
  ]) {
    const { tags } = inspect(renderDescription({ description, ...job }));
    assert.equal(tags.find(t => t.name === 'a').attrs.href, 'https://source.example/job');
  }
});
test('long supplied description is never shortened or interpreted as HTML', () => {
  const description = 'A complete paragraph.\n'.repeat(300) + '<script>unsafe()</script> END';
  const html = renderDescription({ description });
  assert.ok(inspect(html).text.includes(description));
  assert.ok(!inspect(html).tags.some(t => t.name === 'script'));
});

test('Chrome: source access and actual CSS preserve detail text and metadata spaces', { skip: process.env.IOPPS_TEST_JOB_DETAIL_BROWSER !== 'true' }, async t => {
  const { chromium } = await import('@playwright/test');
  const { default: postcss } = await import('postcss');
  const { default: tailwind } = await import('@tailwindcss/postcss');
  const css = await postcss([tailwind()]).process(fs.readFileSync('src/app/globals.css', 'utf8'), { from: path.resolve('src/app/globals.css') });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  await context.route('**/*', route => route.abort());
  const tab = await context.newPage();
  const description = 'First paragraph with complete supplied text.\n'.repeat(100) + 'The source ends here mid-sentence';
  await tab.setContent(`<!doctype html><style>${css.css}\n${fs.readFileSync('src/app/opportunity.css', 'utf8')}</style><main class="journey-job-detail" style="max-width:700px;margin:auto"><div class="journey-role-heading">${metadataHtml}</div>${renderDescription({ description, externalUrl: 'https://source.example/job' })}</main>`);
  for (const text of ['📍 Saskatoon, SK', 'Originally posted: 2026-09-17', 'Added to IOPPS: 2026-09-19']) {
    assert.equal(await tab.getByText(text, { exact: true }).innerText(), text);
  }
  const details = tab.locator('.journey-role-description');
  assert.equal(await details.textContent(), description);
  const geometry = await details.evaluate(el => ({ clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, overflow: getComputedStyle(el).overflow, clamp: getComputedStyle(el).webkitLineClamp }));
  assert.equal(geometry.clientHeight, geometry.scrollHeight);
  assert.equal(geometry.clamp, 'none');
  assert.notEqual(geometry.overflow, 'hidden');
  await tab.keyboard.press('Tab');
  const source = tab.getByRole('link', { name: 'Read full details at source (opens in a new tab)', exact: true });
  assert.equal(await source.evaluate(el => el === document.activeElement), true);
  assert.equal(await source.getAttribute('href'), 'https://source.example/job');
  console.log('Chrome detail evidence:', JSON.stringify(geometry));
});

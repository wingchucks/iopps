import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(file, names = []) {
  const source = readFileSync(file, 'utf8') + names.map(name => `\nexports.${name} = ${name};`).join('');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: id => {
      if (id === 'react' || id === 'react/jsx-runtime') return require(id);
      if (id === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
      return {};
    },
  });
  return exports;
}

test('This is IOPPS leads to the explicit external site in a safely announced new tab', () => {
  const source = readFileSync('src/app/page.tsx', 'utf8');
  const node = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let link;
  function visit(n) {
    if (ts.isJsxElement(n) && n.children.some(child => ts.isJsxText(child) && child.text.includes('This is IOPPS'))) link = n;
    ts.forEachChild(n, visit);
  }
  visit(node);
  assert.ok(link, 'hero link exists');
  const attributes = Object.fromEntries(link.openingElement.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.text, a.initializer?.text]));
  assert.equal(attributes.href, 'https://ioppslive.com');
  assert.equal(attributes.target, '_blank');
  assert.ok(attributes.rel?.split(' ').includes('noopener'));
  assert.match(link.getText(node), /ioppslive\.com/);
  assert.match(link.getText(node), /opens in a new tab/i);
});

test('shared directory navigation preserves its route and uses Indigenous Businesses', () => {
  const navigation = load('src/lib/navigation.ts');
  // The shared registry drives NavBar and IconRailSidebar.
  const source = readFileSync('src/lib/navigation.ts', 'utf8');
  assert.match(source, /key: "businesses",\s+label: "Indigenous Businesses",\s+href: "\/businesses"/);
  for (const items of [navigation.getPublicExploreNavItems(), navigation.getMemberExploreNavItems(), navigation.getRailNavItems({ isAuthenticated: false }), navigation.getRailNavItems({ isAuthenticated: true })]) {
    const item = items.find(item => item.key === 'businesses');
    assert.equal(item?.label, 'Indigenous Businesses');
    assert.equal(item?.href, '/businesses');
  }
  assert.match(readFileSync('src/components/OpportunityHeader.tsx', 'utf8'), /\["\/businesses", "Indigenous Businesses"\]/);
});

test('remaining visual admin switches expose explicit purpose and state', () => {
  for (const [file, state, label] of [
    ['src/app/admin/moderation/[reportId]/page.tsx', 'elderToggle', 'elder-review-label'],
    ['src/app/admin/verification/[id]/page.tsx', 'elderConsultation', 'elder-completed-label'],
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.ok(source.includes('role="switch"'), file);
    assert.ok(source.includes(`aria-checked={${state}}`), file);
    assert.ok(source.includes(`aria-labelledby="${label}"`), file);
    assert.ok(source.includes(`id="${label}"`), file);
  }
  const feed = readFileSync('src/app/admin/feed-sync/[feedId]/page.tsx', 'utf8');
  assert.match(feed, /aria-labelledby="feed-active-label"/);
  assert.match(feed, /id="feed-active-label"[^>]*>Feed active/);
});

test('all canonical semantic switches outside the separately owned apply flow have explicit names and state', () => {
  const controls = [];
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { scan(file); continue; }
      if (!file.endsWith('.tsx') || file.replaceAll('\\', '/').includes('/jobs/[slug]/apply/')) continue;
      const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const attrs = new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(tree), a.initializer]));
          if (attrs.get('role')?.text === 'switch') {
            controls.push(file);
            assert.ok(attrs.has('aria-label') || attrs.has('aria-labelledby'), `Unnamed switch: ${file}`);
            assert.ok(attrs.has('aria-checked'), `Missing switch state: ${file}`);
          }
          if (node.tagName.getText(tree) === 'Toggle' && file.endsWith(path.join('admin', 'settings', 'page.tsx'))) assert.ok(attrs.has('label'), 'Admin Toggle caller must pass its visible purpose');
        }
        ts.forEachChild(node, visit);
      }
      visit(tree);
    }
  }
  scan('src');
  assert.ok(controls.length >= 8, 'Switch inventory must not silently be empty');
});

test('notification controls reference visible category/channel labels and quiet-hours purpose', () => {
  const source = readFileSync('src/app/settings/notifications/page.tsx', 'utf8');
  assert.match(source, /aria-labelledby=\{`notification-\$\{category\}-title notification-\$\{category\}-\$\{channel\}-label`\}/);
  assert.match(source, /id=\{`notification-\$\{category\}-title`\}/);
  assert.match(source, /id=\{`notification-\$\{category\}-\$\{channel\}-label`\}/);
  assert.match(source, /aria-labelledby="quiet-hours-label"/);
  assert.match(source, /id="quiet-hours-label"/);
});

test('admin settings switches expose their visible purpose and native disabled state', () => {
  const { Toggle } = load('src/app/admin/settings/page.tsx', ['Toggle']);
  const html = renderToStaticMarkup(React.createElement(Toggle, { label: 'Show Announcement', checked: true, disabled: true, onChange() {} }));
  assert.match(html, /aria-label="Show Announcement"/);
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /type="button"/);
});

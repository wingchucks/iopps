import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const notifications = require('react-hot-toast');
const toast = notifications.default;
let role = 'admin';
const source = process.env.IOPPS_TOAST_BASELINE_REF
  ? execFileSync('git', ['show', `${process.env.IOPPS_TOAST_BASELINE_REF}:src/app/admin/layout.tsx`], { encoding: 'utf8' })
  : readFileSync('src/app/admin/layout.tsx', 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText, {
  exports,
  require: id => {
    if (id === 'next/navigation') return { useRouter: () => ({ replace() {} }), usePathname: () => '/admin/conferences' };
    if (id === 'next/link') return { default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) };
    if (id === '@/components/auth/AuthProvider') return { useAuth: () => ({
      user: role ? { displayName: 'Fictional administrator', email: 'admin@example.invalid' } : null,
      role, loading: false, signOut: async () => {},
    }) };
    if (id === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
    return require(id);
  },
});

function renderLayout() {
  return renderToStaticMarkup(React.createElement(exports.default, null, React.createElement('p', null, 'Fictional admin content')));
}

for (const type of ['error', 'success']) {
  test(`admin ${type} notifications reach an escaped, accessible status renderer`, () => {
    role = 'admin';
    toast.remove();
    const message = `${type}: <img src=x onerror=fictional()>`;
    try {
      toast[type](message);
      const html = renderLayout();
      assert.match(html, /role="status"/);
      assert.match(html, /aria-live="polite"/);
      assert.ok(html.includes(`${type}: &lt;img src=x onerror=fictional()&gt;`));
      assert.ok(!html.includes('<img src=x'));
      assert.ok(html.includes('Fictional admin content'));
    } finally { toast.remove(); }
  });
}

for (const deniedRole of [null, 'community']) {
  test(`admin content and notifications remain hidden for ${deniedRole ?? 'signed-out'} sessions`, () => {
    role = deniedRole;
    toast.remove();
    try {
      toast.error('Fictional admin-only notification');
      const html = renderLayout();
      assert.ok(!html.includes('Fictional admin-only notification'));
      assert.ok(!html.includes('Fictional admin content'));
      assert.ok(html.includes('Loading admin panel...'));
    } finally { toast.remove(); }
  });
}

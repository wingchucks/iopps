import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual settings page with deterministic hooks and a fictional preferences store.
function fixture(stored, timeZone = 'America/Toronto') {
  const slots = [], pending = [], saved = [], user = { uid: 'qa-member' };
  let cursor = 0, value;
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) { slots[i] = { deps }; pending.push(fn); } },
  };
  const jsx = (type, props) => ({ type, props });
  const RealIntl = Intl;
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'a' },
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast() {} }) },
    '@/lib/useAccountContext': { useAccountContext: () => ({ loading: false, isEmployer: false }) },
    '@/lib/firestore/notificationPreferences': {
      getNotificationPreferences: async () => structuredClone(stored),
      updateNotificationPreferences: async (uid, data) => { saved.push({ uid, data: structuredClone(data) }); },
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/settings/notifications/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, console: { error() {} },
    Intl: { ...RealIntl, DateTimeFormat: (...args) => { const format = RealIntl.DateTimeFormat(...args); return { resolvedOptions: () => ({ ...format.resolvedOptions(), timeZone }) }; } },
    require: id => imports[id] || { default: id },
  });
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const Content = nodes(exports.default()).find(n => typeof n.type === 'function').type;
  const render = () => {
    for (let i = 0; i < 12; i++) { cursor = 0; value = Content(); if (!pending.length) return value; for (const effect of pending.splice(0)) effect(); }
    throw new Error('Effects did not settle');
  };
  return {
    saved, render,
    flush: async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); render(); },
    save: async () => { await nodes(value).find(n => n.type === 'button' && n.props.children === 'Save Changes').props.onClick(); },
  };
}

const categories = Object.fromEntries(['applications', 'messages', 'community', 'events', 'opportunities'].map(key => [key, { email: true, push: true, inApp: true }]));

test('saving quiet hours records the time zone the times were chosen in', async () => {
  const h = fixture({ userId: 'qa-member', categories, quietHours: { enabled: true, start: '22:00', end: '07:00' } });
  h.render(); await h.flush();
  assert.match(JSON.stringify(h.render()), /America\/Toronto/);
  await h.save();
  assert.equal(h.saved.length, 1);
  assert.deepEqual(h.saved[0].data.quietHours, { enabled: true, start: '22:00', end: '07:00', timeZone: 'America/Toronto' });
  assert.deepEqual(h.saved[0].data.categories, categories);
});

test('a later save from another device updates the saved time zone', async () => {
  const h = fixture({ userId: 'qa-member', categories, quietHours: { enabled: false, start: '22:00', end: '08:00', timeZone: 'America/Regina' } }, 'America/Vancouver');
  h.render(); await h.flush(); await h.save();
  assert.deepEqual(h.saved[0].data.quietHours, { enabled: false, start: '22:00', end: '08:00', timeZone: 'America/Vancouver' });
});

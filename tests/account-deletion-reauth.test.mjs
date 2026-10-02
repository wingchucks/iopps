import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual account settings page with deterministic hooks and a fictional Firebase Auth.
const compile = (file, extra = '') => ts.transpileModule(fs.readFileSync(file, 'utf8') + extra, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function load(file, imports, extra = '') {
  const loaded = { exports: {} };
  vm.runInNewContext(compile(file, extra), { module: loaded, exports: loaded.exports, console: { error() {} }, require: id => {
    if (id in imports) return imports[id];
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return loaded.exports;
}

function page(providers, { popupError, deleteError } = {}) {
  const calls = [], routes = [];
  const user = { uid: 'member-a', email: 'member-a@example.invalid', displayName: 'Member A', providerData: providers.map(providerId => ({ providerId })) };
  class GoogleAuthProvider { setCustomParameters(parameters) { this.parameters = parameters; } }
  const auth = {
    updateProfile: async () => {}, updatePassword: async () => {}, GoogleAuthProvider,
    EmailAuthProvider: { credential: (email, password) => ({ email, password }) },
    reauthenticateWithCredential: async (target, credential) => { calls.push(['password', target.uid, { ...credential }]); },
    reauthenticateWithPopup: async (target, provider) => { calls.push(['google', target.uid, provider instanceof GoogleAuthProvider, { ...provider.parameters }]); if (popupError) throw popupError; },
  };
  let cells = [], cursor = 0;
  const react = { useState(initial) { const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }]; } };
  const jsx = (type, props) => ({ type, props });
  const stub = { default: 'div' };
  const Content = load('src/app/settings/account/page.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, 'next/link': { default: 'a' },
    'next/navigation': { useRouter: () => ({ push: path => routes.push(path) }) },
    'firebase/auth': auth,
    '@/lib/auth-context': { useAuth: () => ({ user, signOut: async () => { calls.push(['signOut']); } }) },
    '@/lib/auth-errors': load('src/lib/auth-errors.ts', {}),
    '@/lib/toast-context': { useToast: () => ({ showToast() {} }) },
    '@/lib/firestore/members': { updateMemberProfile: async () => {}, deleteOwnAccount: async uid => { calls.push(['delete', uid]); if (deleteError) throw deleteError; } },
    '@/components/ProtectedRoute': stub, '@/components/AppShell': stub, '@/components/Card': stub, '@/components/Button': { default: 'button' },
  }, '\nexport const TestComponent = AccountContent;').TestComponent;
  const nodes = tree => tree == null || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const text = tree => nodes(tree).flatMap(node => [node.props?.children].flat()).filter(value => typeof value === 'string').join(' ');
  const render = () => { cursor = 0; return Content(); };
  const buttonNamed = label => nodes(render()).find(node => node.type === 'button' && [node.props.children].flat().join('') === label);
  return { calls, routes, render, text: () => text(render()), buttonNamed, passwords: () => nodes(render()).filter(node => node.type === 'input' && node.props.type === 'password') };
}

test('a Google-only member confirms deletion with Google instead of a password they do not have', async () => {
  const h = page(['google.com']);
  assert.equal(h.passwords().length, 0, 'no password fields for a Google-only account');
  assert.match(h.text(), /You sign in with Google/);
  h.buttonNamed('Delete My Account').props.onClick();
  assert.equal(h.passwords().length, 0);
  assert.match(h.text(), /sign in again with the Google account/);
  const confirm = h.buttonNamed('Confirm with Google & Delete');
  assert.equal(confirm.props.disabled, false);
  await confirm.props.onClick();
  assert.deepEqual(h.calls, [['google', 'member-a', true, { prompt: 'select_account' }], ['delete', 'member-a'], ['signOut']]);
  assert.deepEqual(h.routes, ['/']);
});

test('password members still confirm deletion with their password', async () => {
  for (const providers of [['password'], ['password', 'google.com']]) {
    const h = page(providers);
    h.buttonNamed('Delete My Account').props.onClick();
    const passwordFields = h.passwords();
    assert.equal(passwordFields.length, 4, 'three change-password fields and the deletion password');
    assert.equal(h.buttonNamed('Permanently Delete').props.disabled, true);
    passwordFields.find(node => node.props.placeholder === 'Your password').props.onChange({ target: { value: 'fictional-password' } });
    await h.buttonNamed('Permanently Delete').props.onClick();
    assert.deepEqual(h.calls, [['password', 'member-a', { email: 'member-a@example.invalid', password: 'fictional-password' }], ['delete', 'member-a'], ['signOut']]);
    assert.deepEqual(h.routes, ['/']);
  }
});

test('a cancelled or mismatched Google confirmation deletes nothing and explains why', async () => {
  for (const [code, expected] of [['auth/popup-closed-by-user', /Sign-in was cancelled/], ['auth/user-mismatch', /Choose the Google account you use/], ['auth/popup-blocked', /blocked the sign-in window/]]) {
    const h = page(['google.com'], { popupError: Object.assign(new Error('private provider detail'), { code }) });
    h.buttonNamed('Delete My Account').props.onClick();
    await h.buttonNamed('Confirm with Google & Delete').props.onClick();
    assert.deepEqual(h.calls.map(call => call[0]), ['google']);
    assert.match(h.text(), expected);
    assert.doesNotMatch(h.text(), /private provider detail/);
    assert.deepEqual(h.routes, []);
    assert.equal(h.buttonNamed('Confirm with Google & Delete').props.disabled, false, 'the member can retry');
  }
});

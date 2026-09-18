import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as authIntent from '../src/lib/auth-redirect.ts';

// Execute the real form handlers and effects with a deterministic hook scheduler.
// Firebase, navigation and transport stay offline; destination validation is real.
function loginHarness({ query = '', resolveAccount } = {}) {
  const cells = [], pendingEffects = [], cleanups = new Map();
  const requests = [], navigations = [];
  const account = { getIdToken: async () => 'fictional-id-token' };
  let cursor = 0, finishAuthentication;
  const authenticate = () => new Promise(resolve => { finishAuthentication = () => resolve({ user: account }); });
  const auth = { user: null, loading: false, signIn: authenticate, signInWithGoogle: authenticate,
    reloadUser: async () => true, signOut: async () => { auth.user = null; } };
  const equalDeps = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const hooks = {
    Suspense: 'suspense',
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [cells[index].value, value => { cells[index].value = typeof value === 'function' ? value(cells[index].value) : value; }];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!equalDeps(cells[index]?.deps, deps)) cells[index] = { deps, value: callback };
      return cells[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!equalDeps(cells[index]?.deps, deps)) {
        cells[index] = { deps };
        pendingEffects.push(() => { cleanups.get(index)?.(); cleanups.set(index, effect()); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const params = new URLSearchParams(query);
  const exports = {};
  const sourceRoot = process.env.IOPPS_LOGIN_BASELINE || process.cwd();
  const source = readFileSync(path.join(sourceRoot, 'src/app/login/page.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, {
    exports, AbortController,
    window: { setTimeout: () => 1, clearTimeout: () => {}, location: {
      assign: destination => navigations.push(destination), replace: destination => navigations.push(destination),
    } },
    fetch: async url => {
      requests.push(url);
      return resolveAccount ? resolveAccount(requests.length) : { ok: true, json: async () => ({ destination: '/org/dashboard' }) };
    },
    require: id => {
      if (id === 'react') return hooks;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'next/navigation') return { useSearchParams: () => params };
      if (id === 'next/link' || id === 'next/image') return { default: id };
      if (id === '@/lib/auth-context') return { useAuth: () => auth };
      if (id === '@/lib/auth-redirect') return authIntent;
      throw new Error(`Unexpected form dependency: ${id}`);
    },
  });
  const Form = exports.default().props.children.type;
  return {
    auth, account, requests, navigations,
    finishAuthentication: () => finishAuthentication(),
    render: () => { cursor = 0; return Form(); },
    flushEffects: () => { for (const run of pendingEffects.splice(0)) run(); },
    unmount: () => { for (const cleanup of cleanups.values()) cleanup?.(); cleanups.clear(); },
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function button(tree, text) {
  return nodes(tree).find(node => node.type === 'button' && String(node.props.children).includes(text));
}
const settle = () => new Promise(resolve => setImmediate(resolve));

for (const provider of ['password', 'Google']) {
  for (const publication of ['before', 'after']) {
    test(`${provider} sign-in navigates once when AuthProvider publishes ${publication} the handler resolves`, async () => {
      const h = loginHarness({ query: 'plan=tier2&redirect=%2Fjobs%2Fexample%2Fapply' });
      const tree = h.render(); h.flushEffects();
      const action = provider === 'password'
        ? nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
        : button(tree, 'Continue with Google').props.onClick();
      if (publication === 'before') {
        h.auth.user = h.account; h.render(); h.flushEffects();
      }
      h.finishAuthentication(); await action;
      if (publication === 'after') {
        assert.equal(h.navigations.length, 0, 'wait for the cookie-ready user before navigating');
        h.auth.user = h.account; h.render(); h.flushEffects();
      }
      await settle();
      assert.deepEqual(h.requests, ['/api/auth/account']);
      assert.deepEqual(h.navigations, ['/org/checkout?plan=tier2&redirect=%2Fjobs%2Fexample%2Fapply']);
      h.unmount();
    });
  }
}

test('restored sessions resolve once and explicit recovery retries a failed resolution', async () => {
  const h = loginHarness({ resolveAccount: async attempt => ({ ok: attempt > 1,
    json: async () => attempt === 1 ? { error: 'Fictional temporary failure' } : { destination: '/org/dashboard' },
  }) });
  h.auth.user = h.account; h.render(); h.flushEffects(); await settle();
  assert.equal(h.navigations.length, 0);
  const retry = button(h.render(), 'Retry secure redirect');
  assert.ok(retry, 'failed account lookup offers session recovery');
  await retry.props.onClick();
  h.render(); h.flushEffects(); await settle();
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.navigations, ['/org/dashboard']);
  h.unmount();
});

test('an unmounted or signed-out form cannot finish a pending redirect', async () => {
  for (const cancellation of ['unmount', 'signout']) {
    let finish;
    const h = loginHarness({ resolveAccount: () => new Promise(resolve => { finish = resolve; }) });
    h.auth.user = h.account; h.render(); h.flushEffects(); await settle();
    if (cancellation === 'unmount') h.unmount();
    else { h.auth.user = null; h.render(); h.flushEffects(); }
    finish({ ok: true, json: async () => ({ destination: '/org/dashboard' }) });
    await settle();
    assert.deepEqual(h.navigations, []);
    h.unmount();
  }
});

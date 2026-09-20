import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Execute the real TSX with deterministic hooks. Fibers are keyed separately:
// changing a React key unmounts the old hooks, including their effect cleanup.
function componentHarness(file, dependencies, exportName = 'default') {
  const instances = new Map(), pending = [];
  let current, cursor, used;
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const instance = current, index = cursor++;
      if (!(index in instance.cells)) instance.cells[index] = { value: typeof initial === 'function' ? initial() : initial };
      const cell = instance.cells[index];
      return [cell.value, value => {
        if (instance.mounted) cell.value = typeof value === 'function' ? value(cell.value) : value;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in current.cells)) current.cells[index] = { current: initial };
      return current.cells[index];
    },
    useEffect(effect, deps) {
      const instance = current, index = cursor++;
      if (!equalDeps(instance.cells[index]?.deps, deps)) {
        instance.cells[index] = { deps };
        pending.push(() => {
          if (!instance.mounted) return;
          instance.cleanups.get(index)?.();
          instance.cleanups.set(index, effect());
        });
      }
    },
  };
  function unmount(instance) {
    instance.mounted = false;
    for (const cleanup of instance.cleanups.values()) cleanup?.();
    instance.cleanups.clear();
  }
  const jsx = (type, props, key) => ({ type, props, key });
  const exports = {};
  const sourceRoot = process.env.IOPPS_STATE_BASELINE || process.cwd();
  const source = readFileSync(path.join(sourceRoot, file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, {
    exports, console: { error() {} },
    require: id => {
      if (id === 'react') return hooks;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id in dependencies) return dependencies[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  function renderComponent(component, props, key) {
    used.add(key);
    let instance = instances.get(key);
    if (!instance || instance.component !== component) {
      if (instance) unmount(instance);
      instance = { component, cells: [], cleanups: new Map(), mounted: true };
      instances.set(key, instance);
    }
    current = instance; cursor = 0;
    const result = component(props);
    return typeof result?.type === 'function'
      ? renderComponent(result.type, result.props, `${key}/${result.key ?? 'child'}`)
      : result;
  }
  return {
    render(props) {
      used = new Set();
      const result = renderComponent(exports[exportName], props, 'root');
      for (const [key, instance] of instances) if (!used.has(key)) { unmount(instance); instances.delete(key); }
      return result;
    },
    flushEffects() { for (const effect of pending.splice(0)) effect(); },
    unmount() { for (const instance of instances.values()) unmount(instance); instances.clear(); },
  };
}

function authHarness() {
  const base = { user: null, loading: false, signOut: async () => { base.user = null; } };
  const docs = new Map();
  const h = componentHarness('src/components/auth/AuthProvider.tsx', {
    '@/lib/auth-context': { useAuth: () => base },
    '@/lib/firebase': { db: {} },
    'firebase/firestore': { doc: (_db, _collection, uid) => uid, getDoc: uid => docs.get(uid).promise },
  }, 'useAuth');
  return { ...h, base, docs };
}
function user(uid, claims) { return { uid, getIdTokenResult: () => claims.promise }; }

test('an earlier administrator lookup cannot change the next signed-in account role', async () => {
  const h = authHarness(), first = deferred(), second = deferred();
  h.base.user = user('old-admin', first); h.render(); h.flushEffects();
  const nextUser = user('current-member', second);
  h.base.user = nextUser; h.render(); h.flushEffects();
  second.resolve({ claims: { role: 'community' } }); await settle();
  assert.equal(h.render().role, 'community');
  first.resolve({ claims: { admin: true } }); await settle();
  assert.equal(h.render().user, nextUser);
  assert.equal(h.render().role, 'community');
  h.unmount();
});

test('a new account never renders the previous resolved role while its lookup is pending', async () => {
  const h = authHarness(), first = deferred(), second = deferred();
  h.base.user = user('old-admin', first); h.render(); h.flushEffects();
  first.resolve({ claims: { admin: true } }); await settle();
  assert.equal(h.render().role, 'admin');
  h.base.user = user('new-member', second);
  const pending = h.render();
  assert.equal(pending.role, null); assert.equal(pending.loading, true);
  h.flushEffects(); second.resolve({ claims: { role: 'community' } }); await settle();
  assert.equal(h.render().role, 'community'); h.unmount();
});

test('stale Firestore fallback and signed-out lookups cannot restore an old role', async () => {
  const h = authHarness(), claims = deferred(), profile = deferred();
  h.docs.set('old-user', profile);
  h.base.user = user('old-user', claims); h.render(); h.flushEffects();
  claims.resolve({ claims: {} }); await settle();
  h.base.user = null; h.render(); h.flushEffects();
  profile.resolve({ exists: () => true, data: () => ({ role: 'admin' }) }); await settle();
  const signedOut = h.render();
  assert.equal(signedOut.role, null); assert.equal(signedOut.loading, false);
  h.unmount();
});

test('normal claim and profile roles resolve; failed sign-out does not strand loading', async () => {
  const h = authHarness(), claims = deferred(), profile = deferred();
  h.docs.set('member', profile); h.base.user = user('member', claims);
  h.render(); h.flushEffects(); claims.resolve({ claims: {} }); await settle();
  profile.resolve({ exists: () => true, data: () => ({ role: 'community' }) }); await settle();
  assert.equal(h.render().role, 'community'); assert.equal(h.render().loading, false);
  h.base.signOut = async () => { throw new Error('Fictional sign-out failure'); };
  await assert.rejects(h.render().signOut(), /Fictional/);
  assert.equal(h.render().loading, false); assert.equal(h.render().role, 'community');
  h.unmount();
});

test('a refreshed user object with the same UID invalidates prior claims and Firestore work', async () => {
  const h = authHarness(), oldClaims = deferred(), newClaims = deferred(), profile = deferred();
  h.docs.set('same-uid', profile); h.base.user = user('same-uid', oldClaims);
  h.render(); h.flushEffects(); oldClaims.resolve({ claims: {} }); await settle();
  h.base.user = user('same-uid', newClaims);
  assert.equal(h.render().role, null); assert.equal(h.render().loading, true); h.flushEffects();
  newClaims.resolve({ claims: { role: 'community' } }); await settle();
  profile.resolve({ exists: () => true, data: () => ({ role: 'admin' }) }); await settle();
  assert.equal(h.render().role, 'community'); assert.equal(h.render().loading, false); h.unmount();
});

function followHarness() {
  const auth = { user: { uid: 'viewer' } }, lookups = [], mutations = [], deltas = [];
  let mutate = async () => {}, profile = async () => ({ displayName: 'Fictional viewer' });
  const h = componentHarness('src/components/FollowButton.tsx', {
    '@/lib/auth-context': { useAuth: () => auth },
    '@/lib/firestore/members': { getMemberProfile: (...args) => profile(...args) },
    '@/lib/firestore/connections': {
      isFollowing: (uid, target) => { const result = deferred(); lookups.push({ uid, target, ...result }); return result.promise; },
      followUser: (...args) => { mutations.push(['follow', ...args]); return mutate(); },
      unfollowUser: (...args) => { mutations.push(['unfollow', ...args]); return mutate(); },
    },
  });
  return { ...h, auth, lookups, mutations, deltas,
    render: targetUserId => h.render({ targetUserId, onCountChange: delta => deltas.push(delta) }),
    setMutation: action => { mutate = action; }, setProfile: action => { profile = action; },
  };
}

test('an old target lookup cannot replace the current target follow status', async () => {
  const h = followHarness();
  h.render('first'); h.flushEffects(); h.render('second'); h.flushEffects();
  h.lookups[1].resolve(false); await settle();
  assert.equal(h.render('second').props.children, 'Follow');
  h.lookups[0].resolve(true); await settle();
  assert.equal(h.render('second').props.children, 'Follow'); h.unmount();
});

test('changing viewers clears old follow state and unauthenticated/self views have no control', async () => {
  const h = followHarness(); h.render('target'); h.flushEffects();
  h.lookups[0].resolve(true); await settle();
  assert.equal(h.render('target').props.children, 'Following');
  h.auth.user = { uid: 'another-viewer' };
  assert.equal(h.render('target').props.disabled, true); h.flushEffects();
  h.lookups[1].resolve(false); await settle();
  assert.equal(h.render('target').props.children, 'Follow');
  h.auth.user = null; assert.equal(h.render('target'), null); h.flushEffects();
  h.auth.user = { uid: 'target' }; assert.equal(h.render('target'), null); h.unmount();
});

test('follow lookup failure offers retry without performing a blind follow mutation', async () => {
  const h = followHarness(); h.render('target'); h.flushEffects();
  h.lookups[0].reject(new Error('Fictional lookup failure')); await settle();
  const retry = h.render('target'); assert.equal(retry.props.children, 'Retry follow status');
  await retry.props.onClick(); h.render('target'); h.flushEffects();
  assert.equal(h.lookups.length, 2); assert.deepEqual(h.mutations, []);
  h.lookups[1].resolve(true); await settle();
  assert.equal(h.render('target').props.children, 'Following'); h.unmount();
});

test('follow mutation is single-flight and failure restores the current target count', async () => {
  const h = followHarness(), pending = deferred(); h.setMutation(() => pending.promise);
  h.render('target'); h.flushEffects(); h.lookups[0].resolve(false); await settle();
  const action = h.render('target').props.onClick;
  const first = action(), second = action(); await settle();
  assert.equal(h.mutations.length, 1); assert.deepEqual(h.deltas, [1]);
  pending.reject(new Error('Fictional mutation failure')); await Promise.all([first, second]);
  assert.equal(h.render('target').props.children, 'Follow'); assert.deepEqual(h.deltas, [1, -1]);
  h.unmount();
});

test('an unmounted mutation cannot change the next target count', async () => {
  const h = followHarness(), pending = deferred(); h.setMutation(() => pending.promise);
  h.render('first'); h.flushEffects(); h.lookups[0].resolve(false); await settle();
  const action = h.render('first').props.onClick(); await settle();
  h.render('second'); h.flushEffects(); h.lookups[1].resolve(false); await settle();
  pending.reject(new Error('Fictional delayed failure')); await action;
  assert.deepEqual(h.deltas, [1]); assert.equal(h.render('second').props.children, 'Follow'); h.unmount();
});

test('a profile lookup finishing after unmount cannot start a follow write', async () => {
  const h = followHarness(), profile = deferred(); h.setProfile(() => profile.promise);
  h.render('first'); h.flushEffects(); h.lookups[0].resolve(false); await settle();
  const action = h.render('first').props.onClick();
  h.unmount(); profile.resolve({ displayName: 'Fictional' }); await action;
  assert.deepEqual(h.mutations, []);
});

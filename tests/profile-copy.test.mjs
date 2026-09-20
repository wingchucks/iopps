import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Isolated component/persistence seam: actual website TSX and member helpers,
// deterministic hooks and an in-memory Firestore transport. No network or auth.
const settle = () => new Promise(resolve => setImmediate(resolve));
function load(file, dependencies, extra = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console, require: id => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}
function harness(page, initial = null, count = 0) {
  let stored = initial && { ...initial }, cells = [], cursor = 0;
  const effects = [], writes = [], messages = [], routes = [];
  const user = { uid: 'fictional-profile-copy', displayName: 'Fictional Member', email: 'member@example.invalid' };
  const firestore = {
    doc: () => user.uid, serverTimestamp: () => 'fictional-time',
    getDoc: async () => ({ id: user.uid, exists: () => !!stored, data: () => stored && { ...stored } }),
    setDoc: async (_ref, data) => { writes.push(data); stored = { ...data }; },
    updateDoc: async (_ref, data) => { writes.push(data); stored = { ...stored, ...data }; },
  };
  const firebase = { auth: { currentUser: user }, db: {}, storage: {} };
  const members = load('src/lib/firestore/members.ts', {
    'firebase/firestore': firestore, '../firebase': firebase, '../salary-range': { salaryRangeError: () => null },
  });
  const hooks = {
    useState(initialValue) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = initialValue;
      return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }];
    },
    useRef(value) { const index = cursor++; return cells[index] ??= { current: value }; },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!cells[index] || !deps.every((v, i) => Object.is(v, cells[index][i]))) {
        cells[index] = deps; effects.push(fn);
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: value => routes.push(value), replace() {} }), useSearchParams: () => new URLSearchParams() },
    './destination': load('src/app/setup/destination.ts', { '@/lib/auth-redirect': load('src/lib/auth-redirect.ts', {}) }),
    'next/link': { default: 'a' }, 'firebase/storage': {}, 'firebase/auth': {},
    'firebase/firestore': firestore, '@/lib/firebase': firebase,
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: value => messages.push(value) }) },
    '@/lib/firestore/members': members,
    '@/lib/firestore/savedItems': { getSavedItems: async () => Array.from({ length: count }, (_, id) => ({ id, postType: 'job', postId: `job-${id}` })) },
    '@/lib/firestore/applications': { getApplications: async () => [] },
    '@/lib/firestore/rsvps': { getUserRSVPs: async () => [] },
    '@/lib/account-labels': { getPublicAccountTypeLabel: () => 'Member' },
    '@/lib/constants/interests': { interestOptions: [], interestLabels: {} },
  };
  for (const name of ['ProtectedRoute', 'Avatar', 'Badge', 'AppShell', 'Footer', 'Button', 'Card']) {
    dependencies[`@/components/${name}`] = { default: name === 'Button' ? 'button' : 'div' };
  }
  const inner = { setup: 'SetupWizard', profile: 'ProfileContent', saved: 'SavedContent' }[page];
  const component = load(`src/app/${page}/page.tsx`, dependencies, `\nexport const TestComponent = ${inner};`).TestComponent;
  return {
    render() { cursor = 0; return component(); },
    async flush() { for (const effect of effects.splice(0)) effect(); await settle(); },
    stored: () => stored, writes, messages, routes, members, firestore,
  };
}
function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [tree];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) { return nodes(tree).filter(value => typeof value === 'string' || typeof value === 'number').join(''); }
function button(tree, label) { return nodes(tree).find(node => node.type === 'button' && text(node) === label); }
function bioField(tree) { return nodes(tree).find(node => node.type === 'textarea'); }
async function about(h, page) {
  h.render(); await h.flush();
  if (page === 'setup') {
    button(h.render(), 'Continue').props.onClick(); button(h.render(), 'Continue').props.onClick();
  } else {
    button(h.render(), 'Edit Profile').props.onClick();
    const toggle = nodes(h.render()).find(node => node.type === 'button' && text(node).includes('About You'));
    toggle.props.onClick();
  }
  return h.render();
}
test('setup persistence failure preserves draft and step and supports retry', async () => {
  const h = harness('setup');
  bioField(await about(h, 'setup')).props.onChange({target:{value:'Preserved draft'}});
  const save = h.firestore.setDoc; h.firestore.setDoc = async () => {throw Error('fictional denial');};
  await finish(h, 'setup');
  assert.deepEqual(h.routes, []);
  assert.ok(nodes(h.render()).some(n => n.props?.role === 'alert'));
  assert.equal(button(h.render(), 'Go to My Feed').props.disabled, false);
  h.firestore.setDoc = save; await button(h.render(), 'Go to My Feed').props.onClick();
  assert.equal(h.stored().bio, 'Preserved draft'); assert.deepEqual(h.routes, ['/feed']);
});
const longBio = 'Community work, language learning, and professional experience. '.repeat(25);
async function finish(h, page) {
  if (page === 'setup') {
    button(h.render(), 'Continue').props.onClick();
    button(h.render(), 'Continue').props.onClick();
    await button(h.render(), 'Go to My Feed').props.onClick();
  } else {
    await button(h.render(), 'Save Changes').props.onClick();
  }
}
for (const page of ['setup', 'profile']) {
  for (const size of [0, 99, 100, 101, 5000]) {
    test(`${page} saves and reloads ${size} characters without truncation`, async () => {
      const value = 'a'.repeat(size);
      const h = harness(page, page === 'profile' ? { bio: longBio, community: '', location: '' } : null);
      bioField(await about(h, page)).props.onChange({ target: { value } });
      await finish(h, page);
      assert.equal(h.writes.length, 1);
      const reloaded = await h.members.getMemberProfile('fictional-profile-copy');
      assert.equal(reloaded.bio, value);
      const reopened = harness('profile', reloaded);
      assert.equal(bioField(await about(reopened, 'profile')).props.value, value);
    });
  }
}
test('setup saves an intentional edit or clearing of an existing long bio', async () => {
  for (const value of [longBio + ' Additional experience.', '']) {
    const h = harness('setup', { bio: longBio, community: '', location: '' });
    bioField(await about(h, 'setup')).props.onChange({ target: { value } });
    await finish(h, 'setup');
    assert.equal(h.stored().bio, value);
  }
});
test('a late setup prefill cannot replace newly typed bio text', async () => {
  const h = harness('setup');
  let resolve;
  h.members.getMemberProfile = () => new Promise(done => { resolve = done; });
  bioField(await about(h, 'setup')).props.onChange({ target: { value: 'My new draft' } });
  resolve({ bio: longBio });
  await settle();
  assert.equal(bioField(h.render()).props.value, 'My new draft');
});
for (const [count, expected] of [[0, '0 items saved'], [1, '1 item saved'], [2, '2 items saved']]) {
  test(`saved count is one explicitly spaced string: ${expected}`, async () => {
    const h = harness('saved', null, count);
    h.render(); await h.flush();
    const summary = nodes(h.render()).find(node => node.type === 'p' && text(node) === expected);
    assert.ok(summary);
    assert.equal(summary.props.children, expected);
  });
}
test('skipping setup before prefill finishes preserves the stored long bio', async () => {
  const h = harness('setup', { bio: longBio, community: '', location: '' });
  button(h.render(), 'Skip for now').props.onClick();
  await settle();
  assert.equal(h.writes.length, 1);
  assert.equal(h.stored().bio, longBio);
});
test('setup displays an existing long bio without changing its contents', async () => {
  const h = harness('setup', { bio: longBio, community: '', location: '' });
  const tree = await about(h, 'setup');
  assert.equal(bioField(tree).props.value, longBio);
});
for (const page of ['setup', 'profile']) {
  test(`${page} bio accepts long paste intact and announces its live character count`, async () => {
    const h = harness(page, page === 'profile' ? { bio: '', community: '', location: '' } : null);
    let tree = await about(h, page);
    bioField(tree).props.onChange({ target: { value: longBio } });
    tree = h.render();
    assert.equal(bioField(tree).props.value, longBio);
    assert.equal(bioField(tree).props.maxLength, undefined, 'No invented cap inconsistent with storage');
    assert.ok(bioField(tree).props['aria-describedby'], 'bio must reference visible character feedback');
    const counter = nodes(tree).find(node => node.props?.id === bioField(tree).props['aria-describedby']);
    assert.ok(counter, 'bio must reference visible character feedback');
    assert.equal(counter.props['aria-live'], 'polite');
    assert.equal(text(counter), `${longBio.length} characters`);
  });
}

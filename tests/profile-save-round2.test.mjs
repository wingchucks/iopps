import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
const sdkDb = getFirestore(initializeApp({ projectId: 'demo-profile-offline' }, 'profile-save-offline'));
// Validate with the actual SDK, never commit or connect.
function validateWrite(data) { writeBatch(sdkDb).update(doc(sdkDb, 'members', 'fictional'), structuredClone(data)); }

// Isolated component/persistence seam: actual website TSX and member helpers,
// deterministic hooks and an in-memory Firestore transport. No network or auth.
const settle = () => new Promise(resolve => setImmediate(resolve));
function load(file, dependencies, extra = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console, AbortController, DOMException, setTimeout, clearTimeout, require: id => {
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
    onSnapshot: (reference, _options, next, error) => {
      let active = true;
      firestore.getDoc(reference).then(snapshot => {
        if (active) next({ ...snapshot, metadata: { fromCache: false } });
      }, failure => { if (active) error(failure); });
      return () => { active = false; };
    },
    setDoc: async (_ref, data) => { writes.push(data); stored = { ...data }; },
    updateDoc: async (_ref, data) => { validateWrite(data); writes.push(data); stored = { ...stored, ...data }; },
  };
  const firebase = { auth: { currentUser: user }, db: {}, storage: {} };
  const members = load('src/lib/firestore/members.ts', {
    'firebase/firestore': firestore, '../firebase': firebase, '../salary-range': { salaryRangeError: () => null },
    './cancellable-read': load('src/lib/firestore/cancellable-read.ts', { 'firebase/firestore': firestore }),
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
    'next/navigation': { useRouter: () => ({ push: value => routes.push(value), replace() {} }) },
    'next/link': { default: 'a' }, 'firebase/storage': {}, 'firebase/auth': {},
    'firebase/firestore': firestore, '@/lib/firebase': firebase,
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: value => messages.push(value) }) },
    '@/lib/firestore/members': members,
    '@/lib/firestore/savedItems': { getSavedItems: async () => Array.from({ length: count }, (_, id) => ({ id, postType: 'job', postId: `job-${id}` })) },
    '@/lib/firestore/applications': { getApplications: async () => [] },
    '@/lib/firestore/rsvps': { getUserRSVPs: async () => [] },
    '@/lib/account-labels': { getPublicAccountTypeLabel: () => 'Member' },
    '@/lib/constants/interests': { interestOptions: [{ id: 'jobs', label: 'Jobs', desc: 'Opportunities', icon: '*' }], interestLabels: {} },
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


function section(h, name) {
  nodes(h.render()).find(n => n.type === 'button' && text(n).includes(name)).props.onClick();
}
function input(h, placeholder) { return nodes(h.render()).find(n => n.props?.placeholder === placeholder); }
const editableCases = [
  ['headline', 'Professional Headline', 'About You', 'e.g. Software Developer | Treaty 6', 'Community developer'],
  ['skillsText', 'Skills', 'About You', 'e.g. Project Management, Web Development', 'Writing, Testing'],
  ['location', 'Location', 'Identity & Heritage', 'e.g. Saskatoon, SK', 'Saskatoon, SK'],
];
for (const [field, label, group, placeholder, value] of editableCases) {
  test(`${label} failure is associated with the field and preserves edits for retry`, async () => {
    const h = harness('profile', { bio: '', community: '', location: '' });
    await about(h, 'profile');
    if (group !== 'About You') section(h, group);
    input(h, placeholder).props.onChange({ target: { value } });
    const save = h.firestore.updateDoc;
    h.firestore.updateDoc = async () => { throw { code: 'invalid-argument', message: `found in field ${field} in document members/private` }; };
    await button(h.render(), 'Save Changes').props.onClick();
    assert.match(alertText(h), new RegExp(`${label} could not be saved`));
    assert.equal(input(h, placeholder).props['aria-invalid'], true);
    assert.equal(input(h, placeholder).props['aria-describedby'], 'profile-save-error');
    assert.equal(input(h, placeholder).props.value, value);
    h.firestore.updateDoc = save;
    await button(h.render(), 'Save Changes').props.onClick();
    assert.equal(h.stored()[field], value);
  });
}
test('interest failure is associated with its group and selection survives retry', async () => {
  const h = harness('profile', { bio: '', community: '', location: '' });
  await about(h, 'profile'); section(h, 'Interests');
  nodes(h.render()).find(n => n.type === 'button' && text(n).includes('Opportunities')).props.onClick();
  const save = h.firestore.updateDoc;
  h.firestore.updateDoc = async () => { throw { code: 'invalid-argument', message: 'found in field interests in document members/private' }; };
  await button(h.render(), 'Save Changes').props.onClick();
  assert.match(alertText(h), /Interests could not be saved/);
  const group = nodes(h.render()).find(n => n.props?.role === 'group' && n.props?.['aria-label'] === 'Interests');
  assert.equal(group?.props['aria-describedby'], 'profile-save-error');
  h.firestore.updateDoc = save;
  await button(h.render(), 'Save Changes').props.onClick();
  assert.deepEqual(Array.from(h.stored().interests), ['jobs']);
});
for (const [code, expected] of [
  ['permission-denied', /not permitted/], ['unauthenticated', /Sign in again/],
  ['unavailable', /connection/], ['not-found', /setup/],
]) {
  test(`${code} offers safe recovery without blaming a field or clearing edits`, async () => {
    const h = harness('profile', { bio: '', community: '', location: '' });
    bioField(await about(h, 'profile')).props.onChange({ target: { value: 'Keep this draft' } });
    h.firestore.updateDoc = async () => { throw { code, message: 'private secret' }; };
    await button(h.render(), 'Save Changes').props.onClick();
    assert.match(alertText(h), expected);
    assert.doesNotMatch(alertText(h), /private|secret/);
    assert.equal(bioField(h.render()).props.value, 'Keep this draft');
    assert.equal(h.writes.length, 0);
  });
}

test('skills chips immediately reflect the saved parsed skills and clear together', async () => {
  const h = harness('profile', { bio: '', community: '', location: '', skills: ['Old skill'], skillsText: 'Old skill' });
  await about(h, 'profile');
  input(h, 'e.g. Project Management, Web Development').props.onChange({ target: { value: ' Writing, Testing, ' } });
  await button(h.render(), 'Save Changes').props.onClick();
  assert.deepEqual(Array.from(h.stored().skills), ['Writing', 'Testing']);
  assert.ok(nodes(h.render()).some(n => n.type === 'span' && text(n) === 'Writing'), 'saved skill chip must update without reload');
  assert.ok(!text(h.render()).includes('Old skill'));
  button(h.render(), 'Edit Profile').props.onClick(); section(h, 'About You');
  input(h, 'e.g. Project Management, Web Development').props.onChange({ target: { value: '' } });
  await button(h.render(), 'Save Changes').props.onClick();
  assert.deepEqual(Array.from(h.stored().skills), []);
  assert.ok(!nodes(h.render()).some(n => n.type === 'span' && text(n) === 'Writing'));
});

test('pending save disables resubmission and restores Save Changes on rejection', async () => {
  const h = harness('profile', { bio: '', community: '', location: '' });
  bioField(await about(h, 'profile')).props.onChange({ target: { value: 'Keep draft' } });
  let reject;
  h.firestore.updateDoc = () => new Promise((_resolve, fail) => { reject = fail; });
  const pending = button(h.render(), 'Save Changes').props.onClick();
  assert.equal(button(h.render(), 'Saving...').props.disabled, true);
  reject({ code: 'unavailable' }); await pending;
  assert.equal(button(h.render(), 'Save Changes').props.disabled, false);
  assert.equal(bioField(h.render()).props.value, 'Keep draft');
});

function alertText(h) { return nodes(h.render()).filter(n => n.props?.role === 'alert').map(text).join(''); }

test('bio rejection identifies the field safely, retains the draft, and retries', async () => {
  const h = harness('profile', { bio: '', community: '', location: '' });
  bioField(await about(h, 'profile')).props.onChange({ target: { value: 'My retained bio' } });
  const save = h.firestore.updateDoc;
  h.firestore.updateDoc = async () => { throw Object.assign(new Error('Unsupported field value (found in field bio in document members/private-user) secret-value'), { code: 'invalid-argument' }); };
  await button(h.render(), 'Save Changes').props.onClick();
  assert.match(alertText(h), /Bio.*could not be saved/);
  assert.doesNotMatch(alertText(h), /private-user|secret-value/);
  assert.equal(bioField(h.render()).props.value, 'My retained bio');
  assert.equal(bioField(h.render()).props['aria-invalid'], true);
  assert.equal(h.writes.length, 0);
  h.firestore.updateDoc = save;
  await button(h.render(), 'Save Changes').props.onClick();
  assert.equal(h.stored().bio, 'My retained bio');
  assert.equal(alertText(h), '');
});

test('64-character bio saves from a sparse member through the actual Firestore payload validator', async () => {
  const h = harness('profile', { displayName: 'Fictional Member', bio: '' });
  bioField(await about(h, 'profile')).props.onChange({ target: { value: 'b'.repeat(64) } });
  await button(h.render(), 'Save Changes').props.onClick();
  assert.equal(h.writes.length, 1, 'valid short bio must not be rejected by undefined sibling fields');
  assert.equal(h.stored().bio, 'b'.repeat(64));
  assert.equal(h.stored().community, '');
  assert.equal(h.stored().location, '');
  assert.deepEqual(h.messages, ['Profile updated']);
});

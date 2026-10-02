import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual Profile and Career Preferences pages with the actual member helpers,
// deterministic hooks and an in-memory Firestore transport. No network or auth.
const settle = () => new Promise(resolve => setImmediate(resolve));
function load(file, dependencies, extra = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console: { error() {} }, AbortController, DOMException, setTimeout, clearTimeout, require: id => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}
function harness(page, initial) {
  let stored = initial && structuredClone(initial), cells = [], cursor = 0, readFailure = null;
  const effects = [], writes = [], messages = [];
  const user = { uid: 'fictional-profile-guard', displayName: 'Fictional Member', email: 'member@example.invalid' };
  const firestore = {
    doc: () => user.uid, serverTimestamp: () => 'fictional-time',
    getDoc: async () => {
      if (readFailure) throw readFailure;
      return { id: user.uid, exists: () => !!stored, data: () => stored && structuredClone(stored) };
    },
    onSnapshot: (reference, _options, next, error) => {
      let active = true;
      firestore.getDoc(reference).then(snapshot => { if (active) next({ ...snapshot, metadata: { fromCache: false } }); }, failure => { if (active) error(failure); });
      return () => { active = false; };
    },
    updateDoc: async (_ref, data) => { writes.push(structuredClone(data)); stored = { ...stored, ...structuredClone(data) }; },
  };
  const firebase = { auth: { currentUser: user }, db: {}, storage: {} };
  const members = load('src/lib/firestore/members.ts', {
    'firebase/firestore': firestore, '../firebase': firebase, '../salary-range': load('src/lib/salary-range.ts', {}),
    './cancellable-read': load('src/lib/firestore/cancellable-read.ts', { 'firebase/firestore': firestore }),
  });
  const hooks = {
    useState(initialValue) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = initialValue;
      return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }];
    },
    useRef(value) { const index = cursor++; return cells[index] ??= { current: value }; },
    useCallback(fn, deps) { const index = cursor++; if (!cells[index] || !deps.every((v, i) => Object.is(v, cells[index].deps[i]))) cells[index] = { fn, deps }; return cells[index].fn; },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!cells[index] || !deps.every((v, i) => Object.is(v, cells[index][i]))) { cells[index] = deps; effects.push(fn); }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push() {}, replace() {} }) },
    'next/link': { default: 'a' }, 'firebase/storage': {}, '@/lib/firebase': firebase,
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: value => messages.push(value) }) },
    '@/lib/firestore/members': members,
    '@/lib/firestore/savedItems': { getSavedItems: async () => [] },
    '@/lib/firestore/applications': { getApplications: async () => [] },
    '@/lib/firestore/rsvps': { getUserRSVPs: async () => [] },
    '@/lib/account-labels': { getPublicAccountTypeLabel: () => 'Member' },
    '@/lib/constants/interests': { interestOptions: [], interestLabels: {} },
    '@/lib/salary-range': load('src/lib/salary-range.ts', {}),
    '@/lib/useAccountContext': { useAccountContext: () => ({ loading: false, isEmployer: false }) },
  };
  for (const name of ['ProtectedRoute', 'Avatar', 'Badge', 'AppShell', 'Footer', 'Button', 'Card', 'PageSkeleton']) {
    dependencies[`@/components/${name}`] = { default: name === 'Button' ? 'button' : 'div' };
  }
  const file = page === 'profile' ? 'src/app/profile/page.tsx' : 'src/app/settings/career/page.tsx';
  const component = load(file, dependencies, `\nexport const TestComponent = ${page === 'profile' ? 'ProfileContent' : 'CareerSettingsContent'};`).TestComponent;
  const h = {
    writes, messages, stored: () => stored, failReads: error => { readFailure = error; },
    render() { cursor = 0; return component(); },
    async flush() { for (let i = 0; i < 5; i++) { for (const effect of effects.splice(0)) effect(); await settle(); h.render(); } },
  };
  return h;
}
function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [tree];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
  return [tree, ...nodes(tree.props?.children)];
}
const text = tree => nodes(tree).filter(value => typeof value === 'string' || typeof value === 'number').join('');
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && text(node) === label);
const input = (tree, placeholder) => nodes(tree).find(node => node.props?.placeholder === placeholder);
const alertText = tree => nodes(tree).filter(node => node.props?.role === 'alert').map(text).join('');
const SKILLS = 'e.g. Project Management, Web Development';
const fullProfile = {
  displayName: 'Fictional Member', community: 'Fictional community', location: 'Saskatoon, SK', bio: 'Stored biography',
  nation: 'Cree', territory: 'Treaty 6', languages: 'Cree, English', headline: 'Community developer',
  skillsText: 'Excel', skills: ['Excel', 'Cree Translation'], interests: ['jobs'],
  openToWork: true, targetRoles: ['Coordinator'], salaryRange: { min: 50000, max: 60000 }, workPreference: 'hybrid',
  education: [{ school: 'Fictional College', degree: 'Diploma', field: 'Business', year: 2020 }],
};

async function openEditor(h) {
  await h.flush();
  button(h.render(), 'Edit Profile').props.onClick();
  nodes(h.render()).find(node => node.type === 'button' && text(node).includes('About You')).props.onClick();
  return h.render();
}

for (const failure of [Object.assign(new Error('Server read did not complete'), { code: 'unavailable' }), Object.assign(new Error('Missing or insufficient permissions'), { code: 'permission-denied' })]) {
  test(`profile ${failure.code} read keeps editing unavailable and retry restores the stored profile`, async () => {
    const h = harness('profile', fullProfile);
    h.failReads(failure);
    await h.flush();
    let tree = h.render();
    assert.match(alertText(tree), /Your profile could not be loaded/);
    assert.equal(button(tree, 'Edit Profile').props.disabled, true);
    button(tree, 'Edit Profile').props.onClick();
    assert.equal(nodes(h.render()).find(node => node.type === 'textarea'), undefined, 'no blank editor appears');
    assert.equal(button(h.render(), 'Save Changes'), undefined);
    assert.deepEqual(h.writes, []);
    h.failReads(null);
    button(h.render(), 'Try again').props.onClick();
    tree = await openEditor(h);
    assert.equal(alertText(tree), '');
    assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, 'Stored biography');
    await button(h.render(), 'Save Changes').props.onClick();
    for (const field of ['community', 'location', 'bio', 'nation', 'territory', 'languages', 'headline']) {
      assert.equal(h.stored()[field], fullProfile[field], `${field} survives`);
    }
  });
}

test('profile activity failures do not block editing a loaded profile', async () => {
  const h = harness('profile', fullProfile);
  const tree = await openEditor(h);
  assert.equal(alertText(tree), '');
  assert.ok(nodes(tree).find(node => node.type === 'textarea'));
});

test('skills added in Career Preferences survive saving the Profile page', async () => {
  const h = harness('profile', fullProfile);
  const tree = await openEditor(h);
  assert.equal(input(tree, SKILLS).props.value, 'Excel, Cree Translation');
  nodes(tree).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Updated biography' } });
  await button(h.render(), 'Save Changes').props.onClick();
  assert.deepEqual(h.stored().skills, ['Excel', 'Cree Translation']);
  assert.equal(h.stored().skillsText, 'Excel, Cree Translation');
  assert.equal(h.stored().bio, 'Updated biography');
  const synced = harness('profile', { ...fullProfile, skillsText: 'Excel,  Cree Translation' });
  assert.equal(input(await openEditor(synced), SKILLS).props.value, 'Excel,  Cree Translation', 'matching text keeps its own formatting');
});

test('career preferences read failure keeps saving unavailable and retry recovers', async () => {
  const h = harness('career', fullProfile);
  h.failReads(Object.assign(new Error('Server read did not complete'), { code: 'unavailable' }));
  await h.flush();
  assert.match(alertText(h.render()), /Career preferences could not be loaded/);
  assert.equal(button(h.render(), 'Save Career Preferences'), undefined);
  assert.deepEqual(h.writes, []);
  h.failReads(null);
  await button(h.render(), 'Try again').props.onClick();
  await h.flush();
  assert.equal(alertText(h.render()), '');
  await button(h.render(), 'Save Career Preferences').props.onClick();
  assert.equal(h.writes.length, 1);
  for (const field of ['openToWork', 'targetRoles', 'salaryRange', 'workPreference', 'skills', 'education']) {
    assert.deepEqual(h.stored()[field], fullProfile[field], `${field} survives`);
  }
});

test('career skills save their Profile text and comma-separated entries become separate skills', async () => {
  const h = harness('career', fullProfile);
  await h.flush();
  input(h.render(), 'e.g. Project Management').props.onChange({ target: { value: 'Writing, Editing , Excel' } });
  const [, addSkill] = nodes(h.render()).filter(node => node.type === 'button' && text(node) === 'Add'); // Target Roles, then Skills
  addSkill.props.onClick();
  await button(h.render(), 'Save Career Preferences').props.onClick();
  assert.deepEqual(h.stored().skills, ['Excel', 'Cree Translation', 'Writing', 'Editing']);
  assert.equal(h.stored().skillsText, 'Excel, Cree Translation, Writing, Editing');
  const profile = harness('profile', h.stored());
  const tree = await openEditor(profile);
  assert.equal(input(tree, SKILLS).props.value, 'Excel, Cree Translation, Writing, Editing');
  await button(profile.render(), 'Save Changes').props.onClick();
  assert.deepEqual(profile.stored().skills, ['Excel', 'Cree Translation', 'Writing', 'Editing']);
});

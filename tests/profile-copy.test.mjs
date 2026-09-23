import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Isolated component/persistence seam: actual website TSX and member helpers,
// deterministic hooks and fictional adapters. Setup executes the actual API route;
// profile/saved retain their client transport. No network or real auth/database.
const settle = () => new Promise(resolve => setImmediate(resolve));
function load(file, dependencies, extra = '', globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { AbortController, ...globals, exports, console, require: id => {
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}
function harness(page, initial = null, count = 0) {
  let stored = initial && { ...initial }, cells = [], cursor = 0;
  const effects = [], writes = [], messages = [], routes = [], aliasRequests = [];
  const user = { uid: 'fictional-profile-copy', displayName: 'Fictional Member', email: 'member@example.invalid' };
  user.getIdToken = async () => 'fictional-profile-token';
  const setupRequests = [], transactions = [];
  let account = { setupComplete: false };
  const adminDb = {
    collection: collection => ({ doc: uid => ({ collection, uid }) }),
    async beforeCommit() {},
    async runTransaction(callback) {
      const pending = [];
      await callback({
        get: async ref => {
          assert.ok(['members', 'users'].includes(ref.collection));
          assert.equal(ref.uid, user.uid);
          return { exists: ref.collection === 'users' || stored !== null, data: () => ref.collection === 'users' ? account : stored };
        },
        set: (ref, data, options) => {
          assert.equal(ref.uid, user.uid);
          assert.ok(['members', 'users'].includes(ref.collection));
          assert.equal(options.merge, true);
          pending.push({ ref, data });
        },
      });
      // Stage both writes before committing, so a failure cannot partially save.
      await adminDb.beforeCommit();
      for (const { ref, data } of pending) {
        if (ref.collection === 'members') { stored = { ...stored, ...data }; writes.push(data); }
        else account = { ...account, ...data };
      }
      transactions.push(pending);
    },
  };
  const setupRoute = page === 'setup' && load('src/app/api/profile/setup/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/api-auth': { verifyAuthToken: async req => {
      if (req.headers.get('Authorization') !== 'Bearer fictional-profile-token') {
        return { success: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
      }
      return { success: true, decodedToken: { uid: user.uid, name: user.displayName }, viewerEmail: user.email, userData: {} };
    } },
    '@/lib/access-state': load('src/lib/access-state.ts', {}),
    '@/lib/firebase-admin': { getAdminDb: () => adminDb },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'fictional-time' } },
  });
  const setupFetch = async (url, options) => {
    assert.equal(url, '/api/profile/setup');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer fictional-profile-token');
    assert.equal(options.headers['Content-Type'], 'application/json');
    const response = await setupRoute.POST(new Request(`https://fixture.invalid${url}`, options));
    setupRequests.push({ url, ...options, status: response.status });
    return response;
  };
  const firestore = {
    doc: () => user.uid, serverTimestamp: () => 'fictional-time',
    getDoc: async () => ({ id: user.uid, exists: () => !!stored, data: () => stored && { ...stored } }),
    setDoc: async (_ref, data) => { writes.push(data); stored = { ...data }; },
    updateDoc: async (_ref, data) => { writes.push(data); stored = { ...stored, ...data }; },
  };
  const firebase = { auth: { currentUser: user }, db: {}, storage: {} };
  const members = load('src/lib/firestore/members.ts', {
    'firebase/firestore': firestore, '../firebase': firebase, '../salary-range': { salaryRangeError: () => null },
    // Fictional read transport for copy/persistence tests; cancellation is covered separately.
    './cancellable-read': { getDocCancellable: ref => firestore.getDoc(ref) },
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
    'next/link': { default: 'a' }, 'firebase/storage': {}, 'firebase/auth': { updateProfile: async (target, data) => { assert.equal(target, user); Object.assign(target, data); } },
    'firebase/firestore': firestore, '@/lib/firebase': firebase,
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: value => messages.push(value) }) },
    '@/lib/firestore/members': members,
    '@/lib/profile-entries': load('src/lib/profile-entries.ts', {}),
    '@/lib/upload-file': { uploadToStorage: async () => 'https://fixture.invalid/upload.png', validateImageFile: () => null },
    '@/lib/firestore/savedItems': { getSavedItems: async () => Array.from({ length: count }, (_, id) => ({ id: `saved-${id}`, userId: user.uid, postType: 'job', postId: `job-${id}` })) },
    // Run the actual alias loader/grouping; replace only its HTTP transport.
    '@/lib/saved-job-aliases': load('src/lib/saved-job-aliases.ts', {}, '', {
      fetch: async (url, options) => {
        aliasRequests.push({ url, ...options, headers: { ...options.headers } });
        return { ok: true, json: async () => ({ aliases: [] }) };
      },
    }),
    '@/lib/firestore/applications': { getApplications: async () => [] },
    '@/lib/firestore/rsvps': { getUserRSVPs: async () => [] },
    '@/lib/account-labels': { getPublicAccountTypeLabel: () => 'Member' },
    '@/lib/constants/interests': { interestOptions: [], interestLabels: {} },
  };
  for (const name of ['ProtectedRoute', 'Avatar', 'Badge', 'AppShell', 'Footer', 'Button', 'Card', 'AccountAvatarMenu']) {
    dependencies[`@/components/${name}`] = { default: name === 'Button' ? 'button' : 'div' };
  }
  const inner = { setup: 'SetupWizard', profile: 'ProfileContent', saved: 'SavedContent' }[page];
  const component = load(`src/app/${page}/page.tsx`, dependencies, `\nexport const TestComponent = ${inner};`, page === 'setup' ? { fetch: setupFetch } : {}).TestComponent;
  return {
    render() { cursor = 0; return component(); },
    async flush() { for (const effect of effects.splice(0)) effect(); await settle(); },
    stored: () => stored, writes, messages, routes, members, firestore, aliasRequests,
    adminDb, setupRequests, transactions, account: () => account,
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
  h.adminDb.beforeCommit = async () => {throw Error('fictional denial');};
  await finish(h, 'setup');
  assert.deepEqual(h.routes, []);
  assert.ok(nodes(h.render()).some(n => n.props?.role === 'alert'));
  assert.equal(button(h.render(), 'Go to My Feed').props.disabled, false);
  assert.ok(text(h.render()).includes('Preserved draft'));
  assert.equal(h.writes.length, 0);
  assert.equal(h.account().setupComplete, false);
  assert.equal(h.setupRequests[0].status, 503);
  h.adminDb.beforeCommit = async () => {}; await button(h.render(), 'Go to My Feed').props.onClick();
  assert.equal(h.stored().bio, 'Preserved draft'); assert.deepEqual(h.routes, ['/feed']);
  assert.equal(h.account().setupComplete, true);
  assert.equal(h.transactions.length, 1);
  assert.equal(h.transactions[0].length, 2);
  assert.equal(h.setupRequests[1].status, 200);
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
test('setup withholds editing until prefill, then preserves loaded bio and intentional edits', async () => {
  const h = harness('setup', { bio: longBio });
  let resolve;
  const read = h.firestore.getDoc;
  h.firestore.getDoc = () => new Promise(done => { resolve = async () => done(await read()); });
  assertPrefillUnavailable(h);
  await h.flush();
  assertPrefillUnavailable(h);
  await resolve();
  await settle();
  button(h.render(), 'Continue').props.onClick(); button(h.render(), 'Continue').props.onClick();
  assert.equal(bioField(h.render()).props.value, longBio);
  bioField(h.render()).props.onChange({ target: { value: 'My new draft' } });
  await h.flush();
  assert.equal(bioField(h.render()).props.value, 'My new draft');
  await finish(h, 'setup');
  assert.equal(h.stored().bio, 'My new draft');
});
function assertPrefillUnavailable(h) {
  const tree = h.render();
  assert.ok(nodes(tree).some(n => n.props?.role === 'status'));
  assert.ok(!nodes(tree).some(n => ['input', 'textarea'].includes(n.type) && !n.props.disabled));
  for (const label of ['Continue', 'Skip for now', 'Go to My Feed']) {
    const control = button(tree, label);
    assert.ok(!control || control.props.disabled, `${label} must be unavailable before prefill`);
  }
  assert.equal(h.setupRequests.length, 0);
  assert.equal(h.writes.length, 0);
}
for (const [count, expected] of [[0, '0 items saved'], [1, '1 item saved'], [2, '2 items saved']]) {
  test(`saved count is one explicitly spaced string: ${expected}`, async () => {
    const h = harness('saved', null, count);
    h.render(); await h.flush();
    const summary = nodes(h.render()).find(node => node.type === 'p' && text(node) === expected);
    assert.ok(summary);
    assert.equal(summary.props.children, expected);
    assert.deepEqual(h.aliasRequests, count === 0 ? [] : [{
      url: '/api/jobs/aliases', method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from({ length: count }, (_, id) => `job-${id}`) }),
      cache: 'no-store',
    }]);
  });
}
test('Skip is unavailable before prefill and afterwards preserves the stored long bio', async () => {
  const h = harness('setup', { bio: longBio, community: '', location: '' });
  assertPrefillUnavailable(h);
  await h.flush();
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
test('setup prefill failure keeps editing unavailable and retry preserves every saved field', async () => {
  const initial = {
    bio: longBio, community: 'Fictional community', location: 'Fictional location',
    nation: 'Fictional nation', territory: 'Fictional territory', languages: 'Fictional language',
    headline: 'Community writer', skills: ['Writing', 'Testing'], interests: ['jobs'],
    photoURL: 'https://fixture.invalid/photo.png', joinedAt: 'original-time',
  };
  const h = harness('setup', initial);
  const read = h.firestore.getDoc;
  h.firestore.getDoc = async () => { throw Error('fictional read failure'); };
  h.render(); await h.flush();
  const failed = h.render();
  assert.ok(nodes(failed).some(n => n.props?.role === 'alert'));
  assert.equal(bioField(failed), undefined);
  assert.equal(button(failed, 'Skip for now'), undefined);
  assert.equal(button(failed, 'Continue'), undefined);
  assert.equal(h.setupRequests.length, 0);
  h.firestore.getDoc = read;
  button(failed, 'Try again').props.onClick();
  h.render(); await h.flush();
  button(h.render(), 'Skip for now').props.onClick(); await settle();
  assert.equal(h.setupRequests[0].status, 200);
  for (const [key, value] of Object.entries(initial)) {
    assert.deepEqual(structuredClone(h.stored()[key]), value, `${key} survives setup`);
  }
  assert.equal(h.stored().skillsText, 'Writing, Testing');
  assert.equal(h.account().setupComplete, true);
  assert.deepEqual(h.routes, ['/feed']);
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

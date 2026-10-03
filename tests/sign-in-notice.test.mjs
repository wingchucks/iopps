import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';
import { markSignIn, rememberSignInNotice, takeSignInNotice } from '../src/lib/sign-in-notice.ts';

// The notice /api/auth/account attaches when a member's organization was disabled or removed.
const NOTICE = "Your organization's workspace is no longer available, so you are signed in to your personal profile. Contact support@iopps.ca if you think this is a mistake.";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: key => { values.delete(key); },
  };
}

test('the first account lookup after a sign-in keeps its notice, and it is shown once to that member', () => {
  const storage = memoryStorage();
  markSignIn('member-a', 1_000, storage);
  assert.equal(takeSignInNotice('member-a', 1_100, storage), null, 'nothing to show before the account lookup answers');
  rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE }, 1_200, storage);
  // The next lookup (for example /dashboard after the login redirect) neither re-arms nor clears it.
  rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE }, 1_300, storage);
  assert.equal(takeSignInNotice('member-a', 1_400, storage), NOTICE);
  assert.equal(takeSignInNotice('member-a', 1_500, storage), null, 'once');
  rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE }, 1_600, storage);
  assert.equal(takeSignInNotice('member-a', 1_700, storage), null, 'later lookups in the same session show nothing');
  assert.equal(storage.values.size, 0);
});

test('restored sessions, lookups without a notice and other accounts never show it', () => {
  const restored = memoryStorage();
  rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE }, 1_000, restored);
  assert.equal(takeSignInNotice('member-a', 1_100, restored), null, 'no sign-in in this tab');

  const healthy = memoryStorage();
  markSignIn('member-a', 1_000, healthy);
  rememberSignInNotice('member-a', { destination: '/org/dashboard' }, 1_100, healthy);
  rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE }, 1_200, healthy);
  assert.equal(takeSignInNotice('member-a', 1_300, healthy), null, 'the sign-in was answered without a notice');

  const otherLookup = memoryStorage();
  markSignIn('member-a', 1_000, otherLookup);
  rememberSignInNotice('member-b', { notice: NOTICE }, 1_100, otherLookup);
  assert.equal(takeSignInNotice('member-b', 1_200, otherLookup), null);
  assert.equal(takeSignInNotice('member-a', 1_200, otherLookup), null);

  const otherViewer = memoryStorage();
  markSignIn('member-a', 1_000, otherViewer);
  rememberSignInNotice('member-a', { notice: NOTICE }, 1_100, otherViewer);
  assert.equal(takeSignInNotice('member-b', 1_200, otherViewer), null, 'another account never sees it');
  assert.equal(takeSignInNotice('member-a', 1_300, otherViewer), null, 'and it is dropped unseen');

  const switched = memoryStorage();
  markSignIn('member-a', 1_000, switched);
  rememberSignInNotice('member-a', { notice: NOTICE }, 1_100, switched);
  markSignIn('member-b', 1_200, switched);
  rememberSignInNotice('member-b', { destination: '/feed' }, 1_300, switched);
  assert.equal(takeSignInNotice('member-a', 1_400, switched), null, 'a new sign-in replaces an unseen notice');
});

test('stale, malformed or unavailable storage shows nothing and never throws', () => {
  const stale = memoryStorage();
  markSignIn('member-a', 0, stale);
  rememberSignInNotice('member-a', { notice: NOTICE }, 6 * 60 * 1000, stale);
  assert.equal(takeSignInNotice('member-a', 6 * 60 * 1000, stale), null, 'a sign-in mark older than five minutes is ignored');

  const malformed = memoryStorage({ 'iopps:sign-in-notice:v1': '{"uid":"member-a","at":"later","notice":7}' });
  assert.equal(takeSignInNotice('member-a', 1_000, malformed), null);
  assert.equal(malformed.values.size, 0, 'malformed state is removed');

  for (const notice of ['', '   ', 42, 'x'.repeat(501)]) {
    const storage = memoryStorage();
    markSignIn('member-a', 1_000, storage);
    rememberSignInNotice('member-a', { notice }, 1_100, storage);
    assert.equal(takeSignInNotice('member-a', 1_200, storage), null, JSON.stringify(notice).slice(0, 20));
  }

  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.doesNotThrow(() => markSignIn('member-a', 1_000, throwing));
  assert.doesNotThrow(() => rememberSignInNotice('member-a', { notice: NOTICE }, 1_000, throwing));
  assert.equal(takeSignInNotice('member-a', 1_000, throwing), null);
  // Outside a browser (no window): nothing to do.
  assert.doesNotThrow(() => markSignIn('member-a'));
  assert.doesNotThrow(() => rememberSignInNotice('member-a', { notice: NOTICE }));
  assert.equal(takeSignInNotice('member-a'), null);
});

// SignInNotice with the real notice store, a per-tab storage and the page's event target.
function signInNotice({ uid = 'member-a', pathname = '/feed', loading = false } = {}) {
  const toasts = [], cleanups = [];
  const window = Object.assign(new EventTarget(), { sessionStorage: memoryStorage() });
  let effect;
  const mocks = {
    react: { useEffect: fn => { effect = fn; } },
    'next/navigation': { usePathname: () => pathname },
    '@/lib/auth-context': { useAuth: () => ({ user: uid ? { uid } : null, loading }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: (message, type, options) => toasts.push([message, type, { ...options }]) }) },
  };
  const component = sourceModule('src/components/SignInNotice.tsx', { mocks, globals: { window, Event, EventTarget } });
  // Like one page: the component's copy of lib/sign-in-notice and this one share the tab's storage and events.
  const store = sourceModule('src/lib/sign-in-notice.ts', { globals: { window, Event } });
  const render = () => { component.default(); cleanups.push(effect()); };
  return { toasts, window, store, render, unmount: () => cleanups.forEach(cleanup => cleanup?.()) };
}

test('SignInNotice shows a kept notice once as a long info toast on the page the member lands on', () => {
  const h = signInNotice();
  h.store.markSignIn('member-a');
  h.store.rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE });
  h.render();
  assert.deepEqual(h.toasts, [[NOTICE, 'info', { durationMs: 12000 }]]);
  h.render();
  assert.equal(h.toasts.length, 1, 'shown once');
  h.unmount();
});

test('SignInNotice shows a notice kept on the current page right away, but waits on the login page', () => {
  const page = signInNotice({ pathname: '/setup' });
  page.render();
  page.store.markSignIn('member-a');
  page.store.rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE });
  assert.deepEqual(page.toasts, [[NOTICE, 'info', { durationMs: 12000 }]], 'the lookup announces the notice');
  page.unmount();

  const login = signInNotice({ pathname: '/login' });
  login.render();
  login.store.markSignIn('member-a');
  login.store.rememberSignInNotice('member-a', { destination: '/feed', notice: NOTICE });
  assert.deepEqual(login.toasts, [], 'the login page is about to leave with a full page load');
  assert.equal(login.store.takeSignInNotice('member-a'), NOTICE, 'kept for the destination page');
  login.unmount();

  for (const options of [{ uid: null }, { loading: true }]) {
    const h = signInNotice(options);
    h.store.markSignIn('member-a');
    h.store.rememberSignInNotice('member-a', { notice: NOTICE });
    h.render();
    assert.deepEqual(h.toasts, [], JSON.stringify(options));
  }
  const other = signInNotice({ uid: 'member-b' });
  other.store.markSignIn('member-a');
  other.store.rememberSignInNotice('member-a', { notice: NOTICE });
  other.render();
  assert.deepEqual(other.toasts, [], 'never shown to another account');
});

test('a toast stays for the requested time, and four seconds by default', () => {
  const delays = [];
  const mocks = {
    react: { useEffect: fn => fn(), useRef: value => ({ current: value }), useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
  };
  const { default: Toast } = sourceModule('src/components/Toast.tsx', { mocks, globals: {
    requestAnimationFrame: () => 0,
    setTimeout: (_fn, delay) => { delays.push(delay); return delays.length; },
    clearTimeout() {},
  } });
  Toast({ message: 'Saved', type: 'success', onClose() {} });
  Toast({ message: NOTICE, type: 'info', durationMs: 12000, onClose() {} });
  assert.deepEqual(delays, [4000, 12000]);
});

test('the /dashboard alias hands the lookup notice over for the signed-in member and routes as before', async () => {
  const notices = [], routes = [];
  let effect;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useEffect: fn => { effect = fn; }, useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ replace: path => routes.push(path) }) },
    '@/lib/auth-context': { useAuth: () => ({ user: { uid: 'member-a', getIdToken: async () => 'fictional-token' } }) },
    '@/lib/sign-in-notice': { rememberSignInNotice: (uid, data) => notices.push({ uid, notice: data.notice }) },
    '@/components/ProtectedRoute': { default: 'ProtectedRoute' },
  };
  const page = sourceModule('src/app/dashboard/page.tsx', { mocks, globals: {
    fetch: async url => { assert.equal(url, '/api/auth/account'); return { ok: true, json: async () => ({ destination: '/feed', notice: NOTICE }) }; },
  } });
  const Destination = page.default().props.children.type;
  Destination();
  effect();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(routes, ['/feed']);
  assert.deepEqual(notices, [{ uid: 'member-a', notice: NOTICE }]);
});

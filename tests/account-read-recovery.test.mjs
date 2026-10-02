import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(path, supplied = {}, hook = false, directComponent = false) {
  const slots = [], pending = [], subscriptions = [], writes = [];
  let cursor = 0, user = { uid: 'qa-a', getIdToken: async () => 'fictional-token' }, value, implementation;
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) { slots[i] = { deps, cleanup: old?.cleanup }; pending.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const router = { replace() {} }, showToast = () => {};
  const defaults = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/auth-context': { useAuth: () => ({ user }) }, './auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast }) },
    '@/lib/useAccountContext': { useAccountContext: () => ({ loading: false, isEmployer: false }) },
    'next/navigation': { useParams: () => ({ slug: 'fictional-job' }), useRouter: () => router },
    '@/lib/saved-job-aliases': { groupSavedAliases: () => [], loadSavedJobAliases: async () => [] },
    './firestore/notifications': {
      onNotifications: (uid, snapshot, error, size) => { const sub = { uid, snapshot, error, size, closed: false }; subscriptions.push(sub); return () => { sub.closed = true; }; },
      onUnreadNotificationCount: (uid, count, error) => { const sub = { uid, count, error, closed: false }; subscriptions.push(sub); return () => { sub.closed = true; }; },
      markAsRead: async id => { writes.push(id); }, markAllAsRead: async uid => { writes.push(uid); },
    },
  };
  const imports = { ...defaults, ...supplied }, exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console: { error() {} }, URLSearchParams, document: { addEventListener() {}, removeEventListener() {} }, window: { location: { search: '' } }, fetch: supplied.fetch || (async () => ({ ok: true, json: async () => ({}) })), require: id => imports[id] || { default: id } });
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  implementation = hook ? exports.useNotifications : directComponent ? exports.default : nodes(exports.default()).find(n => typeof n.type === 'function').type;
  const render = (size = 20) => {
    for (let i = 0; i < 12; i++) { cursor = 0; value = implementation(size); if (!pending.length) return value; for (const effect of pending.splice(0)) effect(); }
    throw new Error('Effects did not settle');
  };
  return {
    render, subscriptions, writes, value: () => value,
    nodes: () => nodes(value),
    text: () => JSON.stringify(value),
    flush: async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); render(); },
    retry: () => { nodes(value).find(n => n.props?.children === 'Retry').props.onClick(); render(); },
    switchUser: uid => { user = { uid, getIdToken: async () => 'fictional-token' }; render(); },
  };
}

test('linked notification activation handles keyboard Enter once on the anchor; only unlinked cards handle clicks', async () => {
  const marked = [];
  const rows = [{ id: 'qa-linked', userId: 'qa-a', read: false, title: 'Linked fixture', link: '/profile' }, { id: 'qa-unlinked', userId: 'qa-a', read: false, title: 'Unlinked fixture' }];
  const h = fixture('src/app/notifications/page.tsx', {
    '@/lib/use-current-time': { useCurrentTime: () => 0 },
    '@/lib/use-notifications': { useNotifications: () => ({ notifications: rows, loading: false, error: '', unreadCount: 2, actionError: '', busy: false, retry() {}, markRead: async row => { marked.push(row.id); } }) },
  });
  h.render();
  const anchor = h.nodes().find(node => node.type === 'next/link' && node.props.href === '/profile');
  assert.equal(typeof anchor.props.onClick, 'function', 'Native Enter activation dispatches click to the focused anchor');
  assert.equal(anchor.props.children.props.onClick, undefined, 'Pointer bubbling must not also activate its descendant card');
  await anchor.props.onClick({ detail: 0 });
  assert.deepEqual(marked, ['qa-linked']);
  const unlinked = h.nodes().find(node => node.type === '@/components/Card' && JSON.stringify(node.props.children).includes('Unlinked fixture'));
  await unlinked.props.onClick();
  assert.deepEqual(marked, ['qa-linked', 'qa-unlinked']);
});

test('notification bell linked rows also mark read on keyboard anchor activation without a duplicate descendant handler', async () => {
  const marked = [];
  const row = { id: 'qa-bell', userId: 'qa-a', read: false, title: 'Bell fixture', link: '/profile' };
  const h = fixture('src/components/NotificationBell.tsx', {
    '@/lib/use-current-time': { useCurrentTime: () => 0 },
    '@/lib/use-notifications': { useNotifications: () => ({ notifications: [row], loading: false, error: '', unreadCount: 1, actionError: '', busy: false, retry() {}, markRead: async notification => { marked.push(notification.id); return true; } }) },
  }, false, true);
  h.render(); h.nodes().find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Notifications')).props.onClick(); h.render();
  const anchor = h.nodes().find(node => node.type === 'next/link' && node.props.href === '/profile');
  assert.equal(typeof anchor.props.onClick, 'function');
  assert.equal(anchor.props.children.props.onClick, undefined);
  await anchor.props.onClick({ detail: 0 }); h.render();
  assert.deepEqual(marked, ['qa-bell']);
  assert.equal(h.nodes().some(node => node.type === 'next/link' && node.props.href === '/profile'), false, 'Successful activation closes the preview');
});

test('25-record history: unread older than recent 20 still contributes to total; larger window returns it', () => {
  const h = fixture('src/lib/use-notifications.ts', {}, true); h.render();
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: `qa-${i}`, userId: 'qa-a', read: i !== 24 }));
  h.subscriptions[0].snapshot(rows.slice(0, 20)); h.subscriptions[1].count(1); h.render();
  assert.equal(h.value().unreadCount, 1); assert.equal(h.value().notifications.filter(n => !n.read).length, 0);
  h.render(40); assert.equal(h.subscriptions[2].size, 40); assert.equal(h.subscriptions[0].closed, true);
  h.subscriptions[2].snapshot(rows); h.subscriptions[3].count(1); h.render(40);
  assert.equal(h.value().notifications.filter(n => !n.read).length, 1);
});

test('terminal history/count failures surface an error; retry replaces both subscriptions', () => {
  const h = fixture('src/lib/use-notifications.ts', {}, true); h.render();
  h.subscriptions[0].error(new Error('fictional denied')); h.render();
  assert.equal(h.value().loading, false); assert.match(h.value().error, /could not be loaded/);
  h.value().retry(); h.render(); assert.equal(h.subscriptions.length, 4); assert.equal(h.value().loading, true);
  h.subscriptions[2].snapshot([]); h.subscriptions[3].count(0); h.render();
  assert.equal(h.value().error, ''); assert.equal(h.value().loading, false);
  h.subscriptions[3].error(new Error('fictional count failure')); h.render(); assert.match(h.value().error, /could not be loaded/);
});

test('old account callbacks, unread totals and write errors cannot overwrite the new account', async () => {
  let reject;
  const h = fixture('src/lib/use-notifications.ts', { './firestore/notifications': {
    onNotifications: (uid, snapshot, error, size) => { h.subscriptions.push({ uid, snapshot, error, size }); return () => {}; },
    onUnreadNotificationCount: (uid, count, error) => { h.subscriptions.push({ uid, count, error }); return () => {}; },
    markAllAsRead: () => new Promise((_resolve, failure) => { reject = failure; }),
  } }, true);
  h.render(); const old = h.subscriptions.slice(); const pending = h.value().markRead(); h.switchUser('qa-b');
  old[0].snapshot([{ userId: 'qa-a', title: 'Private A' }]); old[1].count(9); old[0].error(new Error('old failure')); reject(new Error('old write')); await pending; h.render();
  assert.equal(h.value().notifications.length, 0); assert.equal(h.value().unreadCount, null); assert.equal(h.value().error, ''); assert.equal(h.value().actionError, '');
  h.subscriptions[2].snapshot([{ userId: 'qa-b', title: 'Own B' }]); h.subscriptions[3].count(1); h.render();
  assert.equal(h.value().notifications[0].title, 'Own B');
});

test('mark-one/all failures keep unread state, provide retry feedback and prevent repeated simultaneous writes', async () => {
  let fail = true, calls = 0, release;
  const h = fixture('src/lib/use-notifications.ts', { './firestore/notifications': {
    onNotifications: (_uid, snapshot) => { h.subscriptions.push({ snapshot }); return () => {}; },
    onUnreadNotificationCount: (_uid, count) => { h.subscriptions.push({ count }); return () => {}; },
    markAsRead: async () => { calls++; if (fail) throw new Error('fictional write failure'); },
    markAllAsRead: () => { calls++; return fail ? Promise.reject(new Error('fictional write failure')) : new Promise(resolve => { release = resolve; }); },
  } }, true);
  h.render(); const row = { id: 'qa-own', userId: 'qa-a', read: false }; h.subscriptions[0].snapshot([row]); h.subscriptions[1].count(1); h.render();
  assert.equal(await h.value().markRead(row), false); h.render(); assert.match(h.value().actionError, /Could not mark/); assert.equal(h.value().notifications[0].read, false);
  assert.equal(await h.value().markRead(), false); h.render(); assert.equal(h.value().unreadCount, 1);
  fail = false; const pending = h.value().markRead(); assert.equal(await h.value().markRead(), false); assert.equal(calls, 3); release(); await pending; h.render();
  assert.equal(h.value().actionError, '');
  assert.equal(await h.value().markRead({ id: 'foreign', userId: 'qa-b', read: false }), false); assert.equal(calls, 3);
});

for (const [name, path, moduleName, loader, errorText, absentText] of [
  ['saved items', 'src/app/saved/page.tsx', '@/lib/firestore/savedItems', 'getSavedItems', /Saved items could not be loaded/, /No saved items yet/],
  ['notification settings', 'src/app/settings/notifications/page.tsx', '@/lib/firestore/notificationPreferences', 'getNotificationPreferences', /Notification preferences could not be loaded/, /Notification preferences saved/],
]) {
  test(`${name}: failed initial read is visible; retry can recover; stale rejection is ignored`, async () => {
    let fail = true, reject;
    const h = fixture(path, { [moduleName]: { [loader]: () => fail ? Promise.reject(new Error('fictional read failure')) : Promise.resolve(name === 'saved items' ? [] : { categories: {}, quietHours: { enabled: false, start: '22:00', end: '07:00' } }) } });
    h.render(); await h.flush(); assert.match(h.text(), errorText); assert.doesNotMatch(h.text(), absentText);
    fail = false; h.retry(); await h.flush(); assert.doesNotMatch(h.text(), errorText);
    const stale = fixture(path, { [moduleName]: { [loader]: () => new Promise((_resolve, failure) => { reject = failure; }) } });
    stale.render(); const oldReject = reject; stale.switchUser('qa-b'); oldReject(new Error('old read')); await stale.flush(); assert.doesNotMatch(stale.text(), errorText);
  });
}

test('application receipt-check failure blocks submission with retry instead of claiming Job Not Found', async () => {
  let fail = true, reads = 0;
  const h = fixture('src/app/jobs/[slug]/apply/page.tsx', {
    fetch: async () => fail ? { ok: false, status: 503 } : { ok: true, json: async () => ({ application: { id: 'qa-receipt', title: 'Fixture job', employer: 'Fixture organization' } }) },
    '@/lib/firestore/posts': { getPost: async () => { reads++; return null; } },
    '@/lib/application-receipt': { buildApplicationReceipt: data => ({ ...data, documents: [] }) },
  });
  h.render(); await h.flush(); assert.match(h.text(), /Application details could not be loaded/); assert.doesNotMatch(h.text(), /Job Not Found|Review & Submit/);
  assert.equal(reads, 0, 'A failed receipt check must stop before loading a new submission form');
  fail = false; h.retry(); await h.flush(); assert.match(h.text(), /Application saved|qa-receipt/); assert.doesNotMatch(h.text(), /Application details could not be loaded|Job Not Found/);
});

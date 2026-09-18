import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual page and callbacks with deterministic hook scheduling.
// The release-browser suite separately exercises hydrated React + real snapshots.
function harness(sendResult = () => Promise.resolve()) {
  const slots = [], pending = [], sent = [], read = [], errors = [];
  let cursor = 0, inbox, tree, query = 'peer-a';
  let user = { uid: 'self' };
  const react = {
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, value => { slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; },
    useEffect(fn, deps) { const i = cursor++, prev = slots[i]; if (!prev || deps.some((v, j) => !Object.is(v, prev.deps[j]))) { slots[i] = { deps }; pending.push(fn); } },
  };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useSearchParams: () => new URLSearchParams(query ? { to: query } : {}) },
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/firestore/messages': {
      onConversations: (_uid, callback) => { inbox = callback; return () => {}; },
      onMessages: () => () => {}, markConversationRead: id => { read.push(id); },
      getConversationPeer: async () => null,
      sendMessage: async (...args) => { sent.push(args); await sendResult(); },
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/messages/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console: { error: (...args) => errors.push(args) }, URLSearchParams, require: id => imports[id] || { default: id } });
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
  const Content = nodes(exports.default()).find(n => typeof n.type === 'function').type;
  function render() { cursor = 0; tree = Content(); for (const fn of pending.splice(0)) fn(); cursor = 0; tree = Content(); return tree; }
  function input() { return nodes(tree).find(n => n.type === 'input'); }
  function select(label) { nodes(tree).find(n => n.props?.onClick && JSON.stringify(n.props.children).includes(label)).props.onClick(); render(); }
  return { render, snapshot: rows => { inbox(rows); render(); }, select, input,
    type: text => { input().props.onChange({ target: { value: text } }); render(); },
    send: async () => { await nodes(tree).find(n => n.type === 'button' && n.props.children === 'Send').props.onClick(); render(); },
    query: value => { query = value; render(); },
    user: uid => { user = { uid }; render(); }, sent, read, errors };
}
const rows = [
  { id: 'a', participants: ['self', 'peer-a'], lastMessage: 'Thread Alpha' },
  { id: 'b', participants: ['self', 'peer-b'], lastMessage: 'Thread Beta', unreadBy: 'self' },
];
test('legacy query is consumed once; manual selection and recipient-bound drafts survive read and incoming snapshots', async () => {
  const h = harness(); h.render(); h.snapshot(rows);
  h.type('draft for A'); h.select('Thread Beta');
  assert.equal(h.input().props.value, '', 'A draft must not follow selection into B');
  h.type('draft for B'); assert.deepEqual(h.read, ['b']);
  h.snapshot(rows.map(r => ({ ...r, unreadBy: '' })));
  h.snapshot(rows.map(r => ({ ...r, lastMessageAt: { seconds: 100 }, unreadBy: 'self' })));
  assert.equal(h.input().props.value, 'draft for B');
  await h.send(); assert.deepEqual(h.sent, [['b', 'self', 'draft for B', 'peer-b']]);
  h.select('Thread Alpha'); assert.equal(h.input().props.value, 'draft for A');
  h.select('Thread Beta'); assert.equal(h.input().props.value, '');
  h.query('peer-b'); h.select('Thread Alpha'); h.snapshot(rows);
  assert.equal(h.input().props.value, 'draft for A');
});
test('pending send preserves newer same-thread text and sends only the captured draft', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = harness(() => pending); h.render(); h.snapshot(rows);
  h.type(' first ');
  const sending = h.send();
  h.type('next unsent');
  resolve(); await sending;
  assert.deepEqual(h.sent, [['a', 'self', 'first', 'peer-a']]);
  assert.equal(h.input().props.value, 'next unsent');
});
test('unchanged submitted draft clears after a deferred successful send', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = harness(() => pending); h.render(); h.snapshot(rows);
  h.type(' first '); const sending = h.send();
  resolve(); await sending;
  assert.equal(h.input().props.value, '');
  assert.deepEqual(h.sent, [['a', 'self', 'first', 'peer-a']]);
});
test('deferred completion preserves another thread and another user draft', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const h = harness(() => pending); h.render(); h.snapshot(rows);
  h.type('first'); const sending = h.send();
  h.select('Thread Beta'); h.type('B unsent');
  h.user('second'); h.snapshot(rows.map(r => ({ ...r, participants: ['second', ...r.participants.slice(1)] })));
  h.type('second user unsent');
  resolve(); await sending;
  assert.equal(h.input().props.value, 'second user unsent');
  h.user('self'); h.snapshot(rows); h.select('Thread Beta');
  assert.equal(h.input().props.value, 'B unsent');
  h.select('Thread Alpha'); assert.equal(h.input().props.value, '');
  assert.deepEqual(h.sent, [['a', 'self', 'first', 'peer-a']]);
});
for (const newer of [false, true]) test(`failed deferred send retains ${newer ? 'newer' : 'original'} draft`, async () => {
  let reject;
  const pending = new Promise((_resolve, fail) => { reject = fail; });
  const h = harness(() => pending); h.render(); h.snapshot(rows);
  h.type('first'); const sending = h.send();
  if (newer) h.type('next unsent');
  reject(new Error('fictional send failure')); await sending;
  assert.equal(h.input().props.value, newer ? 'next unsent' : 'first');
  assert.equal(h.errors.length, 1);
  assert.deepEqual(h.sent, [['a', 'self', 'first', 'peer-a']]);
});

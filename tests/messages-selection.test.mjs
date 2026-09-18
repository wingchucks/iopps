import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual page and callbacks with deterministic hook scheduling.
// The release-browser suite separately exercises hydrated React + real snapshots.
function harness() {
  const slots = [], pending = [], sent = [], read = [];
  let cursor = 0, inbox, tree, query = 'peer-a';
  const user = { uid: 'self' };
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
      sendMessage: async (...args) => { sent.push(args); },
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/messages/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, console, URLSearchParams, require: id => imports[id] || { default: id } });
  function nodes(value) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(nodes); return [value, ...nodes(value.props?.children)]; }
  const Content = nodes(exports.default()).find(n => typeof n.type === 'function').type;
  function render() { cursor = 0; tree = Content(); for (const fn of pending.splice(0)) fn(); cursor = 0; tree = Content(); return tree; }
  function input() { return nodes(tree).find(n => n.type === 'input'); }
  function select(label) { nodes(tree).find(n => n.props?.onClick && JSON.stringify(n.props.children).includes(label)).props.onClick(); render(); }
  return { render, snapshot: rows => { inbox(rows); render(); }, select, input,
    type: text => { input().props.onChange({ target: { value: text } }); render(); },
    send: async () => { await nodes(tree).find(n => n.type === 'button' && n.props.children === 'Send').props.onClick(); render(); },
    query: value => { query = value; render(); }, sent, read };
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

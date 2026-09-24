import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness() {
  const slots = [], effects = [], writes = [], notices = [];
  let cursor = 0, failure, tree;
  const user = { uid: 'fictional-owner' };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react: {
      useState(value) { const i = cursor++; slots[i] ??= { value }; return [slots[i].value, v => { slots[i].value = typeof v === 'function' ? v(slots[i].value) : v; }]; },
      useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
      useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d,j) => d !== slots[i].deps[j])) { slots[i] = { deps }; effects.push(fn); } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/toast-context': { useToast: () => ({ showToast: (...args) => notices.push(args) }) },
    '@/lib/firebase': { auth: { currentUser: user }, db: {}, storage: {} },
    'firebase/firestore': { doc: (_db, ...parts) => parts.join('/'), getDoc: async () => ({ exists: () => true, data: () => ({ resumeUrl: 'fictional://resume', resumeFileName: 'resume.pdf' }) }), updateDoc: async (...args) => writes.push(args) },
    'firebase/storage': { ref: (_storage, url) => url, deleteObject: async () => { if (failure) throw failure; } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/profile/resume/page.tsx','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, console: { error() {} }, require: id => imports[id] || { default: id } });
  const nodes = n => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];
  const Content = nodes(exports.default()).find(n => typeof n.type === 'function').type;
  async function render() { cursor = 0; tree = Content(); for (const f of effects.splice(0)) f(); await new Promise(r => setImmediate(r)); cursor = 0; tree = Content(); }
  return { render, writes, notices, fail: code => { failure = code ? { code } : null; }, remove: async () => { await nodes(tree).find(n => n.props?.onClick && n.props.children === 'Delete').props.onClick(); await render(); } };
}
for (const code of ['storage/unauthorized', 'storage/retry-limit-exceeded', 'storage/unknown']) test(`resume deletion preserves pointer and permits retry after ${code}`, async () => {
  const h = harness(); await h.render(); h.fail(code); await h.remove();
  assert.equal(h.writes.length, 0, 'failed Storage deletion must not erase the recoverable profile pointer');
  assert.equal(h.notices.at(-1)[1], 'error');
  h.fail(null); await h.remove(); assert.equal(h.writes.length, 1); assert.equal(h.notices.at(-1)[1], 'success');
});
test('proven missing object allows pointer cleanup', async () => { const h = harness(); await h.render(); h.fail('storage/object-not-found'); await h.remove(); assert.equal(h.writes.length,1); assert.equal(h.notices.at(-1)[1],'success'); });

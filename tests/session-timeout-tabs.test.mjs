import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Runs the real hook once per tab. Tabs share one clock, localStorage and Firebase
// sign-in (as a browser does) but each has its own timers and event listeners.
const source = ts.transpileModule(fs.readFileSync('src/lib/useSessionTimeout.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const MINUTE = 60 * 1000;
const tick = () => new Promise(resolve => setImmediate(resolve));

function browser({ storageAvailable = true } = {}) {
  let clock = 1_000_000;
  const storage = new Map(), signOuts = [], tabs = [];
  const user = { uid: 'fictional-member' };
  const auth = { currentUser: user };
  const localStorage = {
    getItem(key) { if (!storageAvailable) throw new Error('SecurityError'); return storage.get(key) ?? null; },
    setItem(key, value) { if (!storageAvailable) throw new Error('SecurityError'); storage.set(key, String(value)); },
  };
  function open() {
    const listeners = new Map(), routes = [], timers = [];
    const document = { visibilityState: 'visible', activeElement: { tagName: 'BODY' }, addEventListener: (type, fn) => listeners.set('document:' + type, fn), removeEventListener: type => listeners.delete('document:' + type) };
    const window = { localStorage, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
    const tab = { routes, timers, document, fire: type => (listeners.get(type) ?? listeners.get('document:' + type))() };
    const exports = {};
    vm.runInNewContext(source, {
      exports, window, document, Date: { now: () => clock },
      setTimeout: (fn, ms) => { const timer = { fn, at: clock + ms, cleared: false }; timers.push(timer); return timer; },
      clearTimeout: timer => { if (timer) timer.cleared = true; },
      require: id => id === 'react' ? { useEffect: fn => { tab.cleanup = fn(); }, useCallback: fn => fn, useRef: current => ({ current }) }
        : id === 'next/navigation' ? { useRouter: () => ({ replace: url => routes.push(url) }) }
          : id === './firebase' ? { auth }
            : { useAuth: () => ({ user, signOut: async uid => { signOuts.push(uid); if (auth.currentUser?.uid === uid) auth.currentUser = null; } }) },
    });
    exports.useSessionTimeout();
    tabs.push(tab);
    return tab;
  }
  async function advance(ms) {
    const end = clock + ms;
    for (;;) {
      const due = tabs.flatMap(tab => tab.timers).filter(timer => !timer.cleared && timer.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      clock = Math.max(clock, due.at); due.cleared = true; await due.fn();
    }
    clock = end;
  }
  return { open, advance, auth, signOuts, storage, sleep: ms => { clock += ms; } };
}

test('an idle tab never signs out a member who is working in another tab', async () => {
  const b = browser(), writing = b.open(), idle = b.open();
  for (let minute = 0; minute < 45; minute++) { await b.advance(MINUTE); writing.fire('keydown'); }
  assert.deepEqual(b.signOuts, [], 'the idle tab saw the other tab\'s activity');
  assert.equal(b.auth.currentUser?.uid, 'fictional-member');
  await b.advance(31 * MINUTE);
  assert.deepEqual(b.signOuts, ['fictional-member'], 'once every tab is idle for 30 minutes the session ends once');
  assert.deepEqual([...writing.routes, ...idle.routes], ['/login?reason=timeout']);
  assert.deepEqual([...b.storage.keys()], ['iopps:last-activity'], 'only an activity time is shared');
});

test('focus and visibility changes count as activity', async () => {
  const b = browser(), tab = b.open();
  await b.advance(29 * MINUTE); tab.fire('focus');
  await b.advance(29 * MINUTE); tab.document.visibilityState = 'hidden'; tab.fire('visibilitychange');
  await b.advance(29 * MINUTE);
  assert.deepEqual(b.signOuts, []);
  await b.advance(2 * MINUTE);
  assert.deepEqual(b.signOuts, ['fictional-member']);
  assert.deepEqual(tab.routes, ['/login?reason=timeout']);
});

test('a visible livestream keeps the session in every tab until the viewer leaves it', async () => {
  const b = browser(), viewer = b.open(), other = b.open();
  viewer.document.activeElement = { tagName: 'IFRAME' };
  await b.advance(120 * MINUTE);
  assert.deepEqual(b.signOuts, []);
  assert.deepEqual(other.routes, []);
  viewer.document.visibilityState = 'hidden';
  await b.advance(31 * MINUTE);
  assert.deepEqual(b.signOuts, ['fictional-member']);
});

test('a device waking from sleep cannot revive a session every tab left idle', async () => {
  const b = browser(), first = b.open();
  b.open();
  b.sleep(2 * 60 * MINUTE); // timers do not run while the device sleeps
  first.fire('touchstart');
  for (let i = 0; i < 5; i++) await tick();
  assert.deepEqual(b.signOuts, ['fictional-member']);
  assert.deepEqual(first.routes, ['/login?reason=timeout']);
});

test('a shared time ahead of the clock cannot postpone the timeout', async () => {
  const b = browser();
  b.storage.set('iopps:last-activity', String(1_000_000 + 10 * 60 * MINUTE));
  b.open();
  await b.advance(31 * MINUTE);
  assert.deepEqual(b.signOuts, ['fictional-member']);
});

test('without storage each tab still times out on its own activity', async () => {
  const b = browser({ storageAvailable: false }), tab = b.open();
  await b.advance(20 * MINUTE); tab.fire('mousedown');
  await b.advance(29 * MINUTE);
  assert.deepEqual(b.signOuts, []);
  await b.advance(2 * MINUTE);
  assert.deepEqual(b.signOuts, ['fictional-member']);
  tab.cleanup();
  assert.ok(tab.timers.every(timer => timer.cleared), 'unmounting stops the check');
});

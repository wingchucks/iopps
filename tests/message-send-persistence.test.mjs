import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(notification, failWrite = false) {
  const writes = [], notify = [], exports = {};
  const auth = { currentUser: { uid: 'sender' } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/firestore/messages.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, console, require(id) {
      if (id === 'firebase/firestore') return { collection: (_db, name) => name, doc: (_db, name, id) => `${name}/${id}`, serverTimestamp: () => 'server-time',
        setDoc: async (...args) => { if (failWrite) throw Error('Message save failed'); writes.push(['create', ...args]); },
        updateDoc: async (...args) => { writes.push(['update', ...args]); } };
      if (id === '../firebase') return { db: {}, auth };
      if (id === 'firebase/auth') return { onAuthStateChanged: () => () => {} };
      if (id === '../message-notification-retry') return { notifyNewMessage: (...args) => { notify.push(args); return notification; } };
      throw Error(`Unexpected import ${id}`);
    },
  });
  return { writes, notify, send: () => exports.sendMessage('existing-conversation', 'sender', 'Fictional saved chat', 'recipient') };
}

test('message and metadata persist once and return before email completes; notification failure cannot undo/resend', async () => {
  let reject;
  const pending = new Promise((_resolve, fail) => { reject = fail; });
  const h = harness(pending);
  const saved = await h.send();
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0][2].senderId, 'sender');
  assert.equal(h.writes[0][2].text, 'Fictional saved chat');
  assert.equal(h.writes[1][2].unreadBy, 'recipient');
  assert.equal(h.notify.length, 1);
  assert.equal(h.notify[0][0], saved.messageId);
  assert.equal(h.notify[0][1], 'sender');
  reject(Error('Notification failed'));
  assert.equal((await saved.notification).state, 'failed');
  assert.equal(h.writes.length, 2);
  assert.equal(h.notify.length, 1);
});

test('failed message persistence never starts email delivery', async () => {
  const h = harness(Promise.resolve({ state: 'accepted' }), true);
  await assert.rejects(h.send(), /Message save failed/);
  assert.equal(h.notify.length, 0);
  assert.equal(h.writes.length, 0);
});

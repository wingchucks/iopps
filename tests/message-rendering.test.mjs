import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { harness, invalidChildren } from './helpers/component-harness.mjs';

function messagesHarness(sendError) {
  let inbox, messages;
  const sent = [], user = { uid: 'self' };
  const h = harness('src/app/messages/page.tsx', {
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    '@/lib/auth-context': { useAuth: () => ({ user }) },
    '@/lib/firestore/messages': {
      MESSAGE_TEXT_MAX: 5000,
      onConversations: (_uid, snapshot) => { inbox = snapshot; return () => {}; },
      onMessages: (_id, snapshot) => { messages = snapshot; return () => {}; },
      markConversationRead: async () => {}, getConversationPeer: async () => null,
      sendMessage: async (...args) => { sent.push(args); throw sendError; },
    },
  });
  h.render();
  return { ...h, sent, inbox: rows => { inbox(rows); h.render(); }, messages: rows => { messages(rows); h.render(); } };
}

test('messages render non-string previews and bodies as empty text and cap the composer', () => {
  const h = messagesHarness(new Error('unused'));
  h.inbox([{ id: 'forged', participants: ['self', 'peer'], lastMessage: { text: 'Map preview' }, lastSenderId: 'peer', unreadBy: 'self' }]);
  assert.deepEqual(invalidChildren(h.nodes()), []);
  assert.match(h.text(), /Start a conversation/);
  h.nodes().find(node => node.props?.onClick && JSON.stringify(node.props.children).includes('Start a conversation')).props.onClick(); h.render();
  h.messages([{ id: 'm1', senderId: 'peer', text: { body: 'Map body' } }, { id: 'm2', senderId: 'peer', text: 'Plain fixture text' }]);
  assert.deepEqual(invalidChildren(h.nodes()), []);
  assert.doesNotMatch(h.text(), /Map preview|Map body/);
  assert.match(h.text(), /Plain fixture text/);
  assert.equal(h.nodes().find(node => node.type === 'input').props.maxLength, 5000);
});

for (const [code, expected] of [['permission-denied', /This member isn't accepting messages\./], ['unavailable', /Your message could not be sent\. Please try again\./]]) {
  test(`a ${code} send failure keeps the draft and explains it in that conversation`, async () => {
    const h = messagesHarness(Object.assign(new Error('fictional send failure'), { code }));
    h.inbox([{ id: 'thread', participants: ['self', 'peer'], lastMessage: 'Earlier', lastSenderId: 'peer' }]);
    h.nodes().find(node => node.props?.onClick && JSON.stringify(node.props.children).includes('Earlier')).props.onClick(); h.render();
    h.messages([]);
    h.nodes().find(node => node.type === 'input').props.onChange({ target: { value: 'Hello' } }); h.render();
    await h.nodes().find(node => node.type === 'button' && node.props.children === 'Send').props.onClick(); h.render();
    assert.deepEqual(h.sent, [['thread', 'self', 'Hello', 'peer']]);
    assert.equal(h.errors.length, 1);
    assert.match(h.text(), expected);
    assert.equal(h.nodes().find(node => node.type === 'input').props.value, 'Hello');
    assert.equal(h.nodes().find(node => node.props?.role === 'alert' && expected.test(JSON.stringify(node.props.children))) !== undefined, true);
  });
}

test('sendMessage rejects empty or oversized text before writing anything', async () => {
  const writes = [], exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/firestore/messages.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, require(id) {
      if (id === 'firebase/firestore') return { collection: (_db, name) => name, doc: (_db, name, id) => `${name}/${id}`, serverTimestamp: () => 'server-time',
        setDoc: async (...args) => { writes.push(['create', ...args]); }, updateDoc: async (...args) => { writes.push(['update', ...args]); } };
      if (id === '../firebase') return { db: {}, auth: { currentUser: null } };
      if (id === 'firebase/auth') return { onAuthStateChanged: () => () => {} };
      if (id === '../message-notification-retry') return { notifyNewMessage: async () => ({ state: 'cancelled' }) };
      throw Error(`Unexpected import ${id}`);
    },
  });
  assert.equal(exports.MESSAGE_TEXT_MAX, 5000);
  for (const text of ['', 'x'.repeat(5001)]) await assert.rejects(exports.sendMessage('thread', 'self', text, 'peer'));
  assert.equal(writes.length, 0);
  const text = 'ᐊ'.repeat(5000);
  await exports.sendMessage('thread', 'self', text, 'peer');
  assert.equal(writes[0][2].text, text);
  assert.equal(writes[1][2].lastMessage, 'ᐊ'.repeat(80) + '…');
  assert.equal(writes[1][2].lastSenderId, 'self');
  assert.equal(writes[1][2].unreadBy, 'peer');
});

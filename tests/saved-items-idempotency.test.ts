import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('savePost is additive and idempotent; it preserves existing saved metadata', async () => {
  const docs = new Map<string, unknown>([['alice_existing', { userId: 'alice', postId: 'existing', savedAt: 'original' }]]);
  const exports: { savePost?: (...args: string[]) => Promise<void> } = {};
  let offline = false;
  const sdk = {
    collection: () => ({}), doc: (_db: unknown, _col: string, id: string) => id,
    serverTimestamp: () => 'new-time',
    setDoc: async (id: string, data: unknown) => {
      if (docs.has(id)) throw Error('permission-denied: updates are forbidden');
      docs.set(id, data);
    },
    where: (_field: string, _op: string, value: string) => value,
    query: (_col: unknown, user: string, post: string) => `${user}_${post}`,
    getDocsFromServer: async (id: string) => { if (offline) throw Error('offline'); return { empty: !docs.has(id) }; },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/firestore/savedItems.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: (id: string) => id === 'firebase/firestore' ? sdk : { db: {} } });
  await exports.savePost!('alice', 'existing', 'Job', 'job');
  assert.equal((docs.get('alice_existing') as { savedAt: string }).savedAt, 'original');
  await exports.savePost!('alice', 'guest', 'Guest job', 'job');
  assert.deepEqual([...docs.keys()], ['alice_existing', 'alice_guest']);
  await Promise.all([exports.savePost!('alice', 'race', 'Job', 'job'), exports.savePost!('alice', 'race', 'Job', 'job')]);
  assert.equal(docs.size, 3, 'concurrent saves recover from create/update denial without overwriting');
  offline = true;
  await assert.rejects(exports.savePost!('alice', 'offline', 'Job', 'job'), /offline/);
  assert.equal(docs.has('alice_offline'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createJobSaveSession as create } from '../src/lib/job-save-session.ts';
test('job page delegates saved state and login intent to the account-scoped save hook', () => {
  const page = readFileSync('src/app/jobs/[slug]/JobDetailClient.tsx', 'utf8');
  const wrapper = readFileSync('src/app/jobs/[slug]/page.tsx', 'utf8');
  assert.match(wrapper, /return <JobDetailClient/);
  assert.match(page, /useJobSave\(/);
  assert.doesNotMatch(page, /void handleSave\(\)/);
});

test('login save intent unions one job into existing account without toggling it off', async () => {
  const existing = new Set(['existing-job']);
  const states: boolean[] = [];
  const session = create({ read: async () => existing.has('guest-job'), add: async () => { existing.add('guest-job'); }, remove: async () => { existing.delete('guest-job'); }, changed: value => states.push(value), failed: () => assert.fail('unexpected failure') });
  assert.equal(await session.save(), true);
  assert.equal(await session.save(), true);
  assert.deepEqual([...existing], ['existing-job', 'guest-job']);
  assert.deepEqual(states, [true, true]);
});

test('failed/offline save is retained for explicit retry', async () => {
  let offline = true, failed = 0;
  const states: boolean[] = [];
  const session = create({ read: async () => false, add: async () => { if (offline) throw Error('offline'); }, remove: async () => {}, changed: value => states.push(value), failed: () => failed++ });
  assert.equal(await session.save(), false);
  assert.deepEqual(states, []);
  assert.equal(failed, 1);
  offline = false;
  assert.equal(await session.save(), true);
  assert.deepEqual(states, [true]);
});

test('late read cannot overwrite successful save and concurrent intent runs issue one write', async () => {
  let read!: (value: boolean) => void, finish!: () => void, writes = 0;
  const states: boolean[] = [];
  const session = create({ read: () => new Promise(resolve => { read = resolve; }), add: () => { writes++; return new Promise(resolve => { finish = resolve; }); }, remove: async () => {}, changed: value => states.push(value), failed: () => {} });
  const loading = session.load();
  const saving = session.save();
  const duplicate = session.save();
  assert.equal(writes, 1);
  finish(); await saving; await duplicate;
  read(false); await loading;
  assert.deepEqual(states, [true]);
});

test('signout/account switch ignores stale completion and never starts another write', async () => {
  let finish!: () => void, writes = 0;
  const states: boolean[] = [];
  const session = create({ read: async () => false, add: () => { writes++; return new Promise(resolve => { finish = resolve; }); }, remove: async () => {}, changed: value => states.push(value), failed: () => assert.fail('stale failure') });
  const saving = session.save();
  session.dispose();
  finish();
  assert.equal(await saving, false, 'must not consume another account’s URL intent');
  assert.equal(await session.save(), false);
  await session.load();
  assert.equal(writes, 1);
  assert.deepEqual(states, []);
});

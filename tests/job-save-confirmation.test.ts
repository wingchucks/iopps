import test from 'node:test';
import assert from 'node:assert/strict';
import * as confirmation from '../src/lib/job-save-confirmation.ts';
import { readFileSync } from 'node:fs';

test('published and review confirmations follow persisted status and fail closed', async () => {
  for (const [status, active, title] of [['active', true, 'Published'], ['pending', false, 'Submitted for review'], ['active', false, 'Job saved'], ['unknown', true, 'Job saved']] as const) {
    assert.equal((await confirmation.confirmSavedJob('id', async () => ({ ok: true, json: async () => ({ job: { status, active } }) }))).title, title);
  }
  assert.equal((await confirmation.confirmSavedJob('id', async () => { throw new Error('offline'); })).title, 'Job saved');
  const source = readFileSync('src/app/org/dashboard/jobs/new/page.tsx', 'utf8');
  assert.match(source, /await confirmSavedJob/);
  assert.doesNotMatch(source, /Job Posted Successfully!|Candidates will be notified|Your job appears in search results/);
});

test('confirmation reads persisted job status, not requested publication', async () => {
  const calls: string[] = [];
  const result = await confirmation.confirmSavedJob('example', async (url: string) => {
    calls.push(url);
    return { ok: true, json: async () => ({ job: { status: 'draft', active: false } }) };
  });
  assert.deepEqual(calls, ['/api/employer/jobs/example']);
  assert.equal(result.title, 'Draft saved');
  assert.doesNotMatch(result.description, /now live/);
});

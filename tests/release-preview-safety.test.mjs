import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('release branch disables automatic Vercel deployment without disabling master or changing cron schedules', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.git?.deploymentEnabled, {
    'codex/job-flow-reliability-20260908': false,
  });
  assert.deepEqual(config.crons, [
    { path: '/api/cron/sync-feeds', schedule: '0 8 * * *' },
    { path: '/api/cron/check-subscriptions', schedule: '0 6 * * *' },
    { path: '/api/cron/expire-jobs', schedule: '0 7 * * *' },
    { path: '/api/cron/expire-events', schedule: '15 7 * * *' },
  ]);
});

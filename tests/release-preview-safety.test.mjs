import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('release branch disables automatic Vercel deployment without disabling master; existing schedules remain and account cleanup is explicit', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.deepEqual(config.git?.deploymentEnabled, {
    'codex/release-gates-20260918': false,
    'codex/security-remediation-20260917': false,
    'codex/ui-route-audit-20260918': false,
    'codex/job-flow-reliability-20260908': false,
    'fix/batc-pete-admin': false,
    'codex/qa-remediation-20260919': false,
    'fix/employer-qa-20260920': false,
    'fix/master-employer-login-race': false,
    'fix/individual-qa3-20260921': false,
    'fix/individual-safe-cleanup-20260921': false,
    'fix/public-audit-remediation-20260921': false,
    'fix/qa-round5-20260921': false,
    'release/round7-verified-fixes': false,
    'release/import-inventory-report': false,
  });
  assert.deepEqual(config.crons, [
    { path: '/api/cron/sync-feeds', schedule: '0 8 * * *' },
    { path: '/api/cron/check-subscriptions', schedule: '0 6 * * *' },
    { path: '/api/cron/expire-jobs', schedule: '0 7 * * *' },
    { path: '/api/cron/expire-events', schedule: '15 7 * * *' },
    { path: '/api/cron/account-cleanup', schedule: '30 7 * * *' },
  ]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('candidate preview disabled with prior settings and crons unchanged',()=>{
 const current=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 // Explicit baseline from 658818c731ac22725f65230534e6261bfadba978 plus
 // the authorized login-race branch. Do not read HEAD: after committing,
 // that would compare the candidate with itself and permit unrelated changes.
 // No Git history is required, so this also covers shallow CI checkouts.
 assert.deepEqual(current, {
   git: {
     deploymentEnabled: {
       'codex/release-gates-20260918': false,
       'codex/ui-route-audit-20260918': false,
       'codex/security-remediation-20260917': false,
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
    'fix/paid-job-pricing-20260924': false,
     },
   },
   crons: [
     { path: '/api/cron/sync-feeds', schedule: '0 8 * * *' },
     { path: '/api/cron/check-subscriptions', schedule: '0 6 * * *' },
     { path: '/api/cron/expire-jobs', schedule: '0 7 * * *' },
     { path: '/api/cron/expire-events', schedule: '15 7 * * *' },
     { path: '/api/cron/account-cleanup', schedule: '30 7 * * *' },
   ],
 });
});
test('onboarding step zero permits optional workspace branding',()=>{
 const source=fs.readFileSync('src/app/org/onboarding/page.tsx','utf8');
 const next=source.slice(source.indexOf('const handleNext'),source.indexOf('const handleBack'));
 assert.doesNotMatch(next,/missing.push\("upload your logo"\)/);
 assert.match(source,/Organization Logo \(optional for workspace\)/);
});

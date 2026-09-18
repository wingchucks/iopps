// Run existing browser checks only against credential-minimized loopback fixtures.
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { startIsolatedQaServer } from './local-qa-server.mjs';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-iopps-preview');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');

async function run(args, env = {}) {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env }, stdio: 'inherit', shell: false,
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(code, 0, `Browser check failed: ${args.join(' ')}`);
}

await run(['--import', './scripts/test-typescript-loader.mjs', '--test', 'tests/organization-admin-assignment-browser.test.mjs'], {
  IOPPS_TEST_ASSIGNMENT_BROWSER: 'true',
});
const server = await startIsolatedQaServer();
try {
  await run(['scripts/qa-job-flow.mjs'], {
    QA_BASE_URL: server.base,
    QA_OUTPUT: path.resolve('test-results/release-browser/jobs'),
  });
  await run(['scripts/qa-dashboard-routes.mjs'], { QA_BASE_URL: server.base });
} finally {
  await server.stop();
}
await run(['scripts/qa-maintenance-browser.mjs'], {
  QA_OUTPUT_DIR: path.resolve('test-results/release-browser/maintenance'),
});

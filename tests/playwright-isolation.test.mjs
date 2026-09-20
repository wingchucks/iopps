import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const demo = { IOPPS_TEST_EMULATORS: 'true', GCLOUD_PROJECT: 'demo-iopps-preview',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-iopps-preview', NEXT_PUBLIC_USE_EMULATORS: 'true',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199', TEST_BASE_URL: 'http://127.0.0.1:32145' };
function config(env, dotenv = false) {
  const exports = {};
  const source = readFileSync(path.join(process.env.IOPPS_PLAYWRIGHT_BASELINE || process.cwd(), 'playwright.config.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, process: { env }, URL, __dirname: '/fictional-qa',
    require: name => {
      if (name === '@playwright/test') return { defineConfig: value => value, devices: {} };
      if (name === 'path') return path;
      if (name === 'fs') return { existsSync: () => dotenv, readFileSync: () => '' };
      throw new Error(`Unexpected config dependency: ${name}`);
    },
  });
  return exports.default;
}

test('browser tests cannot silently fall back to production', () => {
  assert.throws(() => config({}), /isolated demo/);
});
test('browser tests reject production, misleading hosts, and credential-bearing URLs', () => {
  for (const url of ['https://iopps.ca', 'http://127.0.0.1.attacker.invalid:3000', 'http://127.0.0.1@attacker.invalid:3000',
    'http://user:pass@127.0.0.1:3000', 'http://127.0.0.1:3000/jobs', 'http://127.0.0.1:3000/?redirect=production']) {
    assert.throws(() => config({ ...demo, TEST_BASE_URL: url }), /loopback QA server/);
  }
});
test('browser tests reject live project IDs and missing emulator transports', () => {
  for (const key of ['GCLOUD_PROJECT', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
    assert.throws(() => config({ ...demo, [key]: 'not-the-demo-fixture' }), /isolated demo/);
  }
});
test('browser tests reject dotenv and credential canaries without revealing their values', () => {
  assert.throws(() => config(demo, true), /Refusing browser QA/);
  for (const key of ['FIREBASE_SERVICE_ACCOUNT_BASE64', 'FIREBASE_PRIVATE_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY']) {
    assert.throws(() => config({ ...demo, [key]: 'fictional-do-not-print-value' }), error =>
      error.message.includes(key) && !error.message.includes('fictional-do-not-print-value'));
  }
});
test('browser tests accept an explicit isolated demo and loopback origin', () => {
  assert.equal(config(demo).use.baseURL, demo.TEST_BASE_URL);
});

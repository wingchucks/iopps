import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const configSource = fs.readFileSync(new URL('../src/lib/firebase/app-check-config.ts', import.meta.url), 'utf8');
const serverSource = fs.readFileSync(new URL('../src/lib/server/app-check.ts', import.meta.url), 'utf8');
function load(env = {}) {
  const calls = [];
  function compile(source, dependencies) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, process: { env }, URL,
      require(id) { if (!(id in dependencies)) throw Error(`Unexpected import ${id}`); return dependencies[id]; },
    });
    return exports;
  }
  const config = compile(configSource, {});
  const helpers = compile(serverSource, {
    '@/lib/firebase/app-check-config': config,
    '@/lib/firebase-admin': { getAdminApp: () => ({}) },
    'firebase-admin/app-check': { getAppCheck: () => ({ verifyToken: async token => { calls.push(token); if (token !== 'valid') throw Error('invalid'); } }) },
  });
  return { ...helpers, calls };
}
const configured = { NODE_ENV: 'production', NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'true', NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: 'fictional' };
const request = (headers = {}, url = 'https://www.iopps.ca/api/test') => new Request(url, { headers: { host: 'www.iopps.ca', ...headers } });
const helpers = ['verifyRequiredAppCheckFromRequest', 'verifyAppCheckFromRequest'];
const demo = {
  ...configured, NEXT_PUBLIC_USE_EMULATORS: 'true', GCLOUD_PROJECT: 'demo-iopps-preview',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-iopps-preview',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
};

test('explicit local development and credential-free demo build retain both exemptions', async () => {
  for (const env of [{ ...configured, NODE_ENV: 'development' }, demo]) {
    for (const name of helpers) {
      const h = load(env);
      assert.equal(await h[name](request({}, 'http://localhost:3000/api/test')), true, `${name}: ${env.NODE_ENV}`);
      assert.deepEqual(h.calls, []);
    }
  }
});

test('production URL alone and unset/test runtime never exempt checks', async () => {
  for (const NODE_ENV of ['production', 'test', undefined]) {
    for (const name of helpers) {
      const h = load({ ...configured, NODE_ENV });
      assert.equal(await h[name](request({ host: 'localhost', 'x-forwarded-host': 'localhost' }, 'http://localhost:3000/api/test')), false);
    }
  }
});

test('incomplete, live, credential-bearing and hosted emulator settings fail closed', async () => {
  const overrides = [
    { NEXT_PUBLIC_USE_EMULATORS: 'false' }, { NEXT_PUBLIC_USE_EMULATORS: undefined },
    { GCLOUD_PROJECT: 'live-project' }, { FIREBASE_PROJECT_ID: 'live-project' },
    { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-other' },
    { FIRESTORE_EMULATOR_HOST: undefined }, { FIREBASE_AUTH_EMULATOR_HOST: 'remote.example:9099' },
    { FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:0' }, { FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:65536' },
    ...['FIREBASE_SERVICE_ACCOUNT_BASE64', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'VERCEL', 'VERCEL_ENV', 'K_SERVICE'].map(key => ({ [key]: 'fictional' })),
  ];
  for (const override of overrides) {
    for (const name of helpers) assert.equal(await load({ ...demo, ...override })[name](request({ host: 'localhost' })), false, `${name}: ${JSON.stringify(override)}`);
  }
  for (const key of ['VERCEL', 'VERCEL_ENV', 'K_SERVICE']) {
    assert.equal(await load({ ...configured, NODE_ENV: 'development', [key]: 'fictional' }).verifyRequiredAppCheckFromRequest(request()), false);
  }
});

test('configured policy retains enabled/site-key semantics while required always verifies', async () => {
  for (const overrides of [{ NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: 'false' }, { NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED: undefined }, { NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: undefined }, { NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: '  ' }]) {
    const h = load({ ...configured, ...overrides });
    assert.equal(await h.verifyAppCheckFromRequest(request()), true);
    assert.equal(await h.verifyRequiredAppCheckFromRequest(request()), false);
    assert.deepEqual(h.calls, []);
  }
  for (const name of helpers) {
    for (const [token, expected] of [['valid', true], ['invalid', false]]) {
      const h = load(configured);
      assert.equal(await h[name](request({ 'X-Firebase-AppCheck': token, 'x-forwarded-host': 'localhost' })), expected);
      assert.deepEqual(h.calls, [token]);
    }
  }
});

test('production required and configured checks reject localhost header spoofing', async () => {
  for (const name of helpers) {
    for (const headers of [{ 'x-forwarded-host': 'localhost' }, { host: 'localhost:3000' }, { 'x-forwarded-host': '127.0.0.1:3000' }]) {
      const h = load(configured);
      assert.equal(await h[name](request(headers)), false, `${name}: ${JSON.stringify(headers)}`);
      assert.deepEqual(h.calls, []);
    }
  }
});

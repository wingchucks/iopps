import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './helpers/security-fixtures.mjs';

// The admin Firestore client prefers REST in production, but an emulator run must keep the
// SDK's default gRPC channel: the REST transport resolves Google Application Default
// Credentials before every request, and CI or isolated QA have none, so every server read
// failed ("Could not load the default credentials") before reaching the emulator.
function loadAdmin(env) {
  const app = { name: 'fictional-app' };
  const calls = [];
  const processEnv = { ...env };
  const admin = sourceModule('src/lib/firebase-admin.ts', {
    globals: { process: { env: processEnv } },
    mocks: {
      'firebase-admin/app': {
        getApps: () => [],
        cert: credential => ({ credential }),
        initializeApp: options => { calls.push(['initializeApp', options.projectId, Boolean(options.credential)]); return app; },
      },
      'firebase-admin/auth': { getAuth: () => ({}) },
      'firebase-admin/firestore': {
        getFirestore: received => { calls.push(['getFirestore', received === app]); return { transport: 'grpc' }; },
        initializeFirestore: (received, settings) => {
          calls.push(['initializeFirestore', received === app, JSON.parse(JSON.stringify(settings))]);
          return { transport: 'rest' };
        },
      },
    },
  });
  return { admin, calls, processEnv };
}

test('emulator runs use the default gRPC channel, which needs no Google credentials', () => {
  for (const env of [
    // scripts/run-isolated-qa.mjs --emulators and the CI emulator jobs.
    { NEXT_PUBLIC_USE_EMULATORS: 'true', GCLOUD_PROJECT: 'demo-iopps-preview', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
    // The emulator flag alone: the admin app fills in the default emulator hosts.
    { NEXT_PUBLIC_USE_EMULATORS: 'true' },
    // Credentials present but the SDK is pointed at an emulator: it never reaches Google.
    { NEXT_PUBLIC_USE_EMULATORS: 'false', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', FIREBASE_PROJECT_ID: 'fictional-project', FIREBASE_CLIENT_EMAIL: 'fictional@example.invalid', FIREBASE_PRIVATE_KEY: 'fictional-key' },
  ]) {
    const { admin, calls, processEnv } = loadAdmin(env);
    assert.equal(admin.getAdminDb().transport, 'grpc', JSON.stringify(env));
    assert.ok(processEnv.FIRESTORE_EMULATOR_HOST);
    assert.deepEqual(calls.filter(([name]) => name !== 'initializeApp'), [['getFirestore', true]]);
  }
});

test('production keeps the REST transport for the shared admin client', () => {
  const { admin, calls } = loadAdmin({ FIREBASE_PROJECT_ID: 'fictional-project', FIREBASE_CLIENT_EMAIL: 'fictional@example.invalid', FIREBASE_PRIVATE_KEY: 'fictional-key' });
  assert.equal(admin.getAdminDb().transport, 'rest');
  assert.deepEqual(calls, [
    ['initializeApp', 'fictional-project', true],
    ['initializeFirestore', true, { preferRest: true }],
  ]);
  // One client per process: later callers reuse it.
  assert.equal(admin.getAdminDb(), admin.adminDb);
  assert.equal(calls.length, 2);
});
